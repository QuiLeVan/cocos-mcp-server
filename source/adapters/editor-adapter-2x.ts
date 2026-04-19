import * as fs from 'fs';
import * as path from 'path';
import { ToolResponse } from '../types';
import { ErrorCodes, engineUnsupported } from '../errors';
import { from3xShape, isCocos2xPrefabSerializedArray, to3xShape } from './prefab-format-2x';
import {
    IEditorAdapter,
    CreateNodeArgs,
    BroadcastDisposer,
    BroadcastHandler,
} from './editor-adapter';

const EXTENSION_PKG = 'cocos-mcp-server';

/** Scene / scene-view IPC op names used by `scene-view-tools` (3.x `Editor.Message` surface). */
const SCENE_VIEW_OPS = new Set([
    'change-gizmo-tool',
    'query-gizmo-tool-name',
    'change-gizmo-pivot',
    'query-gizmo-pivot',
    'query-gizmo-view-mode',
    'change-gizmo-coordinate',
    'query-gizmo-coordinate',
    'change-is2D',
    'query-is2D',
    'set-grid-visible',
    'query-is-grid-visible',
    'set-icon-gizmo-3d',
    'query-is-icon-gizmo-3d',
    'set-icon-gizmo-size',
    'query-icon-gizmo-size',
    'focus-camera',
    'align-with-view',
    'align-with-view-node',
]);

function errMsg(e: unknown): string {
    if (e instanceof Error) {
        return e.message;
    }
    return String(e);
}

function toolErr(e: unknown): ToolResponse {
    return { success: false, error: errMsg(e) };
}

function dbUrlToProjectPath(projectRoot: string, dbUrl: string): string | null {
    if (!dbUrl || typeof dbUrl !== 'string') {
        return null;
    }
    if (dbUrl.startsWith('db://assets/')) {
        return path.join(projectRoot, 'assets', dbUrl.slice('db://assets/'.length));
    }
    if (dbUrl.startsWith('db://')) {
        const rest = dbUrl.slice('db://'.length);
        return path.join(projectRoot, rest);
    }
    return null;
}

function toNodeDump3xStyle(payload: any): any {
    if (!payload || typeof payload !== 'object') {
        return payload;
    }
    return {
        uuid: { value: payload.uuid },
        name: { value: payload.name ?? 'Unknown' },
        active: { value: payload.active !== false },
        position: {
            value: {
                x: payload.x ?? 0,
                y: payload.y ?? 0,
                z: 0,
            },
        },
        rotation: {
            value: {
                x: 0,
                y: 0,
                z: payload.rotation ?? 0,
            },
        },
        scale: {
            value: {
                x: payload.scaleX ?? 1,
                y: payload.scaleY ?? 1,
                z: 1,
            },
        },
        parent: { value: payload.parent ? { uuid: payload.parent } : null },
        children: payload.children || [],
        __comps__: (payload.components || []).map((c: any) => ({
            __type__: c.type,
            enabled: c.enabled !== false,
            ...(c.properties && typeof c.properties === 'object' ? c.properties : {}),
        })),
        layer: { value: 1073741824 },
        mobility: { value: 0 },
    };
}

export class EditorAdapter2x implements IEditorAdapter {
    public readonly engineMajor = 2 as const;

    private cachedSceneRootUuid: string | null = null;

    /**
     * Synthetic clipboard for `copy-node` / `paste-node` on 2.x — the native
     * 2.4.x scene IPCs do not expose a stable copy/paste API, so we snapshot
     * the node info and rebuild on paste by delegating to
     * `duplicateNodeWithChildren`.
     */
    private clipboardNodes: Array<{ uuid: string; info: any }> = [];

    public get projectPath(): string {
        const p = (Editor as any).projectInfo?.path;
        return typeof p === 'string' ? p : '';
    }

    public async getSceneRootUuid(): Promise<string | null> {
        if (this.cachedSceneRootUuid) {
            return this.cachedSceneRootUuid;
        }
        try {
            const root = await this.buildSceneTreeRoot();
            if (root && typeof root.uuid === 'string' && root.uuid.length > 0) {
                this.cachedSceneRootUuid = root.uuid;
                return root.uuid;
            }
        } catch {
            /* fall through */
        }
        const main = this.readCurrentSceneAssetUuidFromMain();
        if (main) {
            this.cachedSceneRootUuid = main;
            return main;
        }
        return null;
    }

    // ─── Callback → Promise helpers ────────────────────────────────────────

    private promisifyMaybe<T>(v: T | Promise<T>): Promise<T> {
        if (v != null && typeof (v as any).then === 'function') {
            return v as Promise<T>;
        }
        return Promise.resolve(v as T);
    }

    private unwrapSceneScriptResult(raw: any): any {
        if (raw && typeof raw === 'object' && 'success' in raw) {
            if (raw.success === false) {
                throw new Error(String(raw.error || 'scene_script_failed'));
            }
            if ('data' in raw) {
                return raw.data;
            }
        }
        return raw;
    }

    private async callScene(method: string, ...sceneArgs: any[]): Promise<any> {
        try {
            const packed = sceneArgs.length ? sceneArgs : [];
            const ret = Editor.Scene.callSceneScript(EXTENSION_PKG, method, packed) as any;
            const settled = await this.promisifyMaybe(ret);
            return this.unwrapSceneScriptResult(settled);
        } catch (e) {
            throw e instanceof Error ? e : new Error(errMsg(e));
        }
    }

    private callAssetDb(method: string, ...args: any[]): Promise<any> {
        const adb: any = (Editor as any).assetdb;
        if (!adb) {
            return Promise.reject(new Error('Editor.assetdb is not available'));
        }

        // Creator 2.x AssetDB uses sync helpers with different names than 3.x `query-*` APIs.
        if (method === 'queryUuidByUrl' && typeof adb.urlToUuid === 'function') {
            return Promise.resolve(adb.urlToUuid(args[0]));
        }
        if (method === 'queryUrlByUuid' && typeof adb.uuidToUrl === 'function') {
            return Promise.resolve(adb.uuidToUrl(args[0]));
        }
        if (method === 'queryPathByUuid' && typeof adb.uuidToFspath === 'function') {
            return Promise.resolve(adb.uuidToFspath(args[0]));
        }
        if (method === 'queryMetaInfoByUuid' && typeof adb.assetInfoByUuid === 'function') {
            return Promise.resolve(adb.assetInfoByUuid(args[0]));
        }

        const fn = adb[method];
        if (typeof fn !== 'function') {
            return Promise.reject(new Error(`assetdb.${method} is not available`));
        }
        return new Promise((resolve, reject) => {
            const cb = (err: any, result?: any) => {
                if (err) {
                    reject(err instanceof Error ? err : new Error(String(err)));
                } else {
                    resolve(result);
                }
            };
            try {
                fn.apply(adb, [...args, cb]);
            } catch (e) {
                reject(e instanceof Error ? e : new Error(String(e)));
            }
        });
    }

    /** Wraps `Editor.Ipc.sendToMain` with a trailing Node-style callback → Promise. */
    private sendToMainIpc(method: string, ...ipcArgs: any[]): Promise<any> {
        return new Promise((resolve, reject) => {
            const cb = (err: any, ...results: any[]) => {
                if (err) {
                    reject(err instanceof Error ? err : new Error(String(err)));
                } else {
                    resolve(results.length <= 1 ? results[0] : results);
                }
            };
            try {
                Editor.Ipc.sendToMain(method, ...ipcArgs, cb);
            } catch (e) {
                reject(e instanceof Error ? e : new Error(String(e)));
            }
        });
    }

    /** Wraps `Editor.Ipc.sendToPanel` with a trailing Node-style callback → Promise. */
    private sendToPanelIpc(panel: string, method: string, ...ipcArgs: any[]): Promise<any> {
        return new Promise((resolve, reject) => {
            const cb = (err: any, ...results: any[]) => {
                if (err) {
                    reject(err instanceof Error ? err : new Error(String(err)));
                } else {
                    resolve(results.length <= 1 ? results[0] : results);
                }
            };
            try {
                const ipc: any = (Editor as any).Ipc;
                if (!ipc || typeof ipc.sendToPanel !== 'function') {
                    reject(new Error('Editor.Ipc.sendToPanel is not available'));
                    return;
                }
                ipc.sendToPanel(panel, method, ...ipcArgs, cb);
            } catch (e) {
                reject(e instanceof Error ? e : new Error(String(e)));
            }
        });
    }

    /**
     * Panel IPC without a trailing callback (same pattern as `scene:new-scene` in
     * Creator 2.4 docs). `scene:stash-and-save` must hit the **scene** panel — using
     * `sendToMain` or a callback here does not reliably flush the open scene / dirty flag.
     */
    private sendToPanelFireAndForget(panel: string, method: string, ...ipcArgs: any[]): void {
        const ipc: any = (Editor as any).Ipc;
        if (!ipc || typeof ipc.sendToPanel !== 'function') {
            throw new Error('Editor.Ipc.sendToPanel is not available');
        }
        ipc.sendToPanel(panel, method, ...ipcArgs);
    }

    /**
     * Creator 2.4.x: `scene:open` is not a valid scene-panel IPC. Main-process
     * `scene:open-by-url` often never invokes its callback. Prefer `_Scene.loadSceneByUuid`
     * in the scene script, then panel `scene:open-by-url` / `scene:open-by-uuid`.
     */
    private async openSceneByDbUrl(url: string): Promise<void> {
        let uuid: string | null = null;
        if (typeof url === 'string' && url.startsWith('db://')) {
            uuid = await this.callAssetDb('queryUuidByUrl', url);
        }
        const errs: string[] = [];

        if (uuid) {
            try {
                await this.callScene('loadSceneByUuid', uuid);
                return;
            } catch (e) {
                errs.push(`sceneScript(loadSceneByUuid): ${errMsg(e)}`);
            }
        }

        try {
            await this.sendToPanelIpc('scene', 'scene:open-by-url', url);
            return;
        } catch (ePanelUrl) {
            errs.push(`panel(scene:open-by-url): ${errMsg(ePanelUrl)}`);
        }

        if (uuid) {
            try {
                await this.sendToPanelIpc('scene', 'scene:open-by-uuid', uuid);
                return;
            } catch (eUuid) {
                errs.push(`panel(scene:open-by-uuid): ${errMsg(eUuid)}`);
            }
        }

        try {
            await this.sendToMainIpc('scene:open-by-url', url);
            return;
        } catch (eMain) {
            errs.push(`main(scene:open-by-url): ${errMsg(eMain)}`);
        }

        throw new Error(`open_scene: ${errs.join('; ')}`);
    }

    private async resolvePrefabUrl(prefabUuidOrPath: string): Promise<string> {
        if (prefabUuidOrPath.startsWith('db://')) {
            return prefabUuidOrPath;
        }
        if (prefabUuidOrPath.includes('/')) {
            return prefabUuidOrPath;
        }
        return this.callAssetDb('queryUrlByUuid', prefabUuidOrPath);
    }

    /**
     * When the scene-runtime root has no `uuid` / `_id` yet, the scene script still
     * returns empty `uuid` → `scene_get_current_scene` fails. Creator 2.x main process
     * usually tracks the open `.fire` asset on `Editor.remote`.
     */
    private readCurrentSceneAssetUuidFromMain(): string {
        const ed: any = Editor as any;
        const asId = (v: unknown): string => {
            if (typeof v === 'string' && v.trim().length > 0) {
                return v.trim();
            }
            if (typeof v === 'number' && Number.isFinite(v)) {
                return String(v);
            }
            return '';
        };

        const remote = ed.remote;
        if (remote) {
            const flat = [
                remote.currentSceneUuid,
                remote.curSceneUuid,
                remote.sceneUuid,
                typeof remote.currentScene === 'string' ? remote.currentScene : null,
            ];
            for (const c of flat) {
                const s = asId(c);
                if (s) {
                    return s;
                }
            }
            const cur = remote.currentScene;
            if (cur && typeof cur === 'object') {
                const s =
                    asId(cur.uuid) || asId(cur.assetUuid) || asId(cur._uuid) || asId(cur._id);
                if (s) {
                    return s;
                }
            }
        }

        for (const c of [ed.currentSceneUuid, ed.openedSceneUuid, ed.curSceneUuid]) {
            const s = asId(c);
            if (s) {
                return s;
            }
        }
        return '';
    }

    /**
     * Creator 2.x often leaves the runtime `cc.Scene` root `name` empty in the editor;
     * the user-visible name matches the `.fire` / `.scene` asset basename instead.
     */
    private async trySceneDisplayNameFromAssetUuid(uuid: string): Promise<string> {
        if (!uuid) {
            return '';
        }
        const fromUrl = async (): Promise<string> => {
            const url = await this.callAssetDb('queryUrlByUuid', uuid);
            if (typeof url !== 'string' || !url) {
                return '';
            }
            const base = path.basename(url);
            const stripped = base.replace(/\.(fire|scene)$/i, '');
            return stripped || base;
        };
        const fromPath = async (): Promise<string> => {
            const fsPath = await this.callAssetDb('queryPathByUuid', uuid);
            if (typeof fsPath !== 'string' || !fsPath) {
                return '';
            }
            const base = path.basename(fsPath);
            const stripped = base.replace(/\.(fire|scene)$/i, '');
            return stripped || base;
        };
        try {
            const n = await fromUrl();
            if (n) {
                return n;
            }
        } catch {
            /* try path */
        }
        try {
            return await fromPath();
        } catch {
            return '';
        }
    }

    private async resolveSceneDisplayName(
        runtimeName: string | undefined,
        treeRootUuid: string,
    ): Promise<string> {
        const trimmed =
            typeof runtimeName === 'string' && runtimeName.trim().length > 0
                ? runtimeName.trim()
                : '';
        if (trimmed) {
            return trimmed;
        }
        const fromTree =
            typeof treeRootUuid === 'string' ? treeRootUuid.trim() : '';
        const fromMain = this.readCurrentSceneAssetUuidFromMain();
        // Prefer main-process UUID first: it tracks the open `.fire` asset. The runtime
        // scene root id from the scene script often does not resolve via `uuidToUrl`.
        const candidates: string[] = [];
        if (fromMain) {
            candidates.push(fromMain);
        }
        if (fromTree && fromTree !== fromMain) {
            candidates.push(fromTree);
        }
        for (const u of candidates) {
            const n = await this.trySceneDisplayNameFromAssetUuid(u);
            if (n) {
                return n;
            }
        }
        return 'Current Scene';
    }

    private async buildSceneTreeRoot(opts?: { includeComponents?: boolean }): Promise<any> {
        let info: any = null;
        let children: any[] = [];
        try {
            info = await this.callScene('queryCurrentSceneInfo');
        } catch {
            info = null;
        }
        try {
            const rawChildren = await this.callScene('queryNodeTree', opts);
            children = Array.isArray(rawChildren) ? rawChildren : [];
        } catch {
            children = [];
        }

        let uuid = typeof info?.uuid === 'string' && info.uuid.length > 0 ? info.uuid : '';
        if (!uuid) {
            uuid = this.readCurrentSceneAssetUuidFromMain();
        }
        const name = await this.resolveSceneDisplayName(info?.name, uuid);
        return {
            uuid,
            name,
            active: true,
            type: 'cc.Scene',
            children,
        };
    }

    private async pasteSnapshots(snapshots: Array<{ uuid: string; info: any }>, targetUuid?: string): Promise<string | string[]> {
        const newUuids: string[] = [];
        for (const snap of snapshots) {
            try {
                const res = await this.callScene('duplicateNodeWithChildren', {
                    uuid: snap.uuid,
                    parentUuid: targetUuid,
                });
                const newUuid = res && typeof res === 'object' && res.uuid ? res.uuid : String(res);
                if (newUuid) {
                    newUuids.push(newUuid);
                }
            } catch (e) {
                throw new Error(`paste-node: ${errMsg(e)}`);
            }
        }
        return newUuids.length === 1 ? newUuids[0] : newUuids;
    }

    private collectUuidReferences(value: any, acc: string[]): void {
        if (!value || typeof value !== 'object') {
            return;
        }
        if (typeof (value as any).__uuid__ === 'string' && (value as any).__uuid__.length > 0) {
            acc.push((value as any).__uuid__);
            return;
        }
        if (Array.isArray(value)) {
            for (const item of value) {
                this.collectUuidReferences(item, acc);
            }
            return;
        }
        for (const k of Object.keys(value)) {
            this.collectUuidReferences((value as any)[k], acc);
        }
    }

    private async scanMissingAssets(): Promise<Array<{ uuid: string }>> {
        // Ask the scene script for the serialized scene (a best-effort walk
        // that may not exist yet — fall through to empty if so).
        let serialized: any = null;
        try {
            serialized = await this.callScene('serializeScene');
        } catch {
            return [];
        }
        const refs: string[] = [];
        this.collectUuidReferences(serialized, refs);
        const missing: Array<{ uuid: string }> = [];
        const seen = new Set<string>();
        for (const uuid of refs) {
            if (seen.has(uuid)) {
                continue;
            }
            seen.add(uuid);
            try {
                const url = await this.callAssetDb('queryUrlByUuid', uuid);
                if (!url || typeof url !== 'string') {
                    missing.push({ uuid });
                }
            } catch {
                missing.push({ uuid });
            }
        }
        return missing;
    }

    // ─── Generic transport ─────────────────────────────────────────────────

    public sendRequest<T = any>(module: string, op: string, ...args: any[]): Promise<T> {
        if (module === 'reference-image') {
            this.throwUnsupported('referenceImage');
        }

        if (module === 'scene' && SCENE_VIEW_OPS.has(op)) {
            this.throwUnsupported('sceneView');
        }

        const fail = (msg: string) => Promise.reject(new Error(msg)) as Promise<T>;

        try {
            if (module === 'scene') {
                return this.dispatchSceneRequest(op, args) as Promise<T>;
            }
            if (module === 'asset-db') {
                return this.dispatchAssetDbRequest(op, args) as Promise<T>;
            }
            if (module === 'preferences') {
                return this.dispatchPreferencesRequest(op, args) as Promise<T>;
            }
            return fail(`unsupported_ipc_module_2x: ${module}/${op}`);
        } catch (e) {
            return fail(errMsg(e));
        }
    }

    public send(moduleName: string, op: string, ...args: any[]): void {
        try {
            Editor.Ipc.sendToMain(`${moduleName}:${op}`, ...args);
        } catch {
            /* fire-and-forget best effort */
        }
    }

    public onBroadcast(event: string, handler: BroadcastHandler): BroadcastDisposer {
        // Cocos 2.4.13 main process: `Editor.Ipc` exposes sendToMain/sendToWins
        // but not `.on` / `.removeListener`. The `Editor` object itself is an
        // EventEmitter, so register there as the real fallback. Guard both to
        // avoid crashing extension load if neither surface is available.
        const ipc: any = (Editor as any).Ipc;
        if (ipc && typeof ipc.on === 'function') {
            ipc.on(event, handler);
            return () => {
                if (typeof ipc.removeListener === 'function') {
                    ipc.removeListener(event, handler);
                }
            };
        }
        const ed: any = Editor as any;
        if (typeof ed.on === 'function') {
            ed.on(event, handler);
            return () => {
                if (typeof ed.removeListener === 'function') {
                    ed.removeListener(event, handler);
                } else if (typeof ed.off === 'function') {
                    ed.off(event, handler);
                }
            };
        }
        return () => { /* no-op: no broadcast surface available on this host */ };
    }

    private async dispatchSceneRequest(op: string, args: any[]): Promise<any> {
        switch (op) {
            case 'query-node-tree':
                return this.buildSceneTreeRoot(args[0]);
            case 'query-current-scene':
                return this.buildSceneTreeRoot();
            case 'open-scene': {
                const id = args[0];
                let url = id;
                if (typeof id === 'string' && !id.startsWith('db://')) {
                    url = await this.callAssetDb('queryUrlByUuid', id);
                }
                await this.openSceneByDbUrl(url);
                this.cachedSceneRootUuid = null;
                return undefined;
            }
            case 'save-scene': {
                // 2.4 IPC reference: scene panel handles save (like `scene:new-scene`).
                this.sendToPanelFireAndForget('scene', 'scene:stash-and-save');
                return undefined;
            }
            case 'save-as-scene':
                throw engineUnsupported('scene.save_scene_as', 2);
            case 'close-scene':
                throw engineUnsupported('scene.close_scene', 2);
            case 'query-hierarchy': {
                // Back debug_get_node_tree + validation callers. Delegate to
                // the scene-tree builder — same payload the tool layer already
                // accepts.
                return this.buildSceneTreeRoot({ includeComponents: true });
            }
            case 'check-missing-assets': {
                // Implemented by serializing the scene via a new scene-script
                // handler and walking `__uuid__` references against asset-db.
                const missing = await this.scanMissingAssets();
                return { missing };
            }
            case 'copy-node': {
                const input = args[0];
                const uuids: string[] = Array.isArray(input)
                    ? input.map((u) => String(u))
                    : typeof input === 'string'
                      ? [input]
                      : input && Array.isArray(input.uuids)
                        ? input.uuids.map((u: unknown) => String(u))
                        : [];
                if (uuids.length === 0) {
                    throw new Error('copy-node: no uuids provided');
                }
                const snapshots: any[] = [];
                for (const u of uuids) {
                    try {
                        const info = await this.callScene('getNodeInfo', { uuid: u });
                        snapshots.push({ uuid: u, info });
                    } catch (e) {
                        throw new Error(`copy-node: ${errMsg(e)}`);
                    }
                }
                this.clipboardNodes = snapshots;
                return uuids.length === 1 ? uuids[0] : uuids;
            }
            case 'paste-node': {
                const payload = args[0] || {};
                const targetUuid = payload.target || payload.parent;
                const snapshots = this.clipboardNodes;
                if (!snapshots || snapshots.length === 0) {
                    // If caller passed explicit uuids, fall back to duplicating those.
                    const explicit: string[] = Array.isArray(payload.uuids)
                        ? payload.uuids
                        : payload.uuids
                          ? [payload.uuids]
                          : [];
                    if (explicit.length === 0) {
                        throw new Error('paste-node: clipboard is empty');
                    }
                    const explicitSnapshots = await Promise.all(
                        explicit.map(async (u) => ({
                            uuid: u,
                            info: await this.callScene('getNodeInfo', { uuid: u }),
                        })),
                    );
                    return this.pasteSnapshots(explicitSnapshots, targetUuid);
                }
                return this.pasteSnapshots(snapshots, targetUuid);
            }
            case 'create-node': {
                const opts = args[0] || {};
                if (opts.assetUuid || opts.assetPath) {
                    let prefabUrl: string;
                    if (opts.assetUuid) {
                        prefabUrl = await this.resolvePrefabUrl(opts.assetUuid);
                    } else {
                        const ap = String(opts.assetPath);
                        prefabUrl = ap.startsWith('db://')
                            ? ap
                            : await this.callAssetDb('queryUrlByUuid', await this.callAssetDb('queryUuidByUrl', ap));
                    }
                    const parentUuid = opts.parent || opts.parentUuid;
                    const data = await this.callScene('instantiatePrefab', {
                        prefabUrl,
                        parentUuid,
                        position: opts.initialTransform?.position,
                    });
                    return data && typeof data === 'object' && data.uuid ? data.uuid : data;
                }
                const payload: any = {
                    name: opts.name || 'New Node',
                    parentUuid: opts.parent || opts.parentUuid,
                };
                if (opts.initialTransform?.position) {
                    payload.position = opts.initialTransform.position;
                }
                const created = await this.callScene('createNode', payload);
                return created && typeof created === 'object' && created.uuid ? created.uuid : created;
            }
            case 'query-node': {
                const uuid = typeof args[0] === 'string' ? args[0] : args[0]?.uuid;
                const sceneRoot = await this.getSceneRootUuid();
                if (uuid && sceneRoot && uuid === sceneRoot) {
                    const raw = await this.callScene('getSceneRootInfo');
                    return toNodeDump3xStyle(raw);
                }
                const raw = await this.callScene('getNodeInfo', { uuid });
                return toNodeDump3xStyle(raw);
            }
            case 'set-property': {
                const arg = args[0] || {};
                const p = String(arg.path || '');
                const val = arg.dump?.value;
                if (p.indexOf('__comps__.') === 0) {
                    const rest = p.replace(/^__comps__\./, '');
                    const dot = rest.indexOf('.');
                    const componentType = dot >= 0 ? rest.slice(0, dot) : rest;
                    const propName = dot >= 0 ? rest.slice(dot + 1) : '';
                    await this.callScene('setComponentProperty', {
                        nodeUuid: arg.uuid,
                        componentType,
                        property: propName,
                        value: val,
                    });
                } else {
                    await this.callScene('setNodeProperty', { uuid: arg.uuid, property: p, value: val });
                }
                return undefined;
            }
            case 'set-parent': {
                const o = args[0] || {};
                const nodeUuid = Array.isArray(o.uuids) ? o.uuids[0] : o.uuids;
                await this.callScene('reparent', {
                    nodeUuid,
                    newParentUuid: o.parent,
                    keepWorldTransform: !!o.keepWorldTransform,
                });
                return undefined;
            }
            case 'remove-node': {
                const u = (args[0] && args[0].uuid) || args[0];
                await this.callScene('deleteNode', { uuid: u });
                return undefined;
            }
            case 'create-component': {
                const o = args[0] || {};
                return this.callScene('addComponent', { nodeUuid: o.uuid, componentType: o.component });
            }
            case 'remove-component': {
                const o = args[0] || {};
                await this.callScene('removeComponent', { nodeUuid: o.uuid, componentType: o.component });
                return undefined;
            }
            case 'execute-scene-script': {
                const payload = args[0] || {};
                if (payload.name && payload.name !== EXTENSION_PKG) {
                    throw engineUnsupported(`debug.execute_script.foreign_package:${payload.name}`, 2);
                }
                const m = payload.method as string;
                const a = Array.isArray(payload.args) ? payload.args : [];
                return this.callScene(m, ...a);
            }
            case 'duplicate-node': {
                const input = args[0];
                const uuid = typeof input === 'string'
                    ? input
                    : input && typeof input === 'object' && input.uuid
                      ? input.uuid
                      : '';
                if (!uuid) {
                    throw new Error('duplicate-node: uuid is required');
                }
                const res = await this.callScene('duplicateNodeWithChildren', { uuid });
                return res;
            }
            case 'snapshot':
                return this.callScene('snapshot');
            case 'snapshot-abort':
                throw new Error('snapshot_abort_not_supported_2x');
            case 'reset-property':
            case 'move-array-element':
            case 'remove-array-element':
            case 'cut-node':
            case 'reset-node':
            case 'reset-component':
            case 'restore-prefab':
            case 'execute-component-method':
            case 'begin-recording':
            case 'end-recording':
            case 'cancel-recording':
            case 'soft-reload':
            case 'query-is-ready':
            case 'query-dirty':
            case 'query-classes':
            case 'query-components':
            case 'query-component-has-script':
            case 'query-nodes-by-asset-uuid':
            case 'load-asset':
                throw engineUnsupported(`scene.${op}`, 2);
            default:
                throw new Error(`unknown_scene_op_2x: scene/${op}`);
        }
    }

    private async dispatchAssetDbRequest(op: string, args: any[]): Promise<any> {
        switch (op) {
            case 'query-assets': {
                const q = args[0];
                const pattern = typeof q === 'string' ? q : q.pattern;
                const type = typeof q === 'string' ? null : q.type ?? null;
                return this.callAssetDb('queryAssets', pattern, type);
            }
            case 'query-uuid':
                return this.callAssetDb('queryUuidByUrl', args[0]);
            case 'query-asset-info': {
                const p = args[0];
                const uuid = await this.callAssetDb('queryUuidByUrl', p);
                const url = await this.callAssetDb('queryUrlByUuid', uuid);
                const fsPath = await this.callAssetDb('queryPathByUuid', uuid);
                const base = path.basename(url || p || '');
                return { uuid, url, path: fsPath, name: base };
            }
            case 'create-asset':
                return this.callAssetDb('create', args[0], args[1]);
            case 'delete-asset':
                return this.callAssetDb('delete', [args[0]]);
            case 'query-asset-meta':
                return this.callAssetDb('queryMetaInfoByUuid', args[0]);
            case 'save-asset-meta': {
                const body = typeof args[1] === 'string' ? args[1] : JSON.stringify(args[1]);
                return this.callAssetDb('saveMeta', args[0], body);
            }
            case 'read-asset': {
                const dbUrl = args[0];
                const fsPath = dbUrlToProjectPath(this.projectPath, dbUrl);
                if (!fsPath || !fs.existsSync(fsPath)) {
                    throw new Error(`read_asset_failed: ${dbUrl}`);
                }
                return fs.readFileSync(fsPath, 'utf8');
            }
            case 'save-asset': {
                const dbUrl = args[0];
                const body = typeof args[1] === 'string' ? args[1] : String(args[1]);
                const fsPath = dbUrlToProjectPath(this.projectPath, dbUrl);
                if (!fsPath) {
                    throw new Error(`save_asset_bad_url: ${dbUrl}`);
                }
                fs.mkdirSync(path.dirname(fsPath), { recursive: true });
                fs.writeFileSync(fsPath, body, 'utf8');
                await this.callAssetDb('refresh', dbUrl.startsWith('db://') ? dbUrl : 'db://assets');
                return { url: dbUrl };
            }
            case 'refresh-asset':
                await this.callAssetDb('refresh', args[0] || 'db://assets');
                return undefined;
            default:
                throw new Error(`unknown_asset_db_op_2x: asset-db/${op}`);
        }
    }

    private async dispatchPreferencesRequest(op: string, args: any[]): Promise<any> {
        if (op === 'open-settings') {
            throw new Error('preferences_open_settings_not_supported_2x');
        }
        if (op === 'query-config') {
            const name = args[0];
            const pathKey = args[1];
            const scope = (args[2] as string) || 'global';
            const profile = this.loadPreferencesProfile(name, scope);
            if (!profile) {
                return null;
            }
            if (pathKey === undefined || pathKey === null || pathKey === '') {
                return typeof profile.data === 'object' ? profile.data : {};
            }
            return typeof profile.get === 'function' ? profile.get(pathKey) : profile.data?.[pathKey];
        }
        if (op === 'set-config') {
            const name = args[0];
            const pathKey = args[1];
            const value = args[2];
            const scope = (args[3] as string) || 'global';
            const profile = this.loadPreferencesProfile(name, scope);
            if (!profile || typeof profile.set !== 'function') {
                return false;
            }
            profile.set(pathKey, value);
            if (typeof profile.save === 'function') {
                await profile.save();
            }
            return true;
        }
        throw new Error(`unknown_preferences_op_2x: preferences/${op}`);
    }

    private loadPreferencesProfile(name: string, scope: string): any {
        const tryScopes =
            scope === 'default' ? ['default', 'local', 'editor'] : scope === 'global' ? ['local', 'editor'] : [scope];
        for (const s of tryScopes) {
            try {
                const p = (Editor.Profile.load as any)(s, name);
                if (p) {
                    return p;
                }
            } catch {
                /* continue */
            }
        }
        return null;
    }

    // ─── Scene ─────────────────────────────────────────────────────────────

    public async openScene(assetPathOrUuid: string): Promise<ToolResponse> {
        try {
            let url = assetPathOrUuid;
            if (typeof assetPathOrUuid === 'string' && !assetPathOrUuid.startsWith('db://')) {
                url = await this.callAssetDb('queryUrlByUuid', assetPathOrUuid);
            }
            await this.openSceneByDbUrl(url);
            return { success: true, message: `Scene opened: ${assetPathOrUuid}` };
        } catch (e) {
            return toolErr(e);
        }
    }

    public async saveScene(): Promise<ToolResponse> {
        try {
            this.sendToPanelFireAndForget('scene', 'scene:stash-and-save');
            return { success: true, message: 'Scene save requested (scene panel stash-and-save)' };
        } catch (e) {
            return toolErr(e);
        }
    }

    public async queryCurrentSceneInfo(): Promise<ToolResponse> {
        try {
            const data = await this.callScene('queryCurrentSceneInfo');
            return { success: true, data };
        } catch (e) {
            return toolErr(e);
        }
    }

    public async queryNodeTree(opts?: { includeComponents?: boolean }): Promise<ToolResponse> {
        try {
            const data = await this.buildSceneTreeRoot(opts);
            return { success: true, data };
        } catch (e) {
            return toolErr(e);
        }
    }

    // ─── Node ──────────────────────────────────────────────────────────────

    public async createNode(args: CreateNodeArgs): Promise<ToolResponse> {
        try {
            if (args.assetUuid || args.assetPath) {
                const tr = await this.instantiatePrefab(String(args.assetUuid || args.assetPath), args.parent as string);
                if (!tr.success) {
                    return tr;
                }
                const uuid = (tr.data as any)?.uuid ?? tr.data;
                return { success: true, data: uuid };
            }
            const payload: any = {
                name: args.name || 'New Node',
                parentUuid: (args.parent as string) || undefined,
            };
            const data = await this.callScene('createNode', payload);
            return { success: true, data };
        } catch (e) {
            return toolErr(e);
        }
    }

    public async queryNode(uuid: string): Promise<ToolResponse> {
        try {
            const raw = await this.callScene('getNodeInfo', { uuid });
            return { success: true, data: raw };
        } catch (e) {
            return toolErr(e);
        }
    }

    public async setNodeProperty(uuid: string, property: string, value: unknown): Promise<ToolResponse> {
        try {
            await this.callScene('setNodeProperty', { uuid, property, value });
            return { success: true };
        } catch (e) {
            return toolErr(e);
        }
    }

    public async setParent(nodeUuid: string, newParentUuid: string, keepWorldTransform: boolean): Promise<ToolResponse> {
        try {
            await this.callScene('reparent', { nodeUuid, newParentUuid, keepWorldTransform });
            return { success: true };
        } catch (e) {
            return toolErr(e);
        }
    }

    public async deleteNode(uuid: string): Promise<ToolResponse> {
        try {
            await this.callScene('deleteNode', { uuid });
            return { success: true };
        } catch (e) {
            return toolErr(e);
        }
    }

    // ─── Component ─────────────────────────────────────────────────────────

    public async addComponent(nodeUuid: string, componentType: string): Promise<ToolResponse> {
        try {
            const data = await this.callScene('addComponent', { nodeUuid, componentType });
            return { success: true, data };
        } catch (e) {
            return toolErr(e);
        }
    }

    public async removeComponent(nodeUuid: string, componentType: string): Promise<ToolResponse> {
        try {
            await this.callScene('removeComponent', { nodeUuid, componentType });
            return { success: true };
        } catch (e) {
            return toolErr(e);
        }
    }

    public async setComponentProperty(
        nodeUuid: string,
        componentType: string,
        property: string,
        value: unknown,
    ): Promise<ToolResponse> {
        try {
            await this.callScene('setComponentProperty', { nodeUuid, componentType, property, value });
            return { success: true };
        } catch (e) {
            return toolErr(e);
        }
    }

    // ─── Prefab ────────────────────────────────────────────────────────────

    public async readPrefab(assetPath: string): Promise<ToolResponse> {
        try {
            let dbUrl = assetPath;
            if (assetPath && !assetPath.startsWith('db://') && !assetPath.includes('/')) {
                dbUrl = await this.callAssetDb('queryUrlByUuid', assetPath);
            }
            const fsPath = dbUrlToProjectPath(this.projectPath, dbUrl);
            if (!fsPath || !fs.existsSync(fsPath)) {
                return { success: false, error: `Prefab file not found for ${assetPath}` };
            }
            const content = fs.readFileSync(fsPath, 'utf8');
            let parsed: unknown;
            try {
                parsed = JSON.parse(content);
            } catch {
                parsed = content;
            }
            if (typeof parsed === 'object' && parsed !== null && isCocos2xPrefabSerializedArray(parsed)) {
                const { data, warnings } = to3xShape(parsed);
                const w = warnings.length ? warnings.join('; ') : undefined;
                return {
                    success: true,
                    data: JSON.stringify(data, null, 2),
                    warning: w,
                    instruction: 'experimental_prefab_bridge',
                };
            }
            return { success: true, data: typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2) };
        } catch (e) {
            return toolErr(e);
        }
    }

    public async writePrefab(assetPath: string, content: unknown): Promise<ToolResponse> {
        try {
            let envelope: unknown;
            if (typeof content === 'string') {
                try {
                    envelope = JSON.parse(content);
                } catch (e) {
                    return { success: false, error: `writePrefab: invalid JSON: ${errMsg(e)}` };
                }
            } else {
                envelope = content;
            }
            if (!envelope || typeof envelope !== 'object') {
                return { success: false, error: 'writePrefab: expected JSON object or string' };
            }
            let dryRun = false;
            let body: unknown = envelope;
            if (!Array.isArray(envelope) && typeof (envelope as any).__mcpDryRun === 'boolean') {
                dryRun = (envelope as any).__mcpDryRun === true;
                const rest = { ...(envelope as Record<string, unknown>) };
                delete rest.__mcpDryRun;
                if (rest.prefab !== undefined) {
                    body = rest.prefab;
                } else if (rest.payload !== undefined) {
                    body = rest.payload;
                } else {
                    body = rest;
                }
            }
            const { data: records, warnings, dryRunRecords } = from3xShape(body, { dryRun });
            const blocked = warnings.some((w) => w.startsWith('blocked_unsupported_component_types'));
            if (blocked) {
                return {
                    success: false,
                    error: ErrorCodes.PREFAB_CONVERSION_BLOCKED,
                    instruction: warnings.join('; '),
                };
            }
            if (!Array.isArray(records) || records.length === 0) {
                return {
                    success: false,
                    error: ErrorCodes.PREFAB_WRITE_REQUIRES_TRANSLATOR,
                    instruction: warnings.length ? warnings.join('; ') : undefined,
                };
            }
            if (dryRun) {
                const preview = dryRunRecords ?? records;
                return {
                    success: true,
                    message: 'dry-run: no file written',
                    data: JSON.stringify(preview, null, 2),
                    warning: warnings.length ? warnings.join('; ') : undefined,
                    instruction: 'experimental_prefab_bridge_dry_run',
                };
            }
            let dbUrl = assetPath;
            if (assetPath && !assetPath.startsWith('db://') && !assetPath.includes('/')) {
                dbUrl = await this.callAssetDb('queryUrlByUuid', assetPath);
            }
            const fsPath = dbUrlToProjectPath(this.projectPath, dbUrl);
            if (!fsPath) {
                return { success: false, error: `writePrefab: could not resolve path for ${assetPath}` };
            }
            const dir = path.dirname(fsPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(fsPath, JSON.stringify(records, null, 2), 'utf8');
            await this.callAssetDb('refresh', dbUrl.startsWith('db://') ? path.posix.dirname(dbUrl) : 'db://assets');
            const w = warnings.length ? warnings.join('; ') : undefined;
            return {
                success: true,
                message: `Wrote prefab (${records.length} serialized records)`,
                warning: w,
                instruction: 'experimental_prefab_bridge',
            };
        } catch (e) {
            return toolErr(e);
        }
    }

    public async instantiatePrefab(prefabUuidOrPath: string, parentUuid?: string): Promise<ToolResponse> {
        try {
            const prefabUrl = await this.resolvePrefabUrl(prefabUuidOrPath);
            const data = await this.callScene('instantiatePrefab', { prefabUrl, parentUuid });
            return { success: true, data };
        } catch (e) {
            return toolErr(e);
        }
    }

    // ─── Asset DB ──────────────────────────────────────────────────────────

    public async queryAssets(pattern: string, type?: string): Promise<ToolResponse> {
        try {
            const data = await this.callAssetDb('queryAssets', pattern, type ?? null);
            return { success: true, data };
        } catch (e) {
            return toolErr(e);
        }
    }

    public async createAsset(p: string, content: string | Buffer): Promise<ToolResponse> {
        try {
            const data = await this.callAssetDb('create', p, content);
            return { success: true, data };
        } catch (e) {
            return toolErr(e);
        }
    }

    public async deleteAsset(p: string): Promise<ToolResponse> {
        try {
            const data = await this.callAssetDb('delete', [p]);
            return { success: true, data };
        } catch (e) {
            return toolErr(e);
        }
    }

    public async queryAssetMeta(uuid: string): Promise<ToolResponse> {
        try {
            const data = await this.callAssetDb('queryMetaInfoByUuid', uuid);
            return { success: true, data };
        } catch (e) {
            return toolErr(e);
        }
    }

    public async saveAssetMeta(uuid: string, meta: unknown): Promise<ToolResponse> {
        try {
            const body = typeof meta === 'string' ? meta : JSON.stringify(meta);
            const data = await this.callAssetDb('saveMeta', uuid, body);
            return { success: true, data };
        } catch (e) {
            return toolErr(e);
        }
    }

    // ─── Preferences ─────────────────────────────────────────────────────────

    public async getPreference(key: string): Promise<unknown> {
        const profile = (Editor.Profile.load as any)('local', 'mcp-server') || (Editor.Profile.load as any)('editor', 'mcp-server');
        if (profile && typeof profile.get === 'function') {
            return profile.get(key);
        }
        return undefined;
    }

    public async setPreference(key: string, value: unknown): Promise<void> {
        const profile = (Editor.Profile.load as any)('local', 'mcp-server') || (Editor.Profile.load as any)('editor', 'mcp-server');
        if (profile && typeof profile.set === 'function') {
            profile.set(key, value);
            if (typeof profile.save === 'function') {
                await profile.save();
            }
        }
    }

    public async refreshAssets(p?: string): Promise<ToolResponse> {
        try {
            await this.callAssetDb('refresh', p || 'db://assets');
            return { success: true, message: `Refreshed ${p || 'db://assets'}` };
        } catch (e) {
            return toolErr(e);
        }
    }

    public throwUnsupported(feature: string): never {
        throw engineUnsupported(feature, 2);
    }
}

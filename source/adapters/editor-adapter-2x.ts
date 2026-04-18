import * as fs from 'fs';
import * as path from 'path';
import { ToolResponse } from '../types';
import { ErrorCodes, engineUnsupported } from '../errors';
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

    public get projectPath(): string {
        const p = (Editor as any).projectInfo?.path;
        return typeof p === 'string' ? p : '';
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
        const fn = adb && adb[method];
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

    private async resolvePrefabUrl(prefabUuidOrPath: string): Promise<string> {
        if (prefabUuidOrPath.startsWith('db://')) {
            return prefabUuidOrPath;
        }
        if (prefabUuidOrPath.includes('/')) {
            return prefabUuidOrPath;
        }
        return this.callAssetDb('queryUrlByUuid', prefabUuidOrPath);
    }

    private async buildSceneTreeRoot(opts?: { includeComponents?: boolean }): Promise<any> {
        const info = await this.callScene('queryCurrentSceneInfo');
        const children = await this.callScene('queryNodeTree', opts);
        return {
            uuid: info.uuid,
            name: info.name,
            active: true,
            type: 'cc.Scene',
            children: Array.isArray(children) ? children : [],
        };
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
        Editor.Ipc.on(event, handler);
        return () => {
            Editor.Ipc.removeListener(event, handler);
        };
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
                await this.sendToMainIpc('scene:open-by-url', url);
                return undefined;
            }
            case 'save-scene':
                await this.sendToMainIpc('scene:stash-and-save');
                return undefined;
            case 'save-as-scene':
            case 'close-scene':
                throw new Error(`unsupported_scene_op_2x: scene/${op}`);
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
                    throw new Error(`execute_scene_script_foreign_package_2x: ${payload.name}`);
                }
                const m = payload.method as string;
                const a = Array.isArray(payload.args) ? payload.args : [];
                return this.callScene(m, ...a);
            }
            case 'snapshot':
                return this.callScene('snapshot');
            case 'snapshot-abort':
                throw new Error('snapshot_abort_not_supported_2x');
            case 'reset-property':
            case 'move-array-element':
            case 'remove-array-element':
            case 'copy-node':
            case 'paste-node':
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
                throw new Error(`unsupported_scene_op_2x: scene/${op}`);
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
            await this.sendToMainIpc('scene:open-by-url', url);
            return { success: true, message: `Scene opened: ${assetPathOrUuid}` };
        } catch (e) {
            return toolErr(e);
        }
    }

    public async saveScene(): Promise<ToolResponse> {
        try {
            await this.sendToMainIpc('scene:stash-and-save');
            return { success: true, message: 'Scene saved successfully' };
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
            return { success: true, data: parsed };
        } catch (e) {
            return toolErr(e);
        }
    }

    public async writePrefab(_path: string, _content: unknown): Promise<ToolResponse> {
        return {
            success: false,
            error: ErrorCodes.PREFAB_WRITE_REQUIRES_TRANSLATOR,
        };
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

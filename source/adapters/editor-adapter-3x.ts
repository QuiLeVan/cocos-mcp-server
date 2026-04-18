import { ToolResponse } from '../types';
import { IEditorAdapter, CreateNodeArgs, BroadcastDisposer, BroadcastHandler } from './editor-adapter';
import { EngineUnsupportedError } from '../errors';

export class EditorAdapter3x implements IEditorAdapter {
    public readonly engineMajor = 3 as const;

    public get projectPath(): string {
        return Editor.Project.path;
    }

    // ─── Generic transport ─────────────────────────────────────────────────
    public sendRequest<T = any>(module: string, op: string, ...args: any[]): Promise<T> {
        return (Editor.Message.request as any)(module, op, ...args) as Promise<T>;
    }

    public send(module: string, op: string, ...args: any[]): void {
        (Editor.Message.send as any)(module, op, ...args);
    }

    public onBroadcast(event: string, handler: BroadcastHandler): BroadcastDisposer {
        const add = (Editor.Message as any).addBroadcastListener;
        const remove = (Editor.Message as any).removeBroadcastListener;
        if (typeof add === 'function') {
            add(event, handler);
            return () => {
                if (typeof remove === 'function') {
                    remove(event, handler);
                }
            };
        }
        return () => { /* no-op */ };
    }

    // ─── Scene (plan §3.1) ─────────────────────────────────────────────────
    public openScene(assetPathOrUuid: string): Promise<ToolResponse> {
        return this.sendRequest<void>('scene', 'open-scene', assetPathOrUuid)
            .then(() => ({ success: true, message: `Scene opened: ${assetPathOrUuid}` }))
            .catch((err: Error) => ({ success: false, error: err.message }));
    }

    public saveScene(): Promise<ToolResponse> {
        return this.sendRequest<void>('scene', 'save-scene')
            .then(() => ({ success: true, message: 'Scene saved successfully' }))
            .catch((err: Error) => ({ success: false, error: err.message }));
    }

    public queryCurrentSceneInfo(): Promise<ToolResponse> {
        return this.sendRequest<any>('scene', 'query-current-scene')
            .then((data: any) => ({ success: true, data }))
            .catch((err: Error) => ({ success: false, error: err.message }));
    }

    public queryNodeTree(_opts?: { includeComponents?: boolean }): Promise<ToolResponse> {
        return this.sendRequest<any>('scene', 'query-node-tree')
            .then((data: any) => ({ success: true, data }))
            .catch((err: Error) => ({ success: false, error: err.message }));
    }

    // ─── Node (plan §3.1) ──────────────────────────────────────────────────
    public createNode(args: CreateNodeArgs): Promise<ToolResponse> {
        return this.sendRequest<string | string[]>('scene', 'create-node', args)
            .then((data) => ({ success: true, data }))
            .catch((err: Error) => ({ success: false, error: err.message }));
    }

    public queryNode(uuid: string): Promise<ToolResponse> {
        return this.sendRequest<any>('scene', 'query-node', uuid)
            .then((data: any) => ({ success: true, data }))
            .catch((err: Error) => ({ success: false, error: err.message }));
    }

    public setNodeProperty(uuid: string, property: string, value: unknown): Promise<ToolResponse> {
        return this.sendRequest<void>('scene', 'set-property', { uuid, path: property, dump: { value } })
            .then(() => ({ success: true }))
            .catch((err: Error) => ({ success: false, error: err.message }));
    }

    public setParent(nodeUuid: string, newParentUuid: string, keepWorldTransform: boolean): Promise<ToolResponse> {
        return this.sendRequest<void>('scene', 'set-parent', {
            parent: newParentUuid,
            uuids: [nodeUuid],
            keepWorldTransform,
        })
            .then(() => ({ success: true }))
            .catch((err: Error) => ({ success: false, error: err.message }));
    }

    public deleteNode(uuid: string): Promise<ToolResponse> {
        return this.sendRequest<void>('scene', 'remove-node', { uuid })
            .then(() => ({ success: true }))
            .catch((err: Error) => ({ success: false, error: err.message }));
    }

    // ─── Component (plan §3.1) ─────────────────────────────────────────────
    public addComponent(nodeUuid: string, componentType: string): Promise<ToolResponse> {
        return this.sendRequest<any>('scene', 'create-component', { uuid: nodeUuid, component: componentType })
            .then((data: any) => ({ success: true, data }))
            .catch((err: Error) => ({ success: false, error: err.message }));
    }

    public removeComponent(nodeUuid: string, componentType: string): Promise<ToolResponse> {
        return this.sendRequest<void>('scene', 'remove-component', { uuid: nodeUuid, component: componentType })
            .then(() => ({ success: true }))
            .catch((err: Error) => ({ success: false, error: err.message }));
    }

    public setComponentProperty(
        nodeUuid: string,
        componentType: string,
        property: string,
        value: unknown,
    ): Promise<ToolResponse> {
        return this.sendRequest<void>('scene', 'set-property', {
            uuid: nodeUuid,
            path: `__comps__.${componentType}.${property}`,
            dump: { value },
        })
            .then(() => ({ success: true }))
            .catch((err: Error) => ({ success: false, error: err.message }));
    }

    // ─── Prefab (plan §3.1) ────────────────────────────────────────────────
    public readPrefab(path: string): Promise<ToolResponse> {
        return this.sendRequest<string>('asset-db', 'read-asset', path)
            .then((content: string) => ({ success: true, data: content }))
            .catch((err: Error) => ({ success: false, error: err.message }));
    }

    public writePrefab(path: string, content: unknown): Promise<ToolResponse> {
        const body = typeof content === 'string' ? content : JSON.stringify(content);
        return this.sendRequest<any>('asset-db', 'save-asset', path, body)
            .then((data: any) => ({ success: true, data }))
            .catch((err: Error) => ({ success: false, error: err.message }));
    }

    public instantiatePrefab(prefabUuidOrPath: string, parentUuid?: string): Promise<ToolResponse> {
        const options: any = { assetUuid: prefabUuidOrPath };
        if (parentUuid) options.parent = parentUuid;
        return this.sendRequest<string | string[]>('scene', 'create-node', options)
            .then((data) => ({ success: true, data }))
            .catch((err: Error) => ({ success: false, error: err.message }));
    }

    // ─── Asset DB (plan §3.1) ──────────────────────────────────────────────
    public queryAssets(pattern: string, type?: string): Promise<ToolResponse> {
        const opts: any = { pattern };
        if (type) opts.type = type;
        return this.sendRequest<any[]>('asset-db', 'query-assets', opts)
            .then((data: any[]) => ({ success: true, data }))
            .catch((err: Error) => ({ success: false, error: err.message }));
    }

    public createAsset(path: string, content: string | Buffer): Promise<ToolResponse> {
        return this.sendRequest<any>('asset-db', 'create-asset', path, content)
            .then((data: any) => ({ success: true, data }))
            .catch((err: Error) => ({ success: false, error: err.message }));
    }

    public deleteAsset(path: string): Promise<ToolResponse> {
        return this.sendRequest<any>('asset-db', 'delete-asset', path)
            .then((data: any) => ({ success: true, data }))
            .catch((err: Error) => ({ success: false, error: err.message }));
    }

    public queryAssetMeta(uuid: string): Promise<ToolResponse> {
        return this.sendRequest<any>('asset-db', 'query-asset-meta', uuid)
            .then((data: any) => ({ success: true, data }))
            .catch((err: Error) => ({ success: false, error: err.message }));
    }

    public saveAssetMeta(uuid: string, meta: unknown): Promise<ToolResponse> {
        const body = typeof meta === 'string' ? meta : JSON.stringify(meta);
        return this.sendRequest<any>('asset-db', 'save-asset-meta', uuid, body)
            .then((data: any) => ({ success: true, data }))
            .catch((err: Error) => ({ success: false, error: err.message }));
    }

    // ─── Preferences (plan §3.1) ───────────────────────────────────────────
    public getPreference(key: string): Promise<unknown> {
        return this.sendRequest<unknown>('preferences', 'query-config', key);
    }

    public setPreference(key: string, value: unknown): Promise<void> {
        return this.sendRequest<void>('preferences', 'set-config', key, '', value);
    }

    // ─── Refresh ───────────────────────────────────────────────────────────
    public refreshAssets(path?: string): Promise<ToolResponse> {
        const target = path ?? 'db://assets';
        return this.sendRequest<void>('asset-db', 'refresh-asset', target)
            .then(() => ({ success: true, message: `Refreshed ${target}` }))
            .catch((err: Error) => ({ success: false, error: err.message }));
    }

    // ─── Sentinel ──────────────────────────────────────────────────────────
    public throwUnsupported(feature: string): never {
        throw new EngineUnsupportedError(feature, this.engineMajor);
    }
}

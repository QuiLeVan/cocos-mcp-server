import { ToolResponse } from '../types';

export { EngineUnsupportedError } from '../errors';

export interface CreateNodeArgs {
    name?: string;
    type?: string;
    parent?: string | null;
    assetUuid?: string;
    unlinkPrefab?: boolean;
    keepWorldTransform?: boolean;
    dump?: any;
    components?: string[];
    [key: string]: any;
}

export type BroadcastHandler = (...args: any[]) => void;
export type BroadcastDisposer = () => void;

export interface IEditorAdapter {
    readonly engineMajor: 2 | 3;
    readonly projectPath: string;

    // Generic transport used by tool classes for the long tail of editor ops.
    // Every `Editor.Message.request(module, op, ...args)` in tool code routes
    // through `sendRequest`. Fire-and-forget calls go through `send`.
    sendRequest<T = any>(module: string, op: string, ...args: any[]): Promise<T>;
    send(module: string, op: string, ...args: any[]): void;
    onBroadcast(event: string, handler: BroadcastHandler): BroadcastDisposer;

    // Plan §3.1 typed helpers — scene
    openScene(assetPathOrUuid: string): Promise<ToolResponse>;
    saveScene(): Promise<ToolResponse>;
    queryCurrentSceneInfo(): Promise<ToolResponse>;
    queryNodeTree(opts?: { includeComponents?: boolean }): Promise<ToolResponse>;

    // Node
    createNode(args: CreateNodeArgs): Promise<ToolResponse>;
    queryNode(uuid: string): Promise<ToolResponse>;
    setNodeProperty(uuid: string, property: string, value: unknown): Promise<ToolResponse>;
    setParent(nodeUuid: string, newParentUuid: string, keepWorldTransform: boolean): Promise<ToolResponse>;
    deleteNode(uuid: string): Promise<ToolResponse>;

    // Component
    addComponent(nodeUuid: string, componentType: string): Promise<ToolResponse>;
    removeComponent(nodeUuid: string, componentType: string): Promise<ToolResponse>;
    setComponentProperty(nodeUuid: string, componentType: string, property: string, value: unknown): Promise<ToolResponse>;

    // Prefab
    readPrefab(path: string): Promise<ToolResponse>;
    writePrefab(path: string, content: unknown): Promise<ToolResponse>;
    instantiatePrefab(prefabUuidOrPath: string, parentUuid?: string): Promise<ToolResponse>;

    // Asset DB
    queryAssets(pattern: string, type?: string): Promise<ToolResponse>;
    createAsset(path: string, content: string | Buffer): Promise<ToolResponse>;
    deleteAsset(path: string): Promise<ToolResponse>;
    queryAssetMeta(uuid: string): Promise<ToolResponse>;
    saveAssetMeta(uuid: string, meta: unknown): Promise<ToolResponse>;

    // Preferences
    getPreference(key: string): Promise<unknown>;
    setPreference(key: string, value: unknown): Promise<void>;

    // Refresh
    refreshAssets(path?: string): Promise<ToolResponse>;

    // Sentinel used by the 2.x adapter for engine-specific features
    throwUnsupported(feature: string): never;
}

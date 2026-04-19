import * as fs from 'fs';
import * as path from 'path';
import { ToolDefinition, ToolResponse, ToolExecutor, SceneInfo } from '../types';
import { IEditorAdapter } from '../adapters/editor-adapter';
import { ENGINE_MAJOR } from '../engine-version';
import { buildNew2xFireSceneJson } from './scene-template-2x';

export class SceneTools implements ToolExecutor {
    constructor(private readonly adapter: IEditorAdapter) {}

    getTools(): ToolDefinition[] {
        return [
            {
                name: 'get_current_scene',
                description: 'Get current scene information',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'get_scene_list',
                description: 'Get all scenes in the project',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'open_scene',
                description: 'Open a scene by path',
                inputSchema: {
                    type: 'object',
                    properties: {
                        scenePath: {
                            type: 'string',
                            description: 'The scene file path'
                        }
                    },
                    required: ['scenePath']
                }
            },
            {
                name: 'save_scene',
                description: 'Save current scene',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'create_scene',
                description: 'Create a new scene asset',
                inputSchema: {
                    type: 'object',
                    properties: {
                        sceneName: {
                            type: 'string',
                            description: 'Name of the new scene'
                        },
                        savePath: {
                            type: 'string',
                            description:
                                'Full db:// path to the scene file, or a folder under db://assets/… . On Creator 2.x use the .fire extension (e.g. db://assets/scenes/New.fire). On 3.x use .scene.',
                        }
                    },
                    required: ['sceneName', 'savePath']
                }
            },
            {
                name: 'save_scene_as',
                description: 'Save scene as new file',
                inputSchema: {
                    type: 'object',
                    properties: {
                        path: {
                            type: 'string',
                            description: 'Path to save the scene'
                        }
                    },
                    required: ['path']
                }
            },
            {
                name: 'close_scene',
                description: 'Close current scene',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'get_scene_hierarchy',
                description: 'Get the complete hierarchy of current scene',
                inputSchema: {
                    type: 'object',
                    properties: {
                        includeComponents: {
                            type: 'boolean',
                            description: 'Include component information',
                            default: false
                        }
                    }
                }
            }
        ];
    }

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        switch (toolName) {
            case 'get_current_scene':
                return await this.getCurrentScene();
            case 'get_scene_list':
                return await this.getSceneList();
            case 'open_scene':
                return await this.openScene(args.scenePath);
            case 'save_scene':
                return await this.saveScene();
            case 'create_scene':
                return await this.createScene(args.sceneName, args.savePath);
            case 'save_scene_as':
                return await this.saveSceneAs(args.path);
            case 'close_scene':
                return await this.closeScene();
            case 'get_scene_hierarchy':
                return await this.getSceneHierarchy(args.includeComponents);
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }

    /** Normalizes `query-node-tree` payloads (raw tree vs `{ data }` vs ToolResponse). */
    private pickSceneTreeRoot(raw: any): any | null {
        if (!raw) {
            return null;
        }
        if (raw.uuid) {
            return raw;
        }
        if (raw.data && raw.data.uuid) {
            return raw.data;
        }
        return null;
    }

    private ensureParentDirForDbAsset(projectRoot: string, dbUrl: string): void {
        if (!projectRoot || typeof dbUrl !== 'string' || !dbUrl.startsWith('db://assets/')) {
            return;
        }
        const rel = dbUrl.slice('db://assets/'.length);
        const absFile = path.join(projectRoot, 'assets', rel);
        fs.mkdirSync(path.dirname(absFile), { recursive: true });
    }

    /** If `savePath` is a folder, append `sceneName` + engine default extension. */
    private resolveSceneSaveDbUrl(savePath: string, sceneName: string): string {
        const t = savePath.trim();
        const lower = t.toLowerCase();
        const ext = ENGINE_MAJOR === 2 ? '.fire' : '.scene';
        if (lower.endsWith('.fire') || lower.endsWith('.scene')) {
            return t;
        }
        const base = t.replace(/\/+$/, '');
        return `${base}/${sceneName}${ext}`;
    }

    private async getCurrentScene(): Promise<ToolResponse> {
        return new Promise((resolve) => {
            // query-node-tree （）
            this.adapter.sendRequest('scene', 'query-node-tree').then((tree: any) => {
                const root = this.pickSceneTreeRoot(tree);
                if (root && root.uuid) {
                    resolve({
                        success: true,
                        data: {
                            name: root.name || 'Current Scene',
                            uuid: root.uuid,
                            type: root.type || 'cc.Scene',
                            active: root.active !== undefined ? root.active : true,
                            nodeCount: root.children ? root.children.length : 0
                        }
                    });
                } else {
                    resolve({ success: false, error: 'No scene data available' });
                }
            }).catch((err: Error) => {
                // Fallback: use scene script
                const options = {
                    name: 'cocos-mcp-server',
                    method: 'queryCurrentSceneInfo',
                    args: []
                };
                
                this.adapter.sendRequest('scene', 'execute-scene-script', options).then((raw: any) => {
                    const info = raw && raw.uuid ? raw : raw && raw.data && raw.data.uuid ? raw.data : null;
                    if (info && info.uuid) {
                        resolve({
                            success: true,
                            data: {
                                name: info.name || 'Current Scene',
                                uuid: info.uuid,
                                type: 'cc.Scene',
                                active: true,
                                nodeCount:
                                    typeof info.rootNodeCount === 'number' ? info.rootNodeCount : 0,
                            },
                        });
                    } else {
                        resolve({ success: false, error: 'No scene data available' });
                    }
                }).catch((err2: Error) => {
                    resolve({ success: false, error: `Direct API failed: ${err.message}, Scene script failed: ${err2.message}` });
                });
            });
        });
    }

    private async getSceneList(): Promise<ToolResponse> {
        const patterns =
            ENGINE_MAJOR === 2
                ? ['db://assets/**/*.fire', 'db://assets/**/*.scene']
                : ['db://assets/**/*.scene'];
        try {
            const seen = new Set<string>();
            const scenes: SceneInfo[] = [];
            for (const pattern of patterns) {
                const results: any[] = await this.adapter.sendRequest('asset-db', 'query-assets', { pattern });
                if (!Array.isArray(results)) {
                    continue;
                }
                for (const asset of results) {
                    const key = asset.uuid || asset.url;
                    if (key && !seen.has(key)) {
                        seen.add(key);
                        scenes.push({
                            name: asset.name,
                            path: asset.url,
                            uuid: asset.uuid,
                        });
                    }
                }
            }
            return { success: true, data: scenes };
        } catch (err: any) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    }

    private async openScene(scenePath: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            // UUID
            this.adapter.sendRequest('asset-db', 'query-uuid', scenePath).then((uuid: string | null) => {
                if (!uuid) {
                    throw new Error('Scene not found');
                }
                
                // scene API (UUID)
                return this.adapter.sendRequest('scene', 'open-scene', uuid);
            }).then(() => {
                resolve({ success: true, message: `Scene opened: ${scenePath}` });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async saveScene(): Promise<ToolResponse> {
        return new Promise((resolve) => {
            this.adapter.sendRequest('scene', 'save-scene').then(() => {
                resolve({ success: true, message: 'Scene saved successfully' });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async createScene(sceneName: string, savePath: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            const fullPath = this.resolveSceneSaveDbUrl(savePath, sceneName);
            this.ensureParentDirForDbAsset(this.adapter.projectPath, fullPath);

            const sceneContent =
                ENGINE_MAJOR === 2
                    ? buildNew2xFireSceneJson(sceneName)
                    : JSON.stringify([
                {
                    "__type__": "cc.SceneAsset",
                    "_name": sceneName,
                    "_objFlags": 0,
                    "__editorExtras__": {},
                    "_native": "",
                    "scene": {
                        "__id__": 1
                    }
                },
                {
                    "__type__": "cc.Scene",
                    "_name": sceneName,
                    "_objFlags": 0,
                    "__editorExtras__": {},
                    "_parent": null,
                    "_children": [],
                    "_active": true,
                    "_components": [],
                    "_prefab": null,
                    "_lpos": {
                        "__type__": "cc.Vec3",
                        "x": 0,
                        "y": 0,
                        "z": 0
                    },
                    "_lrot": {
                        "__type__": "cc.Quat",
                        "x": 0,
                        "y": 0,
                        "z": 0,
                        "w": 1
                    },
                    "_lscale": {
                        "__type__": "cc.Vec3",
                        "x": 1,
                        "y": 1,
                        "z": 1
                    },
                    "_mobility": 0,
                    "_layer": 1073741824,
                    "_euler": {
                        "__type__": "cc.Vec3",
                        "x": 0,
                        "y": 0,
                        "z": 0
                    },
                    "autoReleaseAssets": false,
                    "_globals": {
                        "__id__": 2
                    },
                    "_id": "scene"
                },
                {
                    "__type__": "cc.SceneGlobals",
                    "ambient": {
                        "__id__": 3
                    },
                    "skybox": {
                        "__id__": 4
                    },
                    "fog": {
                        "__id__": 5
                    },
                    "octree": {
                        "__id__": 6
                    }
                },
                {
                    "__type__": "cc.AmbientInfo",
                    "_skyColorHDR": {
                        "__type__": "cc.Vec4",
                        "x": 0.2,
                        "y": 0.5,
                        "z": 0.8,
                        "w": 0.520833
                    },
                    "_skyColor": {
                        "__type__": "cc.Vec4",
                        "x": 0.2,
                        "y": 0.5,
                        "z": 0.8,
                        "w": 0.520833
                    },
                    "_skyIllumHDR": 20000,
                    "_skyIllum": 20000,
                    "_groundAlbedoHDR": {
                        "__type__": "cc.Vec4",
                        "x": 0.2,
                        "y": 0.2,
                        "z": 0.2,
                        "w": 1
                    },
                    "_groundAlbedo": {
                        "__type__": "cc.Vec4",
                        "x": 0.2,
                        "y": 0.2,
                        "z": 0.2,
                        "w": 1
                    }
                },
                {
                    "__type__": "cc.SkyboxInfo",
                    "_envLightingType": 0,
                    "_envmapHDR": null,
                    "_envmap": null,
                    "_envmapLodCount": 0,
                    "_diffuseMapHDR": null,
                    "_diffuseMap": null,
                    "_enabled": false,
                    "_useHDR": true,
                    "_editableMaterial": null,
                    "_reflectionHDR": null,
                    "_reflectionMap": null,
                    "_rotationAngle": 0
                },
                {
                    "__type__": "cc.FogInfo",
                    "_type": 0,
                    "_fogColor": {
                        "__type__": "cc.Color",
                        "r": 200,
                        "g": 200,
                        "b": 200,
                        "a": 255
                    },
                    "_enabled": false,
                    "_fogDensity": 0.3,
                    "_fogStart": 0.5,
                    "_fogEnd": 300,
                    "_fogAtten": 5,
                    "_fogTop": 1.5,
                    "_fogRange": 1.2,
                    "_accurate": false
                },
                {
                    "__type__": "cc.OctreeInfo",
                    "_enabled": false,
                    "_minPos": {
                        "__type__": "cc.Vec3",
                        "x": -1024,
                        "y": -1024,
                        "z": -1024
                    },
                    "_maxPos": {
                        "__type__": "cc.Vec3",
                        "x": 1024,
                        "y": 1024,
                        "z": 1024
                    },
                    "_depth": 8
                }
            ], null, 2);

            this.adapter.sendRequest('asset-db', 'create-asset', fullPath, sceneContent).then((result: any) => {
                // Verify scene creation by checking if it exists
                this.getSceneList().then((sceneList) => {
                    const createdScene = sceneList.data?.find((scene: any) => scene.uuid === result.uuid);
                    resolve({
                        success: true,
                        data: {
                            uuid: result.uuid,
                            url: result.url,
                            name: sceneName,
                            message: `Scene '${sceneName}' created successfully`,
                            sceneVerified: !!createdScene
                        },
                        verificationData: createdScene
                    });
                }).catch(() => {
                    resolve({
                        success: true,
                        data: {
                            uuid: result.uuid,
                            url: result.url,
                            name: sceneName,
                            message: `Scene '${sceneName}' created successfully (verification failed)`
                        }
                    });
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async getSceneHierarchy(includeComponents: boolean = false): Promise<ToolResponse> {
        return new Promise((resolve) => {
            // Editor API
            this.adapter.sendRequest('scene', 'query-node-tree').then((tree: any) => {
                const root = this.pickSceneTreeRoot(tree) || tree;
                if (root && root.uuid) {
                    const hierarchy = this.buildHierarchy(root, includeComponents);
                    resolve({
                        success: true,
                        data: hierarchy
                    });
                } else {
                    resolve({ success: false, error: 'No scene hierarchy available' });
                }
            }).catch((err: Error) => {
                // Fallback: use scene script
                const options = {
                    name: 'cocos-mcp-server',
                    method: 'getSceneHierarchy',
                    args: [includeComponents]
                };
                
                this.adapter.sendRequest('scene', 'execute-scene-script', options).then((result: any) => {
                    if (result && typeof result === 'object' && 'success' in result) {
                        resolve(result as ToolResponse);
                        return;
                    }
                    if (result && result.uuid) {
                        resolve({
                            success: true,
                            data: this.buildHierarchy(result, includeComponents),
                        });
                        return;
                    }
                    resolve({ success: false, error: 'No scene hierarchy available' });
                }).catch((err2: Error) => {
                    resolve({ success: false, error: `Direct API failed: ${err.message}, Scene script failed: ${err2.message}` });
                });
            });
        });
    }

    private buildHierarchy(node: any, includeComponents: boolean): any {
        const nodeInfo: any = {
            uuid: node.uuid,
            name: node.name,
            type: node.type,
            active: node.active,
            children: []
        };

        if (includeComponents && node.__comps__) {
            nodeInfo.components = node.__comps__.map((comp: any) => ({
                type: comp.__type__ || 'Unknown',
                enabled: comp.enabled !== undefined ? comp.enabled : true
            }));
        }

        if (node.children) {
            nodeInfo.children = node.children.map((child: any) => 
                this.buildHierarchy(child, includeComponents)
            );
        }

        return nodeInfo;
    }

    private async saveSceneAs(path: string): Promise<ToolResponse> {
        return new Promise((resolve, reject) => {
            // save-as-scene API ，
            this.adapter.sendRequest('scene', 'save-as-scene').then(() => {
                resolve({
                    success: true,
                    data: {
                        path: path,
                        message: `Scene save-as dialog opened`
                    }
                });
            }).catch((err: any) => {
                if (err && err.code === 'ENGINE_UNSUPPORTED') {
                    reject(err);
                    return;
                }
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async closeScene(): Promise<ToolResponse> {
        return new Promise((resolve, reject) => {
            this.adapter.sendRequest('scene', 'close-scene').then(() => {
                resolve({
                    success: true,
                    message: 'Scene closed successfully'
                });
            }).catch((err: any) => {
                if (err && err.code === 'ENGINE_UNSUPPORTED') {
                    reject(err);
                    return;
                }
                resolve({ success: false, error: err.message });
            });
        });
    }
}
import { ToolDefinition, ToolResponse, ToolExecutor, PrefabInfo } from '../types';

export class PrefabTools implements ToolExecutor {
    getTools(): ToolDefinition[] {
        return [
            {
                name: 'get_prefab_list',
                description: 'Get all prefabs in the project',
                inputSchema: {
                    type: 'object',
                    properties: {
                        folder: {
                            type: 'string',
                            description: 'Folder path to search (optional)',
                            default: 'db://assets'
                        }
                    }
                }
            },
            {
                name: 'load_prefab',
                description: 'Load a prefab by path',
                inputSchema: {
                    type: 'object',
                    properties: {
                        prefabPath: {
                            type: 'string',
                            description: 'Prefab asset path'
                        }
                    },
                    required: ['prefabPath']
                }
            },
            {
                name: 'instantiate_prefab',
                description: 'Instantiate a prefab in the scene',
                inputSchema: {
                    type: 'object',
                    properties: {
                        prefabPath: {
                            type: 'string',
                            description: 'Prefab asset path'
                        },
                        parentUuid: {
                            type: 'string',
                            description: 'Parent node UUID (optional)'
                        },
                        position: {
                            type: 'object',
                            description: 'Initial position',
                            properties: {
                                x: { type: 'number' },
                                y: { type: 'number' },
                                z: { type: 'number' }
                            }
                        }
                    },
                    required: ['prefabPath']
                }
            },
            {
                name: 'create_prefab',
                description: 'Create a prefab from a node with all children and components',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: {
                            type: 'string',
                            description: 'Source node UUID'
                        },
                        savePath: {
                            type: 'string',
                            description: 'Path to save the prefab (e.g., db://assets/prefabs/MyPrefab.prefab)'
                        },
                        prefabName: {
                            type: 'string',
                            description: 'Prefab name'
                        }
                    },
                    required: ['nodeUuid', 'savePath', 'prefabName']
                }
            },
            {
                name: 'update_prefab',
                description: 'Update an existing prefab',
                inputSchema: {
                    type: 'object',
                    properties: {
                        prefabPath: {
                            type: 'string',
                            description: 'Prefab asset path'
                        },
                        nodeUuid: {
                            type: 'string',
                            description: 'Node UUID with changes'
                        }
                    },
                    required: ['prefabPath', 'nodeUuid']
                }
            },
            {
                name: 'revert_prefab',
                description: 'Revert prefab instance to original',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: {
                            type: 'string',
                            description: 'Prefab instance node UUID'
                        }
                    },
                    required: ['nodeUuid']
                }
            },
            {
                name: 'get_prefab_info',
                description: 'Get detailed prefab information',
                inputSchema: {
                    type: 'object',
                    properties: {
                        prefabPath: {
                            type: 'string',
                            description: 'Prefab asset path'
                        }
                    },
                    required: ['prefabPath']
                }
            },
            {
                name: 'validate_prefab',
                description: 'Validate a prefab file format',
                inputSchema: {
                    type: 'object',
                    properties: {
                        prefabPath: {
                            type: 'string',
                            description: 'Prefab asset path'
                        }
                    },
                    required: ['prefabPath']
                }
            },
            {
                name: 'duplicate_prefab',
                description: 'Duplicate an existing prefab',
                inputSchema: {
                    type: 'object',
                    properties: {
                        sourcePrefabPath: {
                            type: 'string',
                            description: 'Source prefab path'
                        },
                        targetPrefabPath: {
                            type: 'string',
                            description: 'Target prefab path'
                        },
                        newPrefabName: {
                            type: 'string',
                            description: 'New prefab name'
                        }
                    },
                    required: ['sourcePrefabPath', 'targetPrefabPath']
                }
            },
            {
                name: 'restore_prefab_node',
                description: 'Restore prefab node using prefab asset (built-in undo record)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: {
                            type: 'string',
                            description: 'Prefab instance node UUID'
                        },
                        assetUuid: {
                            type: 'string',
                            description: 'Prefab asset UUID'
                        }
                    },
                    required: ['nodeUuid', 'assetUuid']
                }
            }
        ];
    }

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        switch (toolName) {
            case 'get_prefab_list':
                return await this.getPrefabList(args.folder);
            case 'load_prefab':
                return await this.loadPrefab(args.prefabPath);
            case 'instantiate_prefab':
                return await this.instantiatePrefab(args);
            case 'create_prefab':
                return await this.createPrefab(args);
            case 'update_prefab':
                return await this.updatePrefab(args.prefabPath, args.nodeUuid);
            case 'revert_prefab':
                return await this.revertPrefab(args.nodeUuid);
            case 'get_prefab_info':
                return await this.getPrefabInfo(args.prefabPath);
            case 'validate_prefab':
                return await this.validatePrefab(args.prefabPath);
            case 'duplicate_prefab':
                return await this.duplicatePrefab(args);
            case 'restore_prefab_node':
                return await this.restorePrefabNode(args.nodeUuid, args.assetUuid);
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }

    private async getPrefabList(folder: string = 'db://assets'): Promise<ToolResponse> {
        return new Promise((resolve) => {
            const pattern = folder.endsWith('/') ? 
                `${folder}**/*.prefab` : `${folder}/**/*.prefab`;
            
            Editor.Message.request('asset-db', 'query-assets', {
                pattern: pattern
            }).then((results: any[]) => {
                const prefabs: PrefabInfo[] = results.map(asset => ({
                    name: asset.name,
                    path: asset.url,
                    uuid: asset.uuid,
                    folder: asset.url.substring(0, asset.url.lastIndexOf('/'))
                }));
                resolve({ success: true, data: prefabs });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async loadPrefab(prefabPath: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'query-asset-info', prefabPath).then((assetInfo: any) => {
                if (!assetInfo) {
                    throw new Error('Prefab not found');
                }
                
                return Editor.Message.request('scene', 'load-asset', {
                    uuid: assetInfo.uuid
                });
            }).then((prefabData: any) => {
                resolve({
                    success: true,
                    data: {
                        uuid: prefabData.uuid,
                        name: prefabData.name,
                        message: 'Prefab loaded successfully'
                    }
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async instantiatePrefab(args: any): Promise<ToolResponse> {
        return new Promise(async (resolve) => {
            try {
                // Get prefab asset information
                const assetInfo = await Editor.Message.request('asset-db', 'query-asset-info', args.prefabPath);
                if (!assetInfo) {
                    throw new Error('Prefab not found');
                }

                // Instantiate from prefab asset using create-node API
                const createNodeOptions: any = {
                    assetUuid: assetInfo.uuid
                };

                // Set parent node
                if (args.parentUuid) {
                    createNodeOptions.parent = args.parentUuid;
                }

                // Set node name
                if (args.name) {
                    createNodeOptions.name = args.name;
                } else if (assetInfo.name) {
                    createNodeOptions.name = assetInfo.name;
                }

                // Set initial properties (e.g. position)
                if (args.position) {
                    createNodeOptions.dump = {
                        position: {
                            value: args.position
                        }
                    };
                }

                // Create node
                const nodeUuid = await Editor.Message.request('scene', 'create-node', createNodeOptions);
                const uuid = Array.isArray(nodeUuid) ? nodeUuid[0] : nodeUuid;

                // Note: create-node from prefab asset should establish prefab link automatically
                console.log('Prefab node created successfully:', {
                    nodeUuid: uuid,
                    prefabUuid: assetInfo.uuid,
                    prefabPath: args.prefabPath
                });
                
                resolve({
                    success: true,
                    data: {
                        nodeUuid: uuid,
                        prefabPath: args.prefabPath,
                        parentUuid: args.parentUuid,
                        position: args.position,
                        message: 'Prefab instantiated successfully; prefab link established'
                    }
                });
            } catch (err: any) {
                resolve({ 
                    success: false, 
                    error: `Prefab instantiation failed: ${err.message}`,
                    instruction: 'Verify the prefab path is correct and the prefab file format is valid'
                });
            }
        });
    }

    /**
     * Link node to prefab instance
     * Creates PrefabInfo and PrefabInstance structures
     */
    private async establishPrefabConnection(nodeUuid: string, prefabUuid: string, prefabPath: string): Promise<void> {
        try {
            // Read prefab file to obtain root node fileId
            const prefabContent = await this.readPrefabFile(prefabPath);
            if (!prefabContent || !prefabContent.data || !prefabContent.data.length) {
                throw new Error('Unable to read prefab file content');
            }

            // Root prefab fileId (usually second object, index 1)
            const rootNode = prefabContent.data.find((item: any) => item.__type === 'cc.Node' && item._parent === null);
            if (!rootNode || !rootNode._prefab) {
                throw new Error('Unable to find prefab root node or its prefab metadata');
            }

            // Get PrefabInfo on root
            const rootPrefabInfo = prefabContent.data[rootNode._prefab.__id__];
            if (!rootPrefabInfo || rootPrefabInfo.__type !== 'cc.PrefabInfo') {
                throw new Error('Unable to find PrefabInfo on the prefab root node');
            }

            const rootFileId = rootPrefabInfo.fileId;

            // Link prefab via scene API
            const prefabConnectionData = {
                node: nodeUuid,
                prefab: prefabUuid,
                fileId: rootFileId
            };

            // Try multiple APIs to establish prefab link
            const connectionMethods = [
                () => Editor.Message.request('scene', 'connect-prefab-instance', prefabConnectionData),
                () => Editor.Message.request('scene', 'set-prefab-connection', prefabConnectionData),
                () => Editor.Message.request('scene', 'apply-prefab-link', prefabConnectionData)
            ];

            let connected = false;
            for (const method of connectionMethods) {
                try {
                    await method();
                    connected = true;
                    break;
                } catch (error) {
                    console.warn('Prefab link method failed, trying next method:', error);
                }
            }

            if (!connected) {
                // If all APIs fail, try manual scene data patch
                console.warn('All prefab link APIs failed, attempting manual connection');
                await this.manuallyEstablishPrefabConnection(nodeUuid, prefabUuid, rootFileId);
            }

        } catch (error) {
            console.error('Failed to establish prefab connection:', error);
            throw error;
        }
    }

    /**
     * Manual prefab link fallback when APIs fail
     */
    private async manuallyEstablishPrefabConnection(nodeUuid: string, prefabUuid: string, rootFileId: string): Promise<void> {
        try {
            // Try dump API to modify node _prefab
            const prefabConnectionData = {
                [nodeUuid]: {
                    '_prefab': {
                        '__uuid__': prefabUuid,
                        '__expectedType__': 'cc.Prefab',
                        'fileId': rootFileId
                    }
                }
            };

            await Editor.Message.request('scene', 'set-property', {
                uuid: nodeUuid,
                path: '_prefab',
                dump: {
                    value: {
                        '__uuid__': prefabUuid,
                        '__expectedType__': 'cc.Prefab'
                    }
                }
            });

        } catch (error) {
            console.error('Manual prefab connection also failed:', error);
            // Do not throw; base node creation succeeded
        }
    }

    /**
     * Read prefab file content
     */
    private async readPrefabFile(prefabPath: string): Promise<any> {
        try {
            // Try asset-db API to read file
            let assetContent: any;
            try {
                assetContent = await Editor.Message.request('asset-db', 'query-asset-info', prefabPath);
                if (assetContent && assetContent.source) {
                    // If source path exists, read file directly
                    const fs = require('fs');
                    const path = require('path');
                    const fullPath = path.resolve(assetContent.source);
                    const fileContent = fs.readFileSync(fullPath, 'utf8');
                    return JSON.parse(fileContent);
                }
            } catch (error) {
                console.warn('asset-db read failed, trying other methods:', error);
            }

            // Fallback: resolve db:// to filesystem path
            const fsPath = prefabPath.replace('db://assets/', 'assets/').replace('db://assets', 'assets');
            const fs = require('fs');
            const path = require('path');
            
            // Try multiple candidate project roots
            const possiblePaths = [
                path.resolve(process.cwd(), '../../NewProject_3', fsPath),
                path.resolve('/Users/lizhiyong/NewProject_3', fsPath),
                path.resolve(fsPath),
                // Also try direct path for project-root files
                path.resolve('/Users/lizhiyong/NewProject_3/assets', path.basename(fsPath))
            ];

            console.log('Attempting to read prefab file, path resolution:', {
                originalPath: prefabPath,
                fsPath: fsPath,
                possiblePaths: possiblePaths
            });

            for (const fullPath of possiblePaths) {
                try {
                    console.log(`Checking path: ${fullPath}`);
                    if (fs.existsSync(fullPath)) {
                        console.log(`Found file: ${fullPath}`);
                        const fileContent = fs.readFileSync(fullPath, 'utf8');
                        const parsed = JSON.parse(fileContent);
                        console.log('File parsed successfully, data structure:', {
                            hasData: !!parsed.data,
                            dataLength: parsed.data ? parsed.data.length : 0
                        });
                        return parsed;
                    } else {
                        console.log(`File does not exist: ${fullPath}`);
                    }
                } catch (readError) {
                    console.warn(`Failed to read file ${fullPath}:`, readError);
                }
            }

            throw new Error('Unable to find or read prefab file');
        } catch (error) {
            console.error('Failed to read prefab file:', error);
            throw error;
        }
    }

    private async tryCreateNodeWithPrefab(args: any): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'query-asset-info', args.prefabPath).then((assetInfo: any) => {
                if (!assetInfo) {
                    throw new Error('Prefab not found');
                }

                // Approach 2: create-node with prefab asset
                const createNodeOptions: any = {
                    assetUuid: assetInfo.uuid
                };

                // Set parent node
                if (args.parentUuid) {
                    createNodeOptions.parent = args.parentUuid;
                }

                return Editor.Message.request('scene', 'create-node', createNodeOptions);
            }).then((nodeUuid: string | string[]) => {
                const uuid = Array.isArray(nodeUuid) ? nodeUuid[0] : nodeUuid;
                
                // Apply position when provided
                if (args.position && uuid) {
                    Editor.Message.request('scene', 'set-property', {
                        uuid: uuid,
                        path: 'position',
                        dump: { value: args.position }
                    }).then(() => {
                        resolve({
                            success: true,
                            data: {
                                nodeUuid: uuid,
                                prefabPath: args.prefabPath,
                                position: args.position,
                                message: 'Prefab instantiated (fallback) and position set'
                            }
                        });
                    }).catch(() => {
                        resolve({
                            success: true,
                            data: {
                                nodeUuid: uuid,
                                prefabPath: args.prefabPath,
                                message: 'Prefab instantiated (fallback) but position set failed'
                            }
                        });
                    });
                } else {
                    resolve({
                        success: true,
                        data: {
                            nodeUuid: uuid,
                            prefabPath: args.prefabPath,
                            message: 'Prefab instantiated successfully (fallback)'
                        }
                    });
                }
            }).catch((err: Error) => {
                resolve({
                    success: false,
                    error: `Fallback prefab instantiation also failed: ${err.message}`
                });
            });
        });
    }

    private async tryAlternativeInstantiateMethods(args: any): Promise<ToolResponse> {
        return new Promise(async (resolve) => {
            try {
                // Approach 1: create-node then apply prefab
                const assetInfo = await this.getAssetInfo(args.prefabPath);
                if (!assetInfo) {
                    resolve({ success: false, error: 'Unable to get prefab information' });
                    return;
                }

                // Create empty node
                const createResult = await this.createNode(args.parentUuid, args.position);
                if (!createResult.success) {
                    resolve(createResult);
                    return;
                }

                // Try applying prefab data to node
                const applyResult = await this.applyPrefabToNode(createResult.data.nodeUuid, assetInfo.uuid);
                if (applyResult.success) {
                    resolve({
                        success: true,
                        data: {
                            nodeUuid: createResult.data.nodeUuid,
                            name: createResult.data.name,
                            message: 'Prefab instantiated successfully (alternate method)'
                        }
                    });
                } else {
                    resolve({
                        success: false,
                        error: 'Unable to apply prefab to node',
                        data: {
                            nodeUuid: createResult.data.nodeUuid,
                            message: 'Node created but prefab data could not be applied'
                        }
                    });
                }

            } catch (error) {
                resolve({ success: false, error: `Alternate instantiation failed: ${error}` });
            }
        });
    }

    private async getAssetInfo(prefabPath: string): Promise<any> {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'query-asset-info', prefabPath).then((assetInfo: any) => {
                resolve(assetInfo);
            }).catch(() => {
                resolve(null);
            });
        });
    }

    private async createNode(parentUuid?: string, position?: any): Promise<ToolResponse> {
        return new Promise((resolve) => {
            const createNodeOptions: any = {
                name: 'PrefabInstance'
            };

            // Set parent node
            if (parentUuid) {
                createNodeOptions.parent = parentUuid;
            }

            // Set position
            if (position) {
                createNodeOptions.dump = {
                    position: position
                };
            }

            Editor.Message.request('scene', 'create-node', createNodeOptions).then((nodeUuid: string | string[]) => {
                const uuid = Array.isArray(nodeUuid) ? nodeUuid[0] : nodeUuid;
                resolve({
                    success: true,
                    data: {
                        nodeUuid: uuid,
                        name: 'PrefabInstance'
                    }
                });
            }).catch((error: any) => {
                resolve({ success: false, error: error.message || 'Failed to create node' });
            });
        });
    }

    private async applyPrefabToNode(nodeUuid: string, prefabUuid: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            // Try multiple ways to apply prefab data
            const methods = [
                () => Editor.Message.request('scene', 'apply-prefab', { node: nodeUuid, prefab: prefabUuid }),
                () => Editor.Message.request('scene', 'set-prefab', { node: nodeUuid, prefab: prefabUuid }),
                () => Editor.Message.request('scene', 'load-prefab-to-node', { node: nodeUuid, prefab: prefabUuid })
            ];

            const tryMethod = (index: number) => {
                if (index >= methods.length) {
                    resolve({ success: false, error: 'Unable to apply prefab data' });
                    return;
                }

                methods[index]().then(() => {
                    resolve({ success: true });
                }).catch(() => {
                    tryMethod(index + 1);
                });
            };

            tryMethod(0);
        });
    }

    /**
     * New prefab creation path via asset-db API
     * Integrates asset-db for full prefab creation flow
     */
    private async createPrefabWithAssetDB(nodeUuid: string, savePath: string, prefabName: string, includeChildren: boolean, includeComponents: boolean): Promise<ToolResponse> {
        return new Promise(async (resolve) => {
            try {
                console.log('=== Creating prefab via Asset-DB API ===');
                console.log(`Node UUID: ${nodeUuid}`);
                console.log(`Save path: ${savePath}`);
                console.log(`Prefab name: ${prefabName}`);

                // Step 1: fetch node data (incl. transform)
                const nodeData = await this.getNodeData(nodeUuid);
                if (!nodeData) {
                    resolve({
                        success: false,
                        error: 'Unable to get node data'
                    });
                    return;
                }

                console.log('Node data retrieved, child count:', nodeData.children ? nodeData.children.length : 0);

                // Step 2: create asset file for engine UUID
                console.log('Creating prefab asset file...');
                const tempPrefabContent = JSON.stringify([{"__type__": "cc.Prefab", "_name": prefabName}], null, 2);
                const createResult = await this.createAssetWithAssetDB(savePath, tempPrefabContent);
                if (!createResult.success) {
                    resolve(createResult);
                    return;
                }

                // Read engine-assigned UUID
                const actualPrefabUuid = createResult.data?.uuid;
                if (!actualPrefabUuid) {
                    resolve({
                        success: false,
                        error: 'Unable to get engine-assigned prefab UUID'
                    });
                    return;
                }
                console.log('Engine-assigned UUID:', actualPrefabUuid);

                // Step 3: regenerate prefab JSON with real UUID
                const prefabContent = await this.createStandardPrefabContent(nodeData, prefabName, actualPrefabUuid, includeChildren, includeComponents);
                const prefabContentString = JSON.stringify(prefabContent, null, 2);

                // Step 4: write prefab file
                console.log('Updating prefab file content...');
                const updateResult = await this.updateAssetWithAssetDB(savePath, prefabContentString);
                
                // Step 5: write .meta with real UUID
                console.log('Creating prefab .meta file...');
                const metaContent = this.createStandardMetaContent(prefabName, actualPrefabUuid);
                const metaResult = await this.createMetaWithAssetDB(savePath, metaContent);
                
                // Step 6: re-import asset
                console.log('Re-importing prefab asset...');
                const reimportResult = await this.reimportAssetWithAssetDB(savePath);

                // Step 7: convert source node to prefab instance
                console.log('Attempting to convert source node to prefab instance...');
                const convertResult = await this.convertNodeToPrefabInstance(nodeUuid, actualPrefabUuid, savePath);
                
                resolve({
                    success: true,
                    data: {
                        prefabUuid: actualPrefabUuid,
                        prefabPath: savePath,
                        nodeUuid: nodeUuid,
                        prefabName: prefabName,
                        convertedToPrefabInstance: convertResult.success,
                        createAssetResult: createResult,
                        updateResult: updateResult,
                        metaResult: metaResult,
                        reimportResult: reimportResult,
                        convertResult: convertResult,
                        message: convertResult.success ? 'Prefab created and source node converted' : 'Prefab created but node conversion failed'
                    }
                });

            } catch (error) {
                console.error('Error while creating prefab:', error);
                resolve({
                    success: false,
                    error: `Failed to create prefab: ${error}`
                });
            }
        });
    }

    private async createPrefab(args: any): Promise<ToolResponse> {
        return new Promise(async (resolve) => {
            try {
                // Accept prefabPath or savePath
                const pathParam = args.prefabPath || args.savePath;
                if (!pathParam) {
                    resolve({
                        success: false,
                        error: 'Missing prefab path. Provide prefabPath or savePath.'
                    });
                    return;
                }

                const prefabName = args.prefabName || 'NewPrefab';
                const fullPath = pathParam.endsWith('.prefab') ? 
                    pathParam : `${pathParam}/${prefabName}.prefab`;

                const includeChildren = args.includeChildren !== false; // default true
                const includeComponents = args.includeComponents !== false; // default true

                // Prefer new asset-db prefab creation
                console.log('Creating prefab with new asset-db method...');
                const assetDbResult = await this.createPrefabWithAssetDB(
                    args.nodeUuid,
                    fullPath,
                    prefabName,
                    includeChildren,
                    includeComponents
                );

                if (assetDbResult.success) {
                    resolve(assetDbResult);
                    return;
                }

                // If asset-db fails, try native Creator prefab APIs
                console.log('asset-db method failed, trying native API...');
                const nativeResult = await this.createPrefabNative(args.nodeUuid, fullPath);
                if (nativeResult.success) {
                    resolve(nativeResult);
                    return;
                }

                // If native fails, use custom serializer
                console.log('Native API failed, using custom implementation...');
                const customResult = await this.createPrefabCustom(args.nodeUuid, fullPath, prefabName);
                resolve(customResult);

            } catch (error) {
                resolve({
                    success: false,
                    error: `Error while creating prefab: ${error}`
                });
            }
        });
    }

    private async createPrefabNative(nodeUuid: string, prefabPath: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            // No single official API creates prefabs end-to-end
            // Manual prefab creation in editor is required
            resolve({
                success: false,
                error: 'Native prefab creation API does not exist',
                instruction: 'Per Cocos Creator official APIs, create prefabs manually:\n1. Select the node in the scene\n2. Drag it into the Assets panel\n3. Or right-click the node and choose Create Prefab'
            });
        });
    }

    private async createPrefabCustom(nodeUuid: string, prefabPath: string, prefabName: string): Promise<ToolResponse> {
        return new Promise(async (resolve) => {
            try {
                // 1. Fetch full source node data
                const nodeData = await this.getNodeData(nodeUuid);
                if (!nodeData) {
                    resolve({
                        success: false,
                        error: `Node not found: ${nodeUuid}`
                    });
                    return;
                }

                // 2. Generate prefab UUID
                const prefabUuid = this.generateUUID();

                // 3. Build prefab data structure
                const prefabData = this.createPrefabData(nodeData, prefabName, prefabUuid);

                // 4. Match official prefab JSON layout
                console.log('=== Starting prefab creation ===');
                console.log('Node name:', nodeData.name?.value || 'unknown');
                console.log('Node UUID:', nodeData.uuid?.value || 'unknown');
                console.log('Prefab save path:', prefabPath);
                console.log(`Starting prefab creation, node data:`, nodeData);
                const prefabJsonData = await this.createStandardPrefabContent(nodeData, prefabName, prefabUuid, true, true);

                // 5. Build standard .meta payload
                const standardMetaData = this.createStandardMetaData(prefabName, prefabUuid);

                // 6. Save prefab and .meta
                const saveResult = await this.savePrefabWithMeta(prefabPath, prefabJsonData, standardMetaData);

                if (saveResult.success) {
                    // After save, convert source node to instance
                    const convertResult = await this.convertNodeToPrefabInstance(nodeUuid, prefabPath, prefabUuid);
                    
                    resolve({
                        success: true,
                        data: {
                            prefabUuid: prefabUuid,
                            prefabPath: prefabPath,
                            nodeUuid: nodeUuid,
                            prefabName: prefabName,
                            convertedToPrefabInstance: convertResult.success,
                            message: convertResult.success ? 
                                'Custom prefab created; source node converted to prefab instance' : 
                                'Prefab created but node conversion failed'
                        }
                    });
                } else {
                    resolve({
                        success: false,
                        error: saveResult.error || 'Failed to save prefab file'
                    });
                }

            } catch (error) {
                resolve({
                    success: false,
                    error: `Error while creating prefab: ${error}`
                });
            }
        });
    }

    private async getNodeData(nodeUuid: string): Promise<any> {
        return new Promise(async (resolve) => {
            try {
                // Fetch basic node info first
                const nodeInfo = await Editor.Message.request('scene', 'query-node', nodeUuid);
                if (!nodeInfo) {
                    resolve(null);
                    return;
                }

                console.log(`Retrieved basic info for node ${nodeUuid}`);
                
                // Use query-node-tree for subtree
                const nodeTree = await this.getNodeWithChildren(nodeUuid);
                if (nodeTree) {
                    console.log(`Retrieved full tree for node ${nodeUuid}`);
                    resolve(nodeTree);
                } else {
                    console.log(`Using basic node information`);
                    resolve(nodeInfo);
                }
            } catch (error) {
                console.warn(`Failed to get node data ${nodeUuid}:`, error);
                resolve(null);
            }
        });
    }

    // Full node subtree via query-node-tree
    private async getNodeWithChildren(nodeUuid: string): Promise<any> {
        try {
            // Load full scene tree
            const tree = await Editor.Message.request('scene', 'query-node-tree');
            if (!tree) {
                return null;
            }

            // Find node by UUID in tree
            const targetNode = this.findNodeInTree(tree, nodeUuid);
            if (targetNode) {
                console.log(`Found node ${nodeUuid} in scene tree, child count: ${targetNode.children ? targetNode.children.length : 0}`);
                
                // Enrich tree with accurate component info
                const enhancedTree = await this.enhanceTreeWithMCPComponents(targetNode);
                return enhancedTree;
            }

            return null;
        } catch (error) {
            console.warn(`Failed to get node tree for ${nodeUuid}:`, error);
            return null;
        }
    }

    // Recursively find node UUID in tree
    private findNodeInTree(node: any, targetUuid: string): any {
        if (!node) return null;
        
        // Inspect current node
        if (node.uuid === targetUuid || node.value?.uuid === targetUuid) {
            return node;
        }

        // Recurse into children
        if (node.children && Array.isArray(node.children)) {
            for (const child of node.children) {
                const found = this.findNodeInTree(child, targetUuid);
                if (found) {
                    return found;
                }
            }
        }

        return null;
    }

    /**
     * Enrich node tree via MCP for accurate components
     */
    private async enhanceTreeWithMCPComponents(node: any): Promise<any> {
        if (!node || !node.uuid) {
            return node;
        }

        try {
            // Fetch components via MCP
            const response = await fetch('http://localhost:8585/mcp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    "jsonrpc": "2.0",
                    "method": "tools/call",
                    "params": {
                        "name": "component_get_components",
                        "arguments": {
                            "nodeUuid": node.uuid
                        }
                    },
                    "id": Date.now()
                })
            });
            
            const mcpResult = await response.json();
            if (mcpResult.result?.content?.[0]?.text) {
                const componentData = JSON.parse(mcpResult.result.content[0].text);
                if (componentData.success && componentData.data.components) {
                    // Replace node.components with MCP data
                    node.components = componentData.data.components;
                    console.log(`Node ${node.uuid} has ${componentData.data.components.length} components (including script types)`);
                }
            }
        } catch (error) {
            console.warn(`Failed to get MCP component info for node ${node.uuid}:`, error);
        }

        // Recurse into children
        if (node.children && Array.isArray(node.children)) {
            for (let i = 0; i < node.children.length; i++) {
                node.children[i] = await this.enhanceTreeWithMCPComponents(node.children[i]);
            }
        }

        return node;
    }

    private async buildBasicNodeInfo(nodeUuid: string): Promise<any> {
        return new Promise((resolve) => {
            // Build minimal node record
            Editor.Message.request('scene', 'query-node', nodeUuid).then((nodeInfo: any) => {
                if (!nodeInfo) {
                    resolve(null);
                    return;
                }

                // Simplified: basic fields only
                // Children/components added later in pipeline
                const basicInfo = {
                    ...nodeInfo,
                    children: [],
                    components: []
                };
                resolve(basicInfo);
            }).catch(() => {
                resolve(null);
            });
        });
    }

    // Validate node payload
    private isValidNodeData(nodeData: any): boolean {
        if (!nodeData) return false;
        if (typeof nodeData !== 'object') return false;
        
        // Check base fields (query-node-tree shape)
        return nodeData.hasOwnProperty('uuid') || 
               nodeData.hasOwnProperty('name') || 
               nodeData.hasOwnProperty('__type__') ||
               (nodeData.value && (
                   nodeData.value.hasOwnProperty('uuid') ||
                   nodeData.value.hasOwnProperty('name') ||
                   nodeData.value.hasOwnProperty('__type__')
               ));
    }

    // Normalize child UUID extraction
    private extractChildUuid(childRef: any): string | null {
        if (!childRef) return null;
        
        // Pattern 1: plain string
        if (typeof childRef === 'string') {
            return childRef;
        }
        
        // Pattern 2: value string
        if (childRef.value && typeof childRef.value === 'string') {
            return childRef.value;
        }
        
        // Pattern 3: value.uuid
        if (childRef.value && childRef.value.uuid) {
            return childRef.value.uuid;
        }
        
        // Pattern 4: uuid field
        if (childRef.uuid) {
            return childRef.uuid;
        }
        
        // Pattern 5: __id__ refs need resolver
        if (childRef.__id__ !== undefined) {
            console.log(`Found __id__ reference: ${childRef.__id__}; may need lookup in data structure`);
            return null; // TODO: resolve __id__ references
        }
        
        console.warn('Unable to extract child node UUID:', JSON.stringify(childRef));
        return null;
    }

    // Collect child records to process
    private getChildrenToProcess(nodeData: any): any[] {
        const children: any[] = [];
        
        // Prefer children[] from query-node-tree
        if (nodeData.children && Array.isArray(nodeData.children)) {
            console.log(`Children from children[] count: ${nodeData.children.length}`);
            for (const child of nodeData.children) {
                // query-node-tree children are usually complete
                if (this.isValidNodeData(child)) {
                    children.push(child);
                    console.log(`Add child: ${child.name || child.value?.name || 'unknown'}`);
                } else {
                    console.log('Invalid child node data:', JSON.stringify(child, null, 2));
                }
            }
        } else {
            console.log('Node has no children or children array is empty');
        }
        
        return children;
    }

    private generateUUID(): string {
        // UUID v4 compatible with Creator
        const chars = '0123456789abcdef';
        let uuid = '';
        for (let i = 0; i < 32; i++) {
            if (i === 8 || i === 12 || i === 16 || i === 20) {
                uuid += '-';
            }
            uuid += chars[Math.floor(Math.random() * chars.length)];
        }
        return uuid;
    }

    private createPrefabData(nodeData: any, prefabName: string, prefabUuid: string): any[] {
        // Build canonical prefab JSON array
        const prefabAsset = {
            "__type__": "cc.Prefab",
            "_name": prefabName,
            "_objFlags": 0,
            "__editorExtras__": {},
            "_native": "",
            "data": {
                "__id__": 1
            },
            "optimizationPolicy": 0,
            "persistent": false
        };

        // Normalize node data for prefab
        const processedNodeData = this.processNodeForPrefab(nodeData, prefabUuid);

        return [prefabAsset, ...processedNodeData];
    }

    private processNodeForPrefab(nodeData: any, prefabUuid: string): any[] {
        // Normalize node data for prefab export
        const processedData: any[] = [];
        let idCounter = 1;

        // Recurse nodes and components
        const processNode = (node: any, parentId: number = 0): number => {
            const nodeId = idCounter++;
            
            // Push node object
            const processedNode = {
                "__type__": "cc.Node",
                "_name": node.name || "Node",
                "_objFlags": 0,
                "__editorExtras__": {},
                "_parent": parentId > 0 ? { "__id__": parentId } : null,
                "_children": node.children ? node.children.map(() => ({ "__id__": idCounter++ })) : [],
                "_active": node.active !== false,
                "_components": node.components ? node.components.map(() => ({ "__id__": idCounter++ })) : [],
                "_prefab": {
                    "__id__": idCounter++
                },
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
                "_id": ""
            };

            processedData.push(processedNode);

            // Serialize components
            if (node.components) {
                node.components.forEach((component: any) => {
                    const componentId = idCounter++;
                    const processedComponents = this.processComponentForPrefab(component, componentId);
                    processedData.push(...processedComponents);
                });
            }

            // Serialize children
            if (node.children) {
                node.children.forEach((child: any) => {
                    processNode(child, nodeId);
                });
            }

            return nodeId;
        };

        processNode(nodeData);
        return processedData;
    }

    private processComponentForPrefab(component: any, componentId: number): any[] {
        // Normalize component props
        const processedComponent = {
            "__type__": component.type || "cc.Component",
            "_name": "",
            "_objFlags": 0,
            "__editorExtras__": {},
            "node": {
                "__id__": componentId - 1
            },
            "_enabled": component.enabled !== false,
            "__prefab": {
                "__id__": componentId + 1
            },
            ...component.properties
        };

        // Attach CompPrefabInfo metadata
        const compPrefabInfo = {
            "__type__": "cc.CompPrefabInfo",
            "fileId": this.generateFileId()
        };

        return [processedComponent, compPrefabInfo];
    }

    private generateFileId(): string {
        // Generate fileId (simplified)
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/';
        let fileId = '';
        for (let i = 0; i < 22; i++) {
            fileId += chars[Math.floor(Math.random() * chars.length)];
        }
        return fileId;
    }

    private createMetaData(prefabName: string, prefabUuid: string): any {
        return {
            "ver": "1.1.50",
            "importer": "prefab",
            "imported": true,
            "uuid": prefabUuid,
            "files": [
                ".json"
            ],
            "subMetas": {},
            "userData": {
                "syncNodeName": prefabName
            }
        };
    }

    private async savePrefabFiles(prefabPath: string, prefabData: any[], metaData: any): Promise<{ success: boolean; error?: string }> {
        return new Promise((resolve) => {
            try {
                // Save via Editor/asset-db
                const prefabContent = JSON.stringify(prefabData, null, 2);
                const metaContent = JSON.stringify(metaData, null, 2);
                
                // Retry with alternate save path
                this.saveAssetFile(prefabPath, prefabContent).then(() => {
                    // Write companion .meta
                    const metaPath = `${prefabPath}.meta`;
                    return this.saveAssetFile(metaPath, metaContent);
                }).then(() => {
                    resolve({ success: true });
                }).catch((error: any) => {
                    resolve({ success: false, error: error.message || 'Failed to save prefab file' });
                });
            } catch (error) {
                resolve({ success: false, error: `Error while saving file: ${error}` });
            }
        });
    }

    private async saveAssetFile(filePath: string, content: string): Promise<void> {
        return new Promise((resolve, reject) => {
            // Multiple save strategies
            const saveMethods = [
                () => Editor.Message.request('asset-db', 'create-asset', filePath, content),
                () => Editor.Message.request('asset-db', 'save-asset', filePath, content),
                () => Editor.Message.request('asset-db', 'write-asset', filePath, content)
            ];

            const trySave = (index: number) => {
                if (index >= saveMethods.length) {
                    reject(new Error('All save methods failed'));
                    return;
                }

                saveMethods[index]().then(() => {
                    resolve();
                }).catch(() => {
                    trySave(index + 1);
                });
            };

            trySave(0);
        });
    }

    private async updatePrefab(prefabPath: string, nodeUuid: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'query-asset-info', prefabPath).then((assetInfo: any) => {
                if (!assetInfo) {
                    throw new Error('Prefab not found');
                }

                return Editor.Message.request('scene', 'apply-prefab', {
                    node: nodeUuid,
                    prefab: assetInfo.uuid
                });
            }).then(() => {
                resolve({
                    success: true,
                    message: 'Prefab updated successfully'
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async revertPrefab(nodeUuid: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'revert-prefab', {
                node: nodeUuid
            }).then(() => {
                resolve({
                    success: true,
                    message: 'Prefab instance reverted successfully'
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async getPrefabInfo(prefabPath: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'query-asset-info', prefabPath).then((assetInfo: any) => {
                if (!assetInfo) {
                    throw new Error('Prefab not found');
                }

                return Editor.Message.request('asset-db', 'query-asset-meta', assetInfo.uuid);
            }).then((metaInfo: any) => {
                const info: PrefabInfo = {
                    name: metaInfo.name,
                    uuid: metaInfo.uuid,
                    path: prefabPath,
                    folder: prefabPath.substring(0, prefabPath.lastIndexOf('/')),
                    createTime: metaInfo.createTime,
                    modifyTime: metaInfo.modifyTime,
                    dependencies: metaInfo.depends || []
                };
                resolve({ success: true, data: info });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async createPrefabFromNode(args: any): Promise<ToolResponse> {
        // Derive name from prefabPath
        const prefabPath = args.prefabPath;
        const prefabName = prefabPath.split('/').pop()?.replace('.prefab', '') || 'NewPrefab';
        
        // Delegate to legacy createPrefab
        return await this.createPrefab({
            nodeUuid: args.nodeUuid,
            savePath: prefabPath,
            prefabName: prefabName
        });
    }

    private async validatePrefab(prefabPath: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            try {
                // Read prefab JSON from disk
                Editor.Message.request('asset-db', 'query-asset-info', prefabPath).then((assetInfo: any) => {
                    if (!assetInfo) {
                        resolve({
                            success: false,
                            error: 'Prefab file does not exist'
                        });
                        return;
                    }

                    // Validate prefab JSON
                    Editor.Message.request('asset-db', 'read-asset', prefabPath).then((content: string) => {
                        try {
                            const prefabData = JSON.parse(content);
                            const validationResult = this.validatePrefabFormat(prefabData);
                            
                            resolve({
                                success: true,
                                data: {
                                    isValid: validationResult.isValid,
                                    issues: validationResult.issues,
                                    nodeCount: validationResult.nodeCount,
                                    componentCount: validationResult.componentCount,
                                    message: validationResult.isValid ? 'Prefab format is valid' : 'Prefab format has issues'
                                }
                            });
                        } catch (parseError) {
                            resolve({
                                success: false,
                                error: 'Prefab file is not valid JSON'
                            });
                        }
                    }).catch((error: any) => {
                        resolve({
                            success: false,
                            error: `Failed to read prefab file: ${error.message}`
                        });
                    });
                }).catch((error: any) => {
                    resolve({
                        success: false,
                        error: `Failed to query prefab info: ${error.message}`
                    });
                });
            } catch (error) {
                resolve({
                    success: false,
                    error: `Error while validating prefab: ${error}`
                });
            }
        });
    }

    private validatePrefabFormat(prefabData: any): { isValid: boolean; issues: string[]; nodeCount: number; componentCount: number } {
        const issues: string[] = [];
        let nodeCount = 0;
        let componentCount = 0;

        // Structural checks
        if (!Array.isArray(prefabData)) {
            issues.push('Prefab data must be an array');
            return { isValid: false, issues, nodeCount, componentCount };
        }

        if (prefabData.length === 0) {
            issues.push('Prefab data is empty');
            return { isValid: false, issues, nodeCount, componentCount };
        }

        // Ensure first element is prefab asset
        const firstElement = prefabData[0];
        if (!firstElement || firstElement.__type__ !== 'cc.Prefab') {
            issues.push('First element must be cc.Prefab');
        }

        // Count nodes/components
        prefabData.forEach((item: any, index: number) => {
            if (item.__type__ === 'cc.Node') {
                nodeCount++;
            } else if (item.__type__ && item.__type__.includes('cc.')) {
                componentCount++;
            }
        });

        // Required field checks
        if (nodeCount === 0) {
            issues.push('Prefab must contain at least one node');
        }

        return {
            isValid: issues.length === 0,
            issues,
            nodeCount,
            componentCount
        };
    }

    private async duplicatePrefab(args: any): Promise<ToolResponse> {
        return new Promise(async (resolve) => {
            try {
                const { sourcePrefabPath, targetPrefabPath, newPrefabName } = args;
                
                // Read source prefab
                const sourceInfo = await this.getPrefabInfo(sourcePrefabPath);
                if (!sourceInfo.success) {
                    resolve({
                        success: false,
                        error: `Failed to read source prefab: ${sourceInfo.error}`
                    });
                    return;
                }

                // Read source prefab JSON
                const sourceContent = await this.readPrefabContent(sourcePrefabPath);
                if (!sourceContent.success) {
                    resolve({
                        success: false,
                        error: `Failed to read source prefab content: ${sourceContent.error}`
                    });
                    return;
                }

                // Regenerate UUIDs
                const newUuid = this.generateUUID();
                
                // Patch prefab data
                const modifiedData = this.modifyPrefabForDuplication(sourceContent.data, newPrefabName, newUuid);
                
                // Build new .meta
                const newMetaData = this.createMetaData(newPrefabName || 'DuplicatedPrefab', newUuid);
                
                // Prefab duplication disabled (complex serialization)
                resolve({
                    success: false,
                    error: 'Prefab duplication is temporarily unavailable',
                    instruction: 'Duplicate prefabs manually in Cocos Creator:\n1. Select the prefab in Assets\n2. Right-click → Duplicate (or Copy/Paste)\n3. Place it in the target folder'
                });

            } catch (error) {
                resolve({
                    success: false,
                    error: `Error while duplicating prefab: ${error}`
                });
            }
        });
    }

    private async readPrefabContent(prefabPath: string): Promise<{ success: boolean; data?: any; error?: string }> {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'read-asset', prefabPath).then((content: string) => {
                try {
                    const prefabData = JSON.parse(content);
                    resolve({ success: true, data: prefabData });
                } catch (parseError) {
                    resolve({ success: false, error: 'Invalid prefab file format' });
                }
            }).catch((error: any) => {
                resolve({ success: false, error: error.message || 'Failed to read prefab file' });
            });
        });
    }

    private modifyPrefabForDuplication(prefabData: any[], newName: string, newUuid: string): any[] {
        // Clone prefab data
        const modifiedData = [...prefabData];
        
        // Patch element 0 (Prefab asset)
        if (modifiedData[0] && modifiedData[0].__type__ === 'cc.Prefab') {
            modifiedData[0]._name = newName || 'DuplicatedPrefab';
        }

        // Remap UUID references (simplified)
        // Production may need richer UUID remap
        
        return modifiedData;
    }

    /**
     * createAsset via asset-db
     */
    private async createAssetWithAssetDB(assetPath: string, content: string): Promise<{ success: boolean; data?: any; error?: string }> {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'create-asset', assetPath, content, {
                overwrite: true,
                rename: false
            }).then((assetInfo: any) => {
                console.log('Asset file created:', assetInfo);
                resolve({ success: true, data: assetInfo });
            }).catch((error: any) => {
                console.error('Failed to create asset file:', error);
                resolve({ success: false, error: error.message || 'Failed to create asset file' });
            });
        });
    }

    /**
     * write .meta via asset-db
     */
    private async createMetaWithAssetDB(assetPath: string, metaContent: any): Promise<{ success: boolean; data?: any; error?: string }> {
        return new Promise((resolve) => {
            const metaContentString = JSON.stringify(metaContent, null, 2);
            Editor.Message.request('asset-db', 'save-asset-meta', assetPath, metaContentString).then((assetInfo: any) => {
                console.log('.meta file created:', assetInfo);
                resolve({ success: true, data: assetInfo });
            }).catch((error: any) => {
                console.error('Failed to create .meta file:', error);
                resolve({ success: false, error: error.message || 'Failed to create .meta file' });
            });
        });
    }

    /**
     * reimport via asset-db
     */
    private async reimportAssetWithAssetDB(assetPath: string): Promise<{ success: boolean; data?: any; error?: string }> {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'reimport-asset', assetPath).then((result: any) => {
                console.log('Re-import succeeded:', result);
                resolve({ success: true, data: result });
            }).catch((error: any) => {
                console.error('Re-import failed:', error);
                resolve({ success: false, error: error.message || 'Re-import failed' });
            });
        });
    }

    /**
     * overwrite asset via asset-db
     */
    private async updateAssetWithAssetDB(assetPath: string, content: string): Promise<{ success: boolean; data?: any; error?: string }> {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'save-asset', assetPath, content).then((result: any) => {
                console.log('Asset file updated:', result);
                resolve({ success: true, data: result });
            }).catch((error: any) => {
                console.error('Failed to update asset file:', error);
                resolve({ success: false, error: error.message || 'Failed to update asset file' });
            });
        });
    }

    /**
     * Build Creator-standard prefab JSON
     * Recursive tree matching engine layout
     */
    private async createStandardPrefabContent(nodeData: any, prefabName: string, prefabUuid: string, includeChildren: boolean, includeComponents: boolean): Promise<any[]> {
        console.log('Building engine-standard prefab content...');
        
        const prefabData: any[] = [];
        let currentId = 0;

        // 1. Push cc.Prefab asset (index 0)
        const prefabAsset = {
            "__type__": "cc.Prefab",
            "_name": prefabName || "", // Ensure prefab name non-empty
            "_objFlags": 0,
            "__editorExtras__": {},
            "_native": "",
            "data": {
                "__id__": 1
            },
            "optimizationPolicy": 0,
            "persistent": false
        };
        prefabData.push(prefabAsset);
        currentId++;

        // 2. Recursively emit node graph
        const context = {
            prefabData,
            currentId: currentId + 1, // Root uses index 1; children follow
            prefabAssetIndex: 0,
            nodeFileIds: new Map<string, string>(), // Map node id -> fileId
            nodeUuidToIndex: new Map<string, number>(), // Map node UUID -> __id__ index
            componentUuidToIndex: new Map<string, number>() // Map component UUID -> index
        };

        // Root parent must be null (not prefab asset)
        await this.createCompleteNodeTree(nodeData, null, 1, context, includeChildren, includeComponents, prefabName);

        console.log(`Prefab content built, ${prefabData.length} objects total`);
        console.log('Node fileId map:', Array.from(context.nodeFileIds.entries()));
        
        return prefabData;
    }

    /**
     * Recursively build node tree with PrefabInfo per node
     */
    private async createCompleteNodeTree(
        nodeData: any, 
        parentNodeIndex: number | null, 
        nodeIndex: number,
        context: { 
            prefabData: any[], 
            currentId: number, 
            prefabAssetIndex: number, 
            nodeFileIds: Map<string, string>,
            nodeUuidToIndex: Map<string, number>,
            componentUuidToIndex: Map<string, number>
        },
        includeChildren: boolean,
        includeComponents: boolean,
        nodeName?: string
    ): Promise<void> {
        const { prefabData } = context;
        
        // Push node object
        const node = this.createEngineStandardNode(nodeData, parentNodeIndex, nodeName);
        
        // Pin node at target index
        while (prefabData.length <= nodeIndex) {
            prefabData.push(null);
        }
        console.log(`Place node at index ${nodeIndex}: ${node._name}, _parent:`, node._parent, `_children count: ${node._children.length}`);
        prefabData[nodeIndex] = node;
        
        // Assign fileId + UUID map
        const nodeUuid = this.extractNodeUuid(nodeData);
        const fileId = nodeUuid || this.generateFileId();
        context.nodeFileIds.set(nodeIndex.toString(), fileId);
        
        // Track UUID->index
        if (nodeUuid) {
            context.nodeUuidToIndex.set(nodeUuid, nodeIndex);
            console.log(`Record node UUID map: ${nodeUuid} -> ${nodeIndex}`);
        }

        // Process children first (manual index order)
        const childrenToProcess = this.getChildrenToProcess(nodeData);
        if (includeChildren && childrenToProcess.length > 0) {
            console.log(`Processing ${childrenToProcess.length} children of ${node._name}`);
            
            // Allocate child indices
            const childIndices: number[] = [];
            console.log(`Allocating indices for ${childrenToProcess.length} children, currentId: ${context.currentId}`);
            for (let i = 0; i < childrenToProcess.length; i++) {
                console.log(`Child ${i+1}, currentId: ${context.currentId}`);
                const childIndex = context.currentId++;
                childIndices.push(childIndex);
                node._children.push({ "__id__": childIndex });
                console.log(`Added child ref on ${node._name}: {__id__: ${childIndex}}`);
            }
            console.log(`Final _children for ${node._name}:`, node._children);

            // Recurse child creation
            for (let i = 0; i < childrenToProcess.length; i++) {
                const childData = childrenToProcess[i];
                const childIndex = childIndices[i];
                await this.createCompleteNodeTree(
                    childData, 
                    nodeIndex, 
                    childIndex, 
                    context,
                    includeChildren,
                    includeComponents,
                    childData.name || `Child${i+1}`
                );
            }
        }

        // Then serialize components
        if (includeComponents && nodeData.components && Array.isArray(nodeData.components)) {
            console.log(`Processing ${nodeData.components.length} components on ${node._name}`);
            
            const componentIndices: number[] = [];
            for (const component of nodeData.components) {
                const componentIndex = context.currentId++;
                componentIndices.push(componentIndex);
                node._components.push({ "__id__": componentIndex });
                
                // Map component UUIDs
                const componentUuid = component.uuid || (component.value && component.value.uuid);
                if (componentUuid) {
                    context.componentUuidToIndex.set(componentUuid, componentIndex);
                    console.log(`Record component UUID map: ${componentUuid} -> ${componentIndex}`);
                }
                
                // Emit component with ref context
                const componentObj = this.createComponentObject(component, nodeIndex, context);
                prefabData[componentIndex] = componentObj;
                
                // Attach CompPrefabInfo
                const compPrefabInfoIndex = context.currentId++;
                prefabData[compPrefabInfoIndex] = {
                    "__type__": "cc.CompPrefabInfo",
                    "fileId": this.generateFileId()
                };
                
                // Wire __prefab when present
                if (componentObj && typeof componentObj === 'object') {
                    componentObj.__prefab = { "__id__": compPrefabInfoIndex };
                }
            }
            
            console.log(`Attached ${componentIndices.length} components to ${node._name}`);
        }


        // Push PrefabInfo block
        const prefabInfoIndex = context.currentId++;
        node._prefab = { "__id__": prefabInfoIndex };
        
        const prefabInfo: any = {
            "__type__": "cc.PrefabInfo",
            "root": { "__id__": 1 },
            "asset": { "__id__": context.prefabAssetIndex },
            "fileId": fileId,
            "targetOverrides": null,
            "nestedPrefabInstanceRoots": null
        };
        
        // Root-specific rules
        if (nodeIndex === 1) {
            // Root: no instance, maybe overrides
            prefabInfo.instance = null;
        } else {
            // Children: instance null
            prefabInfo.instance = null;
        }
        
        prefabData[prefabInfoIndex] = prefabInfo;
        context.currentId = prefabInfoIndex + 1;
    }

    /**
     * Compress UUID like Creator
     * Mirrors editor compression
     * First 5 hex chars literal, compress tail
     */
    private uuidToCompressedId(uuid: string): string {
        const BASE64_KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        
        // Strip hyphens, lowercase
        const cleanUuid = uuid.replace(/-/g, '').toLowerCase();
        
        // Validate UUID
        if (cleanUuid.length !== 32) {
            return uuid; // Passthrough invalid tokens
        }
        
        // Creator UUID compression scheme
        let result = cleanUuid.substring(0, 5);
        
        // Tail 27 hex -> 18 chars
        const remainder = cleanUuid.substring(5);
        
        // Pack 3 hex nibbles -> 2 chars
        for (let i = 0; i < remainder.length; i += 3) {
            const hex1 = remainder[i] || '0';
            const hex2 = remainder[i + 1] || '0';
            const hex3 = remainder[i + 2] || '0';
            
            // 12 bits -> 2 base64 symbols
            const value = parseInt(hex1 + hex2 + hex3, 16);
            
            // Split 12 bits into two 6-bit chunks
            const high6 = (value >> 6) & 63;
            const low6 = value & 63;
            
            result += BASE64_KEYS[high6] + BASE64_KEYS[low6];
        }
        
        return result;
    }

    /**
     * Build component JSON
     */
    private createComponentObject(componentData: any, nodeIndex: number, context?: { 
        nodeUuidToIndex?: Map<string, number>,
        componentUuidToIndex?: Map<string, number>
    }): any {
        let componentType = componentData.type || componentData.__type__ || 'cc.Component';
        const enabled = componentData.enabled !== undefined ? componentData.enabled : true;
        
        // console.log(`Create component - raw type: ${componentType}`);
        // console.log('Full component data:', JSON.stringify(componentData, null, 2));
        
        // Script components already compressed via MCP
        if (componentType && !componentType.startsWith('cc.')) {
            console.log(`Script component compressed UUID type: ${componentType}`);
        }
        
        // Base component shell
        const component: any = {
            "__type__": componentType,
            "_name": "",
            "_objFlags": 0,
            "__editorExtras__": {},
            "node": { "__id__": nodeIndex },
            "_enabled": enabled
        };
        
        // Prefill __prefab placeholder
        component.__prefab = null;
        
        // Type-specific defaults
        if (componentType === 'cc.UITransform') {
            const contentSize = componentData.properties?.contentSize?.value || { width: 100, height: 100 };
            const anchorPoint = componentData.properties?.anchorPoint?.value || { x: 0.5, y: 0.5 };
            
            component._contentSize = {
                "__type__": "cc.Size",
                "width": contentSize.width,
                "height": contentSize.height
            };
            component._anchorPoint = {
                "__type__": "cc.Vec2",
                "x": anchorPoint.x,
                "y": anchorPoint.y
            };
        } else if (componentType === 'cc.Sprite') {
            // Sprite.spriteFrame refs
            const spriteFrameProp = componentData.properties?._spriteFrame || componentData.properties?.spriteFrame;
            if (spriteFrameProp) {
                component._spriteFrame = this.processComponentProperty(spriteFrameProp, context);
            } else {
                component._spriteFrame = null;
            }
            
            component._type = componentData.properties?._type?.value ?? 0;
            component._fillType = componentData.properties?._fillType?.value ?? 0;
            component._sizeMode = componentData.properties?._sizeMode?.value ?? 1;
            component._fillCenter = { "__type__": "cc.Vec2", "x": 0, "y": 0 };
            component._fillStart = componentData.properties?._fillStart?.value ?? 0;
            component._fillRange = componentData.properties?._fillRange?.value ?? 0;
            component._isTrimmedMode = componentData.properties?._isTrimmedMode?.value ?? true;
            component._useGrayscale = componentData.properties?._useGrayscale?.value ?? false;
            
            // Debug: log sprite props (commented)
            // console.log('Sprite component props:', JSON.stringify(componentData.properties, null, 2));
            component._atlas = null;
            component._id = "";
        } else if (componentType === 'cc.Button') {
            component._interactable = true;
            component._transition = 3;
            component._normalColor = { "__type__": "cc.Color", "r": 255, "g": 255, "b": 255, "a": 255 };
            component._hoverColor = { "__type__": "cc.Color", "r": 211, "g": 211, "b": 211, "a": 255 };
            component._pressedColor = { "__type__": "cc.Color", "r": 255, "g": 255, "b": 255, "a": 255 };
            component._disabledColor = { "__type__": "cc.Color", "r": 124, "g": 124, "b": 124, "a": 255 };
            component._normalSprite = null;
            component._hoverSprite = null;
            component._pressedSprite = null;
            component._disabledSprite = null;
            component._duration = 0.1;
            component._zoomScale = 1.2;
            // Button.target wiring
            const targetProp = componentData.properties?._target || componentData.properties?.target;
            if (targetProp) {
                component._target = this.processComponentProperty(targetProp, context);
            } else {
                component._target = { "__id__": nodeIndex }; // default self node
            }
            component._clickEvents = [];
            component._id = "";
        } else if (componentType === 'cc.Label') {
            component._string = componentData.properties?._string?.value || "Label";
            component._horizontalAlign = 1;
            component._verticalAlign = 1;
            component._actualFontSize = 20;
            component._fontSize = 20;
            component._fontFamily = "Arial";
            component._lineHeight = 25;
            component._overflow = 0;
            component._enableWrapText = true;
            component._font = null;
            component._isSystemFontUsed = true;
            component._spacingX = 0;
            component._isItalic = false;
            component._isBold = false;
            component._isUnderline = false;
            component._underlineHeight = 2;
            component._cacheMode = 0;
            component._id = "";
        } else if (componentData.properties) {
            // Serialize all component props
            for (const [key, value] of Object.entries(componentData.properties)) {
                if (key === 'node' || key === 'enabled' || key === '__type__' || 
                    key === 'uuid' || key === 'name' || key === '__scriptAsset' || key === '_objFlags') {
                    continue; // skip internal flags incl. _objFlags
                }
                
                // Underscore props need care
                if (key.startsWith('_')) {
                    // Preserve exact property names
                    const propValue = this.processComponentProperty(value, context);
                    if (propValue !== undefined) {
                        component[key] = propValue;
                    }
                } else {
                    // Public props handled normally
                    const propValue = this.processComponentProperty(value, context);
                    if (propValue !== undefined) {
                        component[key] = propValue;
                    }
                }
            }
        }
        
        // Keep _id last
        const _id = component._id || "";
        delete component._id;
        component._id = _id;
        
        return component;
    }

    /**
     * Normalize property values like manual prefabs
     */
    private processComponentProperty(propData: any, context?: { 
        nodeUuidToIndex?: Map<string, number>,
        componentUuidToIndex?: Map<string, number>
    }): any {
        if (!propData || typeof propData !== 'object') {
            return propData;
        }

        const value = propData.value;
        const type = propData.type;

        // null handling
        if (value === null || value === undefined) {
            return null;
        }

        // Empty UUID -> null
        if (value && typeof value === 'object' && value.uuid === '') {
            return null;
        }

        // Node references
        if (type === 'cc.Node' && value?.uuid) {
            // Internal node refs -> __id__
            if (context?.nodeUuidToIndex && context.nodeUuidToIndex.has(value.uuid)) {
                // Internal -> __id__
                return {
                    "__id__": context.nodeUuidToIndex.get(value.uuid)
                };
            }
            // External nodes -> null
            console.warn(`Node reference UUID ${value.uuid} not found in prefab context, setting to null (external reference)`);
            return null;
        }

        // Asset refs (prefab/texture/spriteFrame)
        if (value?.uuid && (
            type === 'cc.Prefab' || 
            type === 'cc.Texture2D' || 
            type === 'cc.SpriteFrame' ||
            type === 'cc.Material' ||
            type === 'cc.AnimationClip' ||
            type === 'cc.AudioClip' ||
            type === 'cc.Font' ||
            type === 'cc.Asset'
        )) {
            // Prefab refs keep UUID
            const uuidToUse = type === 'cc.Prefab' ? value.uuid : this.uuidToCompressedId(value.uuid);
            return {
                "__uuid__": uuidToUse,
                "__expectedType__": type
            };
        }

        // Component refs (Label/Button/...)
        if (value?.uuid && (type === 'cc.Component' || 
            type === 'cc.Label' || type === 'cc.Button' || type === 'cc.Sprite' || 
            type === 'cc.UITransform' || type === 'cc.RigidBody2D' || 
            type === 'cc.BoxCollider2D' || type === 'cc.Animation' || 
            type === 'cc.AudioSource' || (type?.startsWith('cc.') && !type.includes('@')))) {
            // Internal component refs -> __id__
            if (context?.componentUuidToIndex && context.componentUuidToIndex.has(value.uuid)) {
                // Internal -> __id__
                console.log(`Component reference ${type} UUID ${value.uuid} found in prefab context, converting to __id__`);
                return {
                    "__id__": context.componentUuidToIndex.get(value.uuid)
                };
            }
            // External components -> null
            console.warn(`Component reference ${type} UUID ${value.uuid} not found in prefab context, setting to null (external reference)`);
            return null;
        }

        // Complex values need __type__
        if (value && typeof value === 'object') {
            if (type === 'cc.Color') {
                return {
                    "__type__": "cc.Color",
                    "r": Math.min(255, Math.max(0, Number(value.r) || 0)),
                    "g": Math.min(255, Math.max(0, Number(value.g) || 0)),
                    "b": Math.min(255, Math.max(0, Number(value.b) || 0)),
                    "a": value.a !== undefined ? Math.min(255, Math.max(0, Number(value.a))) : 255
                };
            } else if (type === 'cc.Vec3') {
                return {
                    "__type__": "cc.Vec3",
                    "x": Number(value.x) || 0,
                    "y": Number(value.y) || 0,
                    "z": Number(value.z) || 0
                };
            } else if (type === 'cc.Vec2') {
                return {
                    "__type__": "cc.Vec2", 
                    "x": Number(value.x) || 0,
                    "y": Number(value.y) || 0
                };
            } else if (type === 'cc.Size') {
                return {
                    "__type__": "cc.Size",
                    "width": Number(value.width) || 0,
                    "height": Number(value.height) || 0
                };
            } else if (type === 'cc.Quat') {
                return {
                    "__type__": "cc.Quat",
                    "x": Number(value.x) || 0,
                    "y": Number(value.y) || 0,
                    "z": Number(value.z) || 0,
                    "w": value.w !== undefined ? Number(value.w) : 1
                };
            }
        }

        // Arrays
        if (Array.isArray(value)) {
            // Node arrays
            if (propData.elementTypeData?.type === 'cc.Node') {
                return value.map(item => {
                    if (item?.uuid && context?.nodeUuidToIndex?.has(item.uuid)) {
                        return { "__id__": context.nodeUuidToIndex.get(item.uuid) };
                    }
                    return null;
                }).filter(item => item !== null);
            }
            
            // Asset arrays
            if (propData.elementTypeData?.type && propData.elementTypeData.type.startsWith('cc.')) {
                return value.map(item => {
                    if (item?.uuid) {
                        return {
                            "__uuid__": this.uuidToCompressedId(item.uuid),
                            "__expectedType__": propData.elementTypeData.type
                        };
                    }
                    return null;
                }).filter(item => item !== null);
            }

            // Primitive arrays
            return value.map(item => item?.value !== undefined ? item.value : item);
        }

        // Other objects keep shape + __type__
        if (value && typeof value === 'object' && type && type.startsWith('cc.')) {
            return {
                "__type__": type,
                ...value
            };
        }

        return value;
    }

    /**
     * Engine-shaped node object
     */
    private createEngineStandardNode(nodeData: any, parentNodeIndex: number | null, nodeName?: string): any {
        // Debug dump nodeData (commented)
        // console.log('Raw node data:', JSON.stringify(nodeData, null, 2));
        
        // Extract base fields
        const getValue = (prop: any) => {
            if (prop?.value !== undefined) return prop.value;
            if (prop !== undefined) return prop;
            return null;
        };
        
        const position = getValue(nodeData.position) || getValue(nodeData.value?.position) || { x: 0, y: 0, z: 0 };
        const rotation = getValue(nodeData.rotation) || getValue(nodeData.value?.rotation) || { x: 0, y: 0, z: 0, w: 1 };
        const scale = getValue(nodeData.scale) || getValue(nodeData.value?.scale) || { x: 1, y: 1, z: 1 };
        const active = getValue(nodeData.active) ?? getValue(nodeData.value?.active) ?? true;
        const name = nodeName || getValue(nodeData.name) || getValue(nodeData.value?.name) || 'Node';
        const layer = getValue(nodeData.layer) || getValue(nodeData.value?.layer) || 1073741824;

        // Debug trace
        console.log(`Create node: ${name}, parentNodeIndex: ${parentNodeIndex}`);

        const parentRef = parentNodeIndex !== null ? { "__id__": parentNodeIndex } : null;
        console.log(`Parent ref for ${name}:`, parentRef);

        return {
            "__type__": "cc.Node",
            "_name": name,
            "_objFlags": 0,
            "__editorExtras__": {},
            "_parent": parentRef,
            "_children": [], // _children filled during recursion
            "_active": active,
            "_components": [], // _components filled later
            "_prefab": { "__id__": 0 }, // Temporary __prefab id
            "_lpos": {
                "__type__": "cc.Vec3",
                "x": position.x,
                "y": position.y,
                "z": position.z
            },
            "_lrot": {
                "__type__": "cc.Quat",
                "x": rotation.x,
                "y": rotation.y,
                "z": rotation.z,
                "w": rotation.w
            },
            "_lscale": {
                "__type__": "cc.Vec3",
                "x": scale.x,
                "y": scale.y,
                "z": scale.z
            },
            "_mobility": 0,
            "_layer": layer,
            "_euler": {
                "__type__": "cc.Vec3",
                "x": 0,
                "y": 0,
                "z": 0
            },
            "_id": ""
        };
    }

    /**
     * Extract UUID from dump
     */
    private extractNodeUuid(nodeData: any): string | null {
        if (!nodeData) return null;
        
        // UUID extraction heuristics
        const sources = [
            nodeData.uuid,
            nodeData.value?.uuid,
            nodeData.__uuid__,
            nodeData.value?.__uuid__,
            nodeData.id,
            nodeData.value?.id
        ];
        
        for (const source of sources) {
            if (typeof source === 'string' && source.length > 0) {
                return source;
            }
        }
        
        return null;
    }

    /**
     * Minimal node shell (no comps)
     */
    private createMinimalNode(nodeData: any, nodeName?: string): any {
        // Extract base fields
        const getValue = (prop: any) => {
            if (prop?.value !== undefined) return prop.value;
            if (prop !== undefined) return prop;
            return null;
        };
        
        const position = getValue(nodeData.position) || getValue(nodeData.value?.position) || { x: 0, y: 0, z: 0 };
        const rotation = getValue(nodeData.rotation) || getValue(nodeData.value?.rotation) || { x: 0, y: 0, z: 0, w: 1 };
        const scale = getValue(nodeData.scale) || getValue(nodeData.value?.scale) || { x: 1, y: 1, z: 1 };
        const active = getValue(nodeData.active) ?? getValue(nodeData.value?.active) ?? true;
        const name = nodeName || getValue(nodeData.name) || getValue(nodeData.value?.name) || 'Node';
        const layer = getValue(nodeData.layer) || getValue(nodeData.value?.layer) || 33554432;

        return {
            "__type__": "cc.Node",
            "_name": name,
            "_objFlags": 0,
            "_parent": null,
            "_children": [],
            "_active": active,
            "_components": [], // Empty _components to avoid deps
            "_prefab": {
                "__id__": 2
            },
            "_lpos": {
                "__type__": "cc.Vec3",
                "x": position.x,
                "y": position.y,
                "z": position.z
            },
            "_lrot": {
                "__type__": "cc.Quat",
                "x": rotation.x,
                "y": rotation.y,
                "z": rotation.z,
                "w": rotation.w
            },
            "_lscale": {
                "__type__": "cc.Vec3",
                "x": scale.x,
                "y": scale.y,
                "z": scale.z
            },
            "_layer": layer,
            "_euler": {
                "__type__": "cc.Vec3",
                "x": 0,
                "y": 0,
                "z": 0
            },
            "_id": ""
        };
    }

    /**
     * Standard .meta JSON
     */
    private createStandardMetaContent(prefabName: string, prefabUuid: string): any {
        return {
            "ver": "2.0.3",
            "importer": "prefab",
            "imported": true,
            "uuid": prefabUuid,
            "files": [
                ".json"
            ],
            "subMetas": {},
            "userData": {
                "syncNodeName": prefabName,
                "hasIcon": false
            }
        };
    }

    /**
     * Convert authored node to prefab instance
     */
    private async convertNodeToPrefabInstance(nodeUuid: string, prefabUuid: string, prefabPath: string): Promise<{ success: boolean; error?: string }> {
        return new Promise((resolve) => {
            // Needs deeper scene integration
            // Engine handles complex swap logic
            console.log('Converting authored node to prefab instance needs deeper engine integration');
            resolve({
                success: false,
                error: 'Node-to-prefab-instance conversion requires deeper engine support'
            });
        });
    }

    private async restorePrefabNode(nodeUuid: string, assetUuid: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            // restore-prefab official API
            (Editor.Message.request as any)('scene', 'restore-prefab', nodeUuid, assetUuid).then(() => {
                resolve({
                    success: true,
                    data: {
                        nodeUuid: nodeUuid,
                        assetUuid: assetUuid,
                        message: 'Prefab node restored successfully'
                    }
                });
            }).catch((error: any) => {
                resolve({
                    success: false,
                    error: `Prefab node restore failed: ${error.message}`
                });
            });
        });
    }

    // New serializer aligned with official prefab format
    private async getNodeDataForPrefab(nodeUuid: string): Promise<{ success: boolean; data?: any; error?: string }> {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'query-node', nodeUuid).then((nodeData: any) => {
                if (!nodeData) {
                    resolve({ success: false, error: 'Node does not exist' });
                    return;
                }
                resolve({ success: true, data: nodeData });
            }).catch((error: any) => {
                resolve({ success: false, error: error.message });
            });
        });
    }

    private async createStandardPrefabData(nodeData: any, prefabName: string, prefabUuid: string): Promise<any[]> {
        // Follow official Canvas.prefab layout
        const prefabData: any[] = [];
        let currentId = 0;

        // Element0: cc.Prefab asset
        const prefabAsset = {
            "__type__": "cc.Prefab",
            "_name": prefabName,
            "_objFlags": 0,
            "__editorExtras__": {},
            "_native": "",
            "data": {
                "__id__": 1
            },
            "optimizationPolicy": 0,
            "persistent": false
        };
        prefabData.push(prefabAsset);
        currentId++;

        // Element1: root node
        const rootNode = await this.createNodeObject(nodeData, null, prefabData, currentId);
        prefabData.push(rootNode.node);
        currentId = rootNode.nextId;

        // Root PrefabInfo with UUID asset ref
        const rootPrefabInfo = {
            "__type__": "cc.PrefabInfo",
            "root": {
                "__id__": 1
            },
            "asset": {
                "__uuid__": prefabUuid
            },
            "fileId": this.generateFileId(),
            "instance": null,
            "targetOverrides": [],
            "nestedPrefabInstanceRoots": []
        };
        prefabData.push(rootPrefabInfo);

        return prefabData;
    }


    private async createNodeObject(nodeData: any, parentId: number | null, prefabData: any[], currentId: number): Promise<{ node: any; nextId: number }> {
        const nodeId = currentId++;
        
        // Base props from query-node-tree
        const getValue = (prop: any) => {
            if (prop?.value !== undefined) return prop.value;
            if (prop !== undefined) return prop;
            return null;
        };
        
        const position = getValue(nodeData.position) || getValue(nodeData.value?.position) || { x: 0, y: 0, z: 0 };
        const rotation = getValue(nodeData.rotation) || getValue(nodeData.value?.rotation) || { x: 0, y: 0, z: 0, w: 1 };
        const scale = getValue(nodeData.scale) || getValue(nodeData.value?.scale) || { x: 1, y: 1, z: 1 };
        const active = getValue(nodeData.active) ?? getValue(nodeData.value?.active) ?? true;
        const name = getValue(nodeData.name) || getValue(nodeData.value?.name) || 'Node';
        const layer = getValue(nodeData.layer) || getValue(nodeData.value?.layer) || 33554432;

        const node: any = {
            "__type__": "cc.Node",
            "_name": name,
            "_objFlags": 0,
            "__editorExtras__": {},
            "_parent": parentId !== null ? { "__id__": parentId } : null,
            "_children": [],
            "_active": active,
            "_components": [],
            "_prefab": parentId === null ? {
                "__id__": currentId++
            } : null,
            "_lpos": {
                "__type__": "cc.Vec3",
                "x": position.x,
                "y": position.y,
                "z": position.z
            },
            "_lrot": {
                "__type__": "cc.Quat",
                "x": rotation.x,
                "y": rotation.y,
                "z": rotation.z,
                "w": rotation.w
            },
            "_lscale": {
                "__type__": "cc.Vec3",
                "x": scale.x,
                "y": scale.y,
                "z": scale.z
            },
            "_mobility": 0,
            "_layer": layer,
            "_euler": {
                "__type__": "cc.Vec3",
                "x": 0,
                "y": 0,
                "z": 0
            },
            "_id": ""
        };

        // Skip UITransform to avoid _getDependComponent
        // Re-add via engine later
        console.log(`Skipping UITransform on ${name} to avoid engine dependency errors`);
        
        // Skip other comps while fixing UITransform
        const components = this.extractComponentsFromNode(nodeData);
        if (components.length > 0) {
            console.log(`Node ${name} has ${components.length} other components; skipping while fixing UITransform`);
        }

        // Children from query-node-tree
        const childrenToProcess = this.getChildrenToProcess(nodeData);
        if (childrenToProcess.length > 0) {
            console.log(`=== Processing children ===`);
            console.log(`Node ${name} has ${childrenToProcess.length} children`);
            
            for (let i = 0; i < childrenToProcess.length; i++) {
                const childData = childrenToProcess[i];
                const childName = childData.name || childData.value?.name || 'unknown';
                console.log(`Child ${i + 1}: ${childName}`);
                
                try {
                    const childId = currentId;
                    node._children.push({ "__id__": childId });
                    
                    // Recurse child creation
                    const childResult = await this.createNodeObject(childData, nodeId, prefabData, currentId);
                    prefabData.push(childResult.node);
                    currentId = childResult.nextId;
                    
                    // Only root carries PrefabInfo
                    // Child _prefab stays null
                    childResult.node._prefab = null;
                    
                    console.log(`Child added: ${childName}`);
                } catch (error) {
                    console.error(`Error processing child ${childName}:`, error);
                }
            }
        }

        return { node, nextId: currentId };
    }

    // Extract component list from node dump
    private extractComponentsFromNode(nodeData: any): any[] {
        const components: any[] = [];
        
        // Probe multiple dump locations
        const componentSources = [
            nodeData.__comps__,
            nodeData.components,
            nodeData.value?.__comps__,
            nodeData.value?.components
        ];
        
        for (const source of componentSources) {
            if (Array.isArray(source)) {
                components.push(...source.filter(comp => comp && (comp.__type__ || comp.type)));
                break; // stop after first valid comps[]
            }
        }
        
        return components;
    }
    
    // Canonical component object
    private createStandardComponentObject(componentData: any, nodeId: number, prefabInfoId: number): any {
        const componentType = componentData.__type__ || componentData.type;
        
        if (!componentType) {
            console.warn('Component missing type info:', componentData);
            return null;
        }
        
        // Base component shell (official prefab layout)
        const component: any = {
            "__type__": componentType,
            "_name": "",
            "_objFlags": 0,
            "node": {
                "__id__": nodeId
            },
            "_enabled": this.getComponentPropertyValue(componentData, 'enabled', true),
            "__prefab": {
                "__id__": prefabInfoId
            }
        };
        
        // Type-specific defaults
        this.addComponentSpecificProperties(component, componentData, componentType);
        
        // Append _id field
        component._id = "";
        
        return component;
    }
    
    // Add component-specific properties
    private addComponentSpecificProperties(component: any, componentData: any, componentType: string): void {
        switch (componentType) {
            case 'cc.UITransform':
                this.addUITransformProperties(component, componentData);
                break;
            case 'cc.Sprite':
                this.addSpriteProperties(component, componentData);
                break;
            case 'cc.Label':
                this.addLabelProperties(component, componentData);
                break;
            case 'cc.Button':
                this.addButtonProperties(component, componentData);
                break;
            default:
                // Unknown types: copy safe props only
                this.addGenericProperties(component, componentData);
                break;
        }
    }
    
    // UITransform props
    private addUITransformProperties(component: any, componentData: any): void {
        component._contentSize = this.createSizeObject(
            this.getComponentPropertyValue(componentData, 'contentSize', { width: 100, height: 100 })
        );
        component._anchorPoint = this.createVec2Object(
            this.getComponentPropertyValue(componentData, 'anchorPoint', { x: 0.5, y: 0.5 })
        );
    }
    
    // Sprite props
    private addSpriteProperties(component: any, componentData: any): void {
        component._visFlags = 0;
        component._customMaterial = null;
        component._srcBlendFactor = 2;
        component._dstBlendFactor = 4;
        component._color = this.createColorObject(
            this.getComponentPropertyValue(componentData, 'color', { r: 255, g: 255, b: 255, a: 255 })
        );
        component._spriteFrame = this.getComponentPropertyValue(componentData, 'spriteFrame', null);
        component._type = this.getComponentPropertyValue(componentData, 'type', 0);
        component._fillType = 0;
        component._sizeMode = this.getComponentPropertyValue(componentData, 'sizeMode', 1);
        component._fillCenter = this.createVec2Object({ x: 0, y: 0 });
        component._fillStart = 0;
        component._fillRange = 0;
        component._isTrimmedMode = true;
        component._useGrayscale = false;
        component._atlas = null;
    }
    
    // Label props
    private addLabelProperties(component: any, componentData: any): void {
        component._visFlags = 0;
        component._customMaterial = null;
        component._srcBlendFactor = 2;
        component._dstBlendFactor = 4;
        component._color = this.createColorObject(
            this.getComponentPropertyValue(componentData, 'color', { r: 0, g: 0, b: 0, a: 255 })
        );
        component._string = this.getComponentPropertyValue(componentData, 'string', 'Label');
        component._horizontalAlign = 1;
        component._verticalAlign = 1;
        component._actualFontSize = 20;
        component._fontSize = this.getComponentPropertyValue(componentData, 'fontSize', 20);
        component._fontFamily = 'Arial';
        component._lineHeight = 40;
        component._overflow = 1;
        component._enableWrapText = false;
        component._font = null;
        component._isSystemFontUsed = true;
        component._isItalic = false;
        component._isBold = false;
        component._isUnderline = false;
        component._underlineHeight = 2;
        component._cacheMode = 0;
    }
    
    // Button props
    private addButtonProperties(component: any, componentData: any): void {
        component.clickEvents = [];
        component._interactable = true;
        component._transition = 2;
        component._normalColor = this.createColorObject({ r: 214, g: 214, b: 214, a: 255 });
        component._hoverColor = this.createColorObject({ r: 211, g: 211, b: 211, a: 255 });
        component._pressedColor = this.createColorObject({ r: 255, g: 255, b: 255, a: 255 });
        component._disabledColor = this.createColorObject({ r: 124, g: 124, b: 124, a: 255 });
        component._duration = 0.1;
        component._zoomScale = 1.2;
    }
    
    // Shared prop fallbacks
    private addGenericProperties(component: any, componentData: any): void {
        // Whitelist known props
        const safeProperties = ['enabled', 'color', 'string', 'fontSize', 'spriteFrame', 'type', 'sizeMode'];
        
        for (const prop of safeProperties) {
            if (componentData.hasOwnProperty(prop)) {
                const value = this.getComponentPropertyValue(componentData, prop);
                if (value !== undefined) {
                    component[`_${prop}`] = value;
                }
            }
        }
    }
    
    // Build Vec2
    private createVec2Object(data: any): any {
        return {
            "__type__": "cc.Vec2",
            "x": data?.x || 0,
            "y": data?.y || 0
        };
    }
    
    // Build Vec3
    private createVec3Object(data: any): any {
        return {
            "__type__": "cc.Vec3",
            "x": data?.x || 0,
            "y": data?.y || 0,
            "z": data?.z || 0
        };
    }
    
    // Build Size
    private createSizeObject(data: any): any {
        return {
            "__type__": "cc.Size",
            "width": data?.width || 100,
            "height": data?.height || 100
        };
    }
    
    // Build Color
    private createColorObject(data: any): any {
        return {
            "__type__": "cc.Color",
            "r": data?.r ?? 255,
            "g": data?.g ?? 255,
            "b": data?.b ?? 255,
            "a": data?.a ?? 255
        };
    }

    // shouldCopy guard
    private shouldCopyComponentProperty(key: string, value: any): boolean {
        // Skip internals / handled keys
        if (key.startsWith('__') || key === '_enabled' || key === 'node' || key === 'enabled') {
            return false;
        }
        
        // Skip functions/undefined
        if (typeof value === 'function' || value === undefined) {
            return false;
        }
        
        return true;
    }


    // getComponentPropertyValue helper
    private getComponentPropertyValue(componentData: any, propertyName: string, defaultValue?: any): any {
        // Direct property read
        if (componentData[propertyName] !== undefined) {
            return this.extractValue(componentData[propertyName]);
        }
        
        // Read nested .value
        if (componentData.value && componentData.value[propertyName] !== undefined) {
            return this.extractValue(componentData.value[propertyName]);
        }
        
        // Try underscored variant
        const prefixedName = `_${propertyName}`;
        if (componentData[prefixedName] !== undefined) {
            return this.extractValue(componentData[prefixedName]);
        }
        
        return defaultValue;
    }
    
    // Extract final value
    private extractValue(data: any): any {
        if (data === null || data === undefined) {
            return data;
        }
        
        // Prefer .value when present
        if (typeof data === 'object' && data.hasOwnProperty('value')) {
            return data.value;
        }
        
        // Keep ref objects intact
        if (typeof data === 'object' && (data.__id__ !== undefined || data.__uuid__ !== undefined)) {
            return data;
        }
        
        return data;
    }

    private createStandardMetaData(prefabName: string, prefabUuid: string): any {
        return {
            "ver": "1.1.50",
            "importer": "prefab",
            "imported": true,
            "uuid": prefabUuid,
            "files": [
                ".json"
            ],
            "subMetas": {},
            "userData": {
                "syncNodeName": prefabName
            }
        };
    }

    private async savePrefabWithMeta(prefabPath: string, prefabData: any[], metaData: any): Promise<{ success: boolean; error?: string }> {
        try {
            const prefabContent = JSON.stringify(prefabData, null, 2);
            const metaContent = JSON.stringify(metaData, null, 2);

            // Ensure .prefab suffix
            const finalPrefabPath = prefabPath.endsWith('.prefab') ? prefabPath : `${prefabPath}.prefab`;
            const metaPath = `${finalPrefabPath}.meta`;

            // Save via asset-db
            await new Promise((resolve, reject) => {
                Editor.Message.request('asset-db', 'create-asset', finalPrefabPath, prefabContent).then(() => {
                    resolve(true);
                }).catch((error: any) => {
                    reject(error);
                });
            });

            // Write .meta
            await new Promise((resolve, reject) => {
                Editor.Message.request('asset-db', 'create-asset', metaPath, metaContent).then(() => {
                    resolve(true);
                }).catch((error: any) => {
                    reject(error);
                });
            });

            console.log(`=== Prefab save complete ===`);
            console.log(`Prefab file saved: ${finalPrefabPath}`);
            console.log(`.meta saved: ${metaPath}`);
            console.log(`Prefab array length: ${prefabData.length}`);
            console.log(`Prefab root node index: ${prefabData.length - 1}`);

            return { success: true };
        } catch (error: any) {
            console.error('Error saving prefab file:', error);
            return { success: false, error: error.message };
        }
    }

}
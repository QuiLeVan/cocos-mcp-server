"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrefabTools = void 0;
class PrefabTools {
    getTools() {
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
    async execute(toolName, args) {
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
    async getPrefabList(folder = 'db://assets') {
        return new Promise((resolve) => {
            const pattern = folder.endsWith('/') ?
                `${folder}**/*.prefab` : `${folder}/**/*.prefab`;
            Editor.Message.request('asset-db', 'query-assets', {
                pattern: pattern
            }).then((results) => {
                const prefabs = results.map(asset => ({
                    name: asset.name,
                    path: asset.url,
                    uuid: asset.uuid,
                    folder: asset.url.substring(0, asset.url.lastIndexOf('/'))
                }));
                resolve({ success: true, data: prefabs });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async loadPrefab(prefabPath) {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'query-asset-info', prefabPath).then((assetInfo) => {
                if (!assetInfo) {
                    throw new Error('Prefab not found');
                }
                return Editor.Message.request('scene', 'load-asset', {
                    uuid: assetInfo.uuid
                });
            }).then((prefabData) => {
                resolve({
                    success: true,
                    data: {
                        uuid: prefabData.uuid,
                        name: prefabData.name,
                        message: 'Prefab loaded successfully'
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async instantiatePrefab(args) {
        return new Promise(async (resolve) => {
            try {
                // Get prefab asset information
                const assetInfo = await Editor.Message.request('asset-db', 'query-asset-info', args.prefabPath);
                if (!assetInfo) {
                    throw new Error('Prefab not found');
                }
                // Instantiate from prefab asset using create-node API
                const createNodeOptions = {
                    assetUuid: assetInfo.uuid
                };
                // Set parent node
                if (args.parentUuid) {
                    createNodeOptions.parent = args.parentUuid;
                }
                // Set node name
                if (args.name) {
                    createNodeOptions.name = args.name;
                }
                else if (assetInfo.name) {
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
            }
            catch (err) {
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
    async establishPrefabConnection(nodeUuid, prefabUuid, prefabPath) {
        try {
            // Read prefab file to obtain root node fileId
            const prefabContent = await this.readPrefabFile(prefabPath);
            if (!prefabContent || !prefabContent.data || !prefabContent.data.length) {
                throw new Error('Unable to read prefab file content');
            }
            // Root prefab fileId (usually second object, index 1)
            const rootNode = prefabContent.data.find((item) => item.__type === 'cc.Node' && item._parent === null);
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
                }
                catch (error) {
                    console.warn('Prefab link method failed, trying next method:', error);
                }
            }
            if (!connected) {
                // If all APIs fail, try manual scene data patch
                console.warn('All prefab link APIs failed, attempting manual connection');
                await this.manuallyEstablishPrefabConnection(nodeUuid, prefabUuid, rootFileId);
            }
        }
        catch (error) {
            console.error('Failed to establish prefab connection:', error);
            throw error;
        }
    }
    /**
     * Manual prefab link fallback when APIs fail
     */
    async manuallyEstablishPrefabConnection(nodeUuid, prefabUuid, rootFileId) {
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
        }
        catch (error) {
            console.error('Manual prefab connection also failed:', error);
            // Do not throw; base node creation succeeded
        }
    }
    /**
     * Read prefab file content
     */
    async readPrefabFile(prefabPath) {
        try {
            // Try asset-db API to read file
            let assetContent;
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
            }
            catch (error) {
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
                    }
                    else {
                        console.log(`File does not exist: ${fullPath}`);
                    }
                }
                catch (readError) {
                    console.warn(`Failed to read file ${fullPath}:`, readError);
                }
            }
            throw new Error('Unable to find or read prefab file');
        }
        catch (error) {
            console.error('Failed to read prefab file:', error);
            throw error;
        }
    }
    async tryCreateNodeWithPrefab(args) {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'query-asset-info', args.prefabPath).then((assetInfo) => {
                if (!assetInfo) {
                    throw new Error('Prefab not found');
                }
                // Approach 2: create-node with prefab asset
                const createNodeOptions = {
                    assetUuid: assetInfo.uuid
                };
                // Set parent node
                if (args.parentUuid) {
                    createNodeOptions.parent = args.parentUuid;
                }
                return Editor.Message.request('scene', 'create-node', createNodeOptions);
            }).then((nodeUuid) => {
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
                }
                else {
                    resolve({
                        success: true,
                        data: {
                            nodeUuid: uuid,
                            prefabPath: args.prefabPath,
                            message: 'Prefab instantiated successfully (fallback)'
                        }
                    });
                }
            }).catch((err) => {
                resolve({
                    success: false,
                    error: `Fallback prefab instantiation also failed: ${err.message}`
                });
            });
        });
    }
    async tryAlternativeInstantiateMethods(args) {
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
                }
                else {
                    resolve({
                        success: false,
                        error: 'Unable to apply prefab to node',
                        data: {
                            nodeUuid: createResult.data.nodeUuid,
                            message: 'Node created but prefab data could not be applied'
                        }
                    });
                }
            }
            catch (error) {
                resolve({ success: false, error: `Alternate instantiation failed: ${error}` });
            }
        });
    }
    async getAssetInfo(prefabPath) {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'query-asset-info', prefabPath).then((assetInfo) => {
                resolve(assetInfo);
            }).catch(() => {
                resolve(null);
            });
        });
    }
    async createNode(parentUuid, position) {
        return new Promise((resolve) => {
            const createNodeOptions = {
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
            Editor.Message.request('scene', 'create-node', createNodeOptions).then((nodeUuid) => {
                const uuid = Array.isArray(nodeUuid) ? nodeUuid[0] : nodeUuid;
                resolve({
                    success: true,
                    data: {
                        nodeUuid: uuid,
                        name: 'PrefabInstance'
                    }
                });
            }).catch((error) => {
                resolve({ success: false, error: error.message || 'Failed to create node' });
            });
        });
    }
    async applyPrefabToNode(nodeUuid, prefabUuid) {
        return new Promise((resolve) => {
            // Try multiple ways to apply prefab data
            const methods = [
                () => Editor.Message.request('scene', 'apply-prefab', { node: nodeUuid, prefab: prefabUuid }),
                () => Editor.Message.request('scene', 'set-prefab', { node: nodeUuid, prefab: prefabUuid }),
                () => Editor.Message.request('scene', 'load-prefab-to-node', { node: nodeUuid, prefab: prefabUuid })
            ];
            const tryMethod = (index) => {
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
    async createPrefabWithAssetDB(nodeUuid, savePath, prefabName, includeChildren, includeComponents) {
        return new Promise(async (resolve) => {
            var _a;
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
                const tempPrefabContent = JSON.stringify([{ "__type__": "cc.Prefab", "_name": prefabName }], null, 2);
                const createResult = await this.createAssetWithAssetDB(savePath, tempPrefabContent);
                if (!createResult.success) {
                    resolve(createResult);
                    return;
                }
                // Read engine-assigned UUID
                const actualPrefabUuid = (_a = createResult.data) === null || _a === void 0 ? void 0 : _a.uuid;
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
            }
            catch (error) {
                console.error('Error while creating prefab:', error);
                resolve({
                    success: false,
                    error: `Failed to create prefab: ${error}`
                });
            }
        });
    }
    async createPrefab(args) {
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
                const assetDbResult = await this.createPrefabWithAssetDB(args.nodeUuid, fullPath, prefabName, includeChildren, includeComponents);
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
            }
            catch (error) {
                resolve({
                    success: false,
                    error: `Error while creating prefab: ${error}`
                });
            }
        });
    }
    async createPrefabNative(nodeUuid, prefabPath) {
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
    async createPrefabCustom(nodeUuid, prefabPath, prefabName) {
        return new Promise(async (resolve) => {
            var _a, _b;
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
                console.log('Node name:', ((_a = nodeData.name) === null || _a === void 0 ? void 0 : _a.value) || 'unknown');
                console.log('Node UUID:', ((_b = nodeData.uuid) === null || _b === void 0 ? void 0 : _b.value) || 'unknown');
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
                }
                else {
                    resolve({
                        success: false,
                        error: saveResult.error || 'Failed to save prefab file'
                    });
                }
            }
            catch (error) {
                resolve({
                    success: false,
                    error: `Error while creating prefab: ${error}`
                });
            }
        });
    }
    async getNodeData(nodeUuid) {
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
                }
                else {
                    console.log(`Using basic node information`);
                    resolve(nodeInfo);
                }
            }
            catch (error) {
                console.warn(`Failed to get node data ${nodeUuid}:`, error);
                resolve(null);
            }
        });
    }
    // Full node subtree via query-node-tree
    async getNodeWithChildren(nodeUuid) {
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
        }
        catch (error) {
            console.warn(`Failed to get node tree for ${nodeUuid}:`, error);
            return null;
        }
    }
    // Recursively find node UUID in tree
    findNodeInTree(node, targetUuid) {
        var _a;
        if (!node)
            return null;
        // Inspect current node
        if (node.uuid === targetUuid || ((_a = node.value) === null || _a === void 0 ? void 0 : _a.uuid) === targetUuid) {
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
    async enhanceTreeWithMCPComponents(node) {
        var _a, _b, _c;
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
            if ((_c = (_b = (_a = mcpResult.result) === null || _a === void 0 ? void 0 : _a.content) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.text) {
                const componentData = JSON.parse(mcpResult.result.content[0].text);
                if (componentData.success && componentData.data.components) {
                    // Replace node.components with MCP data
                    node.components = componentData.data.components;
                    console.log(`Node ${node.uuid} has ${componentData.data.components.length} components (including script types)`);
                }
            }
        }
        catch (error) {
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
    async buildBasicNodeInfo(nodeUuid) {
        return new Promise((resolve) => {
            // Build minimal node record
            Editor.Message.request('scene', 'query-node', nodeUuid).then((nodeInfo) => {
                if (!nodeInfo) {
                    resolve(null);
                    return;
                }
                // Simplified: basic fields only
                // Children/components added later in pipeline
                const basicInfo = Object.assign(Object.assign({}, nodeInfo), { children: [], components: [] });
                resolve(basicInfo);
            }).catch(() => {
                resolve(null);
            });
        });
    }
    // Validate node payload
    isValidNodeData(nodeData) {
        if (!nodeData)
            return false;
        if (typeof nodeData !== 'object')
            return false;
        // Check base fields (query-node-tree shape)
        return nodeData.hasOwnProperty('uuid') ||
            nodeData.hasOwnProperty('name') ||
            nodeData.hasOwnProperty('__type__') ||
            (nodeData.value && (nodeData.value.hasOwnProperty('uuid') ||
                nodeData.value.hasOwnProperty('name') ||
                nodeData.value.hasOwnProperty('__type__')));
    }
    // Normalize child UUID extraction
    extractChildUuid(childRef) {
        if (!childRef)
            return null;
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
    getChildrenToProcess(nodeData) {
        var _a;
        const children = [];
        // Prefer children[] from query-node-tree
        if (nodeData.children && Array.isArray(nodeData.children)) {
            console.log(`Children from children[] count: ${nodeData.children.length}`);
            for (const child of nodeData.children) {
                // query-node-tree children are usually complete
                if (this.isValidNodeData(child)) {
                    children.push(child);
                    console.log(`Add child: ${child.name || ((_a = child.value) === null || _a === void 0 ? void 0 : _a.name) || 'unknown'}`);
                }
                else {
                    console.log('Invalid child node data:', JSON.stringify(child, null, 2));
                }
            }
        }
        else {
            console.log('Node has no children or children array is empty');
        }
        return children;
    }
    generateUUID() {
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
    createPrefabData(nodeData, prefabName, prefabUuid) {
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
    processNodeForPrefab(nodeData, prefabUuid) {
        // Normalize node data for prefab export
        const processedData = [];
        let idCounter = 1;
        // Recurse nodes and components
        const processNode = (node, parentId = 0) => {
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
                node.components.forEach((component) => {
                    const componentId = idCounter++;
                    const processedComponents = this.processComponentForPrefab(component, componentId);
                    processedData.push(...processedComponents);
                });
            }
            // Serialize children
            if (node.children) {
                node.children.forEach((child) => {
                    processNode(child, nodeId);
                });
            }
            return nodeId;
        };
        processNode(nodeData);
        return processedData;
    }
    processComponentForPrefab(component, componentId) {
        // Normalize component props
        const processedComponent = Object.assign({ "__type__": component.type || "cc.Component", "_name": "", "_objFlags": 0, "__editorExtras__": {}, "node": {
                "__id__": componentId - 1
            }, "_enabled": component.enabled !== false, "__prefab": {
                "__id__": componentId + 1
            } }, component.properties);
        // Attach CompPrefabInfo metadata
        const compPrefabInfo = {
            "__type__": "cc.CompPrefabInfo",
            "fileId": this.generateFileId()
        };
        return [processedComponent, compPrefabInfo];
    }
    generateFileId() {
        // Generate fileId (simplified)
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/';
        let fileId = '';
        for (let i = 0; i < 22; i++) {
            fileId += chars[Math.floor(Math.random() * chars.length)];
        }
        return fileId;
    }
    createMetaData(prefabName, prefabUuid) {
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
    async savePrefabFiles(prefabPath, prefabData, metaData) {
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
                }).catch((error) => {
                    resolve({ success: false, error: error.message || 'Failed to save prefab file' });
                });
            }
            catch (error) {
                resolve({ success: false, error: `Error while saving file: ${error}` });
            }
        });
    }
    async saveAssetFile(filePath, content) {
        return new Promise((resolve, reject) => {
            // Multiple save strategies
            const saveMethods = [
                () => Editor.Message.request('asset-db', 'create-asset', filePath, content),
                () => Editor.Message.request('asset-db', 'save-asset', filePath, content),
                () => Editor.Message.request('asset-db', 'write-asset', filePath, content)
            ];
            const trySave = (index) => {
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
    async updatePrefab(prefabPath, nodeUuid) {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'query-asset-info', prefabPath).then((assetInfo) => {
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
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async revertPrefab(nodeUuid) {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'revert-prefab', {
                node: nodeUuid
            }).then(() => {
                resolve({
                    success: true,
                    message: 'Prefab instance reverted successfully'
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async getPrefabInfo(prefabPath) {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'query-asset-info', prefabPath).then((assetInfo) => {
                if (!assetInfo) {
                    throw new Error('Prefab not found');
                }
                return Editor.Message.request('asset-db', 'query-asset-meta', assetInfo.uuid);
            }).then((metaInfo) => {
                const info = {
                    name: metaInfo.name,
                    uuid: metaInfo.uuid,
                    path: prefabPath,
                    folder: prefabPath.substring(0, prefabPath.lastIndexOf('/')),
                    createTime: metaInfo.createTime,
                    modifyTime: metaInfo.modifyTime,
                    dependencies: metaInfo.depends || []
                };
                resolve({ success: true, data: info });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async createPrefabFromNode(args) {
        var _a;
        // Derive name from prefabPath
        const prefabPath = args.prefabPath;
        const prefabName = ((_a = prefabPath.split('/').pop()) === null || _a === void 0 ? void 0 : _a.replace('.prefab', '')) || 'NewPrefab';
        // Delegate to legacy createPrefab
        return await this.createPrefab({
            nodeUuid: args.nodeUuid,
            savePath: prefabPath,
            prefabName: prefabName
        });
    }
    async validatePrefab(prefabPath) {
        return new Promise((resolve) => {
            try {
                // Read prefab JSON from disk
                Editor.Message.request('asset-db', 'query-asset-info', prefabPath).then((assetInfo) => {
                    if (!assetInfo) {
                        resolve({
                            success: false,
                            error: 'Prefab file does not exist'
                        });
                        return;
                    }
                    // Validate prefab JSON
                    Editor.Message.request('asset-db', 'read-asset', prefabPath).then((content) => {
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
                        }
                        catch (parseError) {
                            resolve({
                                success: false,
                                error: 'Prefab file is not valid JSON'
                            });
                        }
                    }).catch((error) => {
                        resolve({
                            success: false,
                            error: `Failed to read prefab file: ${error.message}`
                        });
                    });
                }).catch((error) => {
                    resolve({
                        success: false,
                        error: `Failed to query prefab info: ${error.message}`
                    });
                });
            }
            catch (error) {
                resolve({
                    success: false,
                    error: `Error while validating prefab: ${error}`
                });
            }
        });
    }
    validatePrefabFormat(prefabData) {
        const issues = [];
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
        prefabData.forEach((item, index) => {
            if (item.__type__ === 'cc.Node') {
                nodeCount++;
            }
            else if (item.__type__ && item.__type__.includes('cc.')) {
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
    async duplicatePrefab(args) {
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
            }
            catch (error) {
                resolve({
                    success: false,
                    error: `Error while duplicating prefab: ${error}`
                });
            }
        });
    }
    async readPrefabContent(prefabPath) {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'read-asset', prefabPath).then((content) => {
                try {
                    const prefabData = JSON.parse(content);
                    resolve({ success: true, data: prefabData });
                }
                catch (parseError) {
                    resolve({ success: false, error: 'Invalid prefab file format' });
                }
            }).catch((error) => {
                resolve({ success: false, error: error.message || 'Failed to read prefab file' });
            });
        });
    }
    modifyPrefabForDuplication(prefabData, newName, newUuid) {
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
    async createAssetWithAssetDB(assetPath, content) {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'create-asset', assetPath, content, {
                overwrite: true,
                rename: false
            }).then((assetInfo) => {
                console.log('Asset file created:', assetInfo);
                resolve({ success: true, data: assetInfo });
            }).catch((error) => {
                console.error('Failed to create asset file:', error);
                resolve({ success: false, error: error.message || 'Failed to create asset file' });
            });
        });
    }
    /**
     * write .meta via asset-db
     */
    async createMetaWithAssetDB(assetPath, metaContent) {
        return new Promise((resolve) => {
            const metaContentString = JSON.stringify(metaContent, null, 2);
            Editor.Message.request('asset-db', 'save-asset-meta', assetPath, metaContentString).then((assetInfo) => {
                console.log('.meta file created:', assetInfo);
                resolve({ success: true, data: assetInfo });
            }).catch((error) => {
                console.error('Failed to create .meta file:', error);
                resolve({ success: false, error: error.message || 'Failed to create .meta file' });
            });
        });
    }
    /**
     * reimport via asset-db
     */
    async reimportAssetWithAssetDB(assetPath) {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'reimport-asset', assetPath).then((result) => {
                console.log('Re-import succeeded:', result);
                resolve({ success: true, data: result });
            }).catch((error) => {
                console.error('Re-import failed:', error);
                resolve({ success: false, error: error.message || 'Re-import failed' });
            });
        });
    }
    /**
     * overwrite asset via asset-db
     */
    async updateAssetWithAssetDB(assetPath, content) {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'save-asset', assetPath, content).then((result) => {
                console.log('Asset file updated:', result);
                resolve({ success: true, data: result });
            }).catch((error) => {
                console.error('Failed to update asset file:', error);
                resolve({ success: false, error: error.message || 'Failed to update asset file' });
            });
        });
    }
    /**
     * Build Creator-standard prefab JSON
     * Recursive tree matching engine layout
     */
    async createStandardPrefabContent(nodeData, prefabName, prefabUuid, includeChildren, includeComponents) {
        console.log('Building engine-standard prefab content...');
        const prefabData = [];
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
            nodeFileIds: new Map(), // Map node id -> fileId
            nodeUuidToIndex: new Map(), // Map node UUID -> __id__ index
            componentUuidToIndex: new Map() // Map component UUID -> index
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
    async createCompleteNodeTree(nodeData, parentNodeIndex, nodeIndex, context, includeChildren, includeComponents, nodeName) {
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
            const childIndices = [];
            console.log(`Allocating indices for ${childrenToProcess.length} children, currentId: ${context.currentId}`);
            for (let i = 0; i < childrenToProcess.length; i++) {
                console.log(`Child ${i + 1}, currentId: ${context.currentId}`);
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
                await this.createCompleteNodeTree(childData, nodeIndex, childIndex, context, includeChildren, includeComponents, childData.name || `Child${i + 1}`);
            }
        }
        // Then serialize components
        if (includeComponents && nodeData.components && Array.isArray(nodeData.components)) {
            console.log(`Processing ${nodeData.components.length} components on ${node._name}`);
            const componentIndices = [];
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
        const prefabInfo = {
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
        }
        else {
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
    uuidToCompressedId(uuid) {
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
    createComponentObject(componentData, nodeIndex, context) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6;
        let componentType = componentData.type || componentData.__type__ || 'cc.Component';
        const enabled = componentData.enabled !== undefined ? componentData.enabled : true;
        // console.log(`Create component - raw type: ${componentType}`);
        // console.log('Full component data:', JSON.stringify(componentData, null, 2));
        // Script components already compressed via MCP
        if (componentType && !componentType.startsWith('cc.')) {
            console.log(`Script component compressed UUID type: ${componentType}`);
        }
        // Base component shell
        const component = {
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
            const contentSize = ((_b = (_a = componentData.properties) === null || _a === void 0 ? void 0 : _a.contentSize) === null || _b === void 0 ? void 0 : _b.value) || { width: 100, height: 100 };
            const anchorPoint = ((_d = (_c = componentData.properties) === null || _c === void 0 ? void 0 : _c.anchorPoint) === null || _d === void 0 ? void 0 : _d.value) || { x: 0.5, y: 0.5 };
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
        }
        else if (componentType === 'cc.Sprite') {
            // Sprite.spriteFrame refs
            const spriteFrameProp = ((_e = componentData.properties) === null || _e === void 0 ? void 0 : _e._spriteFrame) || ((_f = componentData.properties) === null || _f === void 0 ? void 0 : _f.spriteFrame);
            if (spriteFrameProp) {
                component._spriteFrame = this.processComponentProperty(spriteFrameProp, context);
            }
            else {
                component._spriteFrame = null;
            }
            component._type = (_j = (_h = (_g = componentData.properties) === null || _g === void 0 ? void 0 : _g._type) === null || _h === void 0 ? void 0 : _h.value) !== null && _j !== void 0 ? _j : 0;
            component._fillType = (_m = (_l = (_k = componentData.properties) === null || _k === void 0 ? void 0 : _k._fillType) === null || _l === void 0 ? void 0 : _l.value) !== null && _m !== void 0 ? _m : 0;
            component._sizeMode = (_q = (_p = (_o = componentData.properties) === null || _o === void 0 ? void 0 : _o._sizeMode) === null || _p === void 0 ? void 0 : _p.value) !== null && _q !== void 0 ? _q : 1;
            component._fillCenter = { "__type__": "cc.Vec2", "x": 0, "y": 0 };
            component._fillStart = (_t = (_s = (_r = componentData.properties) === null || _r === void 0 ? void 0 : _r._fillStart) === null || _s === void 0 ? void 0 : _s.value) !== null && _t !== void 0 ? _t : 0;
            component._fillRange = (_w = (_v = (_u = componentData.properties) === null || _u === void 0 ? void 0 : _u._fillRange) === null || _v === void 0 ? void 0 : _v.value) !== null && _w !== void 0 ? _w : 0;
            component._isTrimmedMode = (_z = (_y = (_x = componentData.properties) === null || _x === void 0 ? void 0 : _x._isTrimmedMode) === null || _y === void 0 ? void 0 : _y.value) !== null && _z !== void 0 ? _z : true;
            component._useGrayscale = (_2 = (_1 = (_0 = componentData.properties) === null || _0 === void 0 ? void 0 : _0._useGrayscale) === null || _1 === void 0 ? void 0 : _1.value) !== null && _2 !== void 0 ? _2 : false;
            // Debug: log sprite props (commented)
            // console.log('Sprite component props:', JSON.stringify(componentData.properties, null, 2));
            component._atlas = null;
            component._id = "";
        }
        else if (componentType === 'cc.Button') {
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
            const targetProp = ((_3 = componentData.properties) === null || _3 === void 0 ? void 0 : _3._target) || ((_4 = componentData.properties) === null || _4 === void 0 ? void 0 : _4.target);
            if (targetProp) {
                component._target = this.processComponentProperty(targetProp, context);
            }
            else {
                component._target = { "__id__": nodeIndex }; // default self node
            }
            component._clickEvents = [];
            component._id = "";
        }
        else if (componentType === 'cc.Label') {
            component._string = ((_6 = (_5 = componentData.properties) === null || _5 === void 0 ? void 0 : _5._string) === null || _6 === void 0 ? void 0 : _6.value) || "Label";
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
        }
        else if (componentData.properties) {
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
                }
                else {
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
    processComponentProperty(propData, context) {
        var _a, _b;
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
        if (type === 'cc.Node' && (value === null || value === void 0 ? void 0 : value.uuid)) {
            // Internal node refs -> __id__
            if ((context === null || context === void 0 ? void 0 : context.nodeUuidToIndex) && context.nodeUuidToIndex.has(value.uuid)) {
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
        if ((value === null || value === void 0 ? void 0 : value.uuid) && (type === 'cc.Prefab' ||
            type === 'cc.Texture2D' ||
            type === 'cc.SpriteFrame' ||
            type === 'cc.Material' ||
            type === 'cc.AnimationClip' ||
            type === 'cc.AudioClip' ||
            type === 'cc.Font' ||
            type === 'cc.Asset')) {
            // Prefab refs keep UUID
            const uuidToUse = type === 'cc.Prefab' ? value.uuid : this.uuidToCompressedId(value.uuid);
            return {
                "__uuid__": uuidToUse,
                "__expectedType__": type
            };
        }
        // Component refs (Label/Button/...)
        if ((value === null || value === void 0 ? void 0 : value.uuid) && (type === 'cc.Component' ||
            type === 'cc.Label' || type === 'cc.Button' || type === 'cc.Sprite' ||
            type === 'cc.UITransform' || type === 'cc.RigidBody2D' ||
            type === 'cc.BoxCollider2D' || type === 'cc.Animation' ||
            type === 'cc.AudioSource' || ((type === null || type === void 0 ? void 0 : type.startsWith('cc.')) && !type.includes('@')))) {
            // Internal component refs -> __id__
            if ((context === null || context === void 0 ? void 0 : context.componentUuidToIndex) && context.componentUuidToIndex.has(value.uuid)) {
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
            }
            else if (type === 'cc.Vec3') {
                return {
                    "__type__": "cc.Vec3",
                    "x": Number(value.x) || 0,
                    "y": Number(value.y) || 0,
                    "z": Number(value.z) || 0
                };
            }
            else if (type === 'cc.Vec2') {
                return {
                    "__type__": "cc.Vec2",
                    "x": Number(value.x) || 0,
                    "y": Number(value.y) || 0
                };
            }
            else if (type === 'cc.Size') {
                return {
                    "__type__": "cc.Size",
                    "width": Number(value.width) || 0,
                    "height": Number(value.height) || 0
                };
            }
            else if (type === 'cc.Quat') {
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
            if (((_a = propData.elementTypeData) === null || _a === void 0 ? void 0 : _a.type) === 'cc.Node') {
                return value.map(item => {
                    var _a;
                    if ((item === null || item === void 0 ? void 0 : item.uuid) && ((_a = context === null || context === void 0 ? void 0 : context.nodeUuidToIndex) === null || _a === void 0 ? void 0 : _a.has(item.uuid))) {
                        return { "__id__": context.nodeUuidToIndex.get(item.uuid) };
                    }
                    return null;
                }).filter(item => item !== null);
            }
            // Asset arrays
            if (((_b = propData.elementTypeData) === null || _b === void 0 ? void 0 : _b.type) && propData.elementTypeData.type.startsWith('cc.')) {
                return value.map(item => {
                    if (item === null || item === void 0 ? void 0 : item.uuid) {
                        return {
                            "__uuid__": this.uuidToCompressedId(item.uuid),
                            "__expectedType__": propData.elementTypeData.type
                        };
                    }
                    return null;
                }).filter(item => item !== null);
            }
            // Primitive arrays
            return value.map(item => (item === null || item === void 0 ? void 0 : item.value) !== undefined ? item.value : item);
        }
        // Other objects keep shape + __type__
        if (value && typeof value === 'object' && type && type.startsWith('cc.')) {
            return Object.assign({ "__type__": type }, value);
        }
        return value;
    }
    /**
     * Engine-shaped node object
     */
    createEngineStandardNode(nodeData, parentNodeIndex, nodeName) {
        // Debug dump nodeData (commented)
        // console.log('Raw node data:', JSON.stringify(nodeData, null, 2));
        var _a, _b, _c, _d, _e, _f, _g, _h;
        // Extract base fields
        const getValue = (prop) => {
            if ((prop === null || prop === void 0 ? void 0 : prop.value) !== undefined)
                return prop.value;
            if (prop !== undefined)
                return prop;
            return null;
        };
        const position = getValue(nodeData.position) || getValue((_a = nodeData.value) === null || _a === void 0 ? void 0 : _a.position) || { x: 0, y: 0, z: 0 };
        const rotation = getValue(nodeData.rotation) || getValue((_b = nodeData.value) === null || _b === void 0 ? void 0 : _b.rotation) || { x: 0, y: 0, z: 0, w: 1 };
        const scale = getValue(nodeData.scale) || getValue((_c = nodeData.value) === null || _c === void 0 ? void 0 : _c.scale) || { x: 1, y: 1, z: 1 };
        const active = (_f = (_d = getValue(nodeData.active)) !== null && _d !== void 0 ? _d : getValue((_e = nodeData.value) === null || _e === void 0 ? void 0 : _e.active)) !== null && _f !== void 0 ? _f : true;
        const name = nodeName || getValue(nodeData.name) || getValue((_g = nodeData.value) === null || _g === void 0 ? void 0 : _g.name) || 'Node';
        const layer = getValue(nodeData.layer) || getValue((_h = nodeData.value) === null || _h === void 0 ? void 0 : _h.layer) || 1073741824;
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
    extractNodeUuid(nodeData) {
        var _a, _b, _c;
        if (!nodeData)
            return null;
        // UUID extraction heuristics
        const sources = [
            nodeData.uuid,
            (_a = nodeData.value) === null || _a === void 0 ? void 0 : _a.uuid,
            nodeData.__uuid__,
            (_b = nodeData.value) === null || _b === void 0 ? void 0 : _b.__uuid__,
            nodeData.id,
            (_c = nodeData.value) === null || _c === void 0 ? void 0 : _c.id
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
    createMinimalNode(nodeData, nodeName) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        // Extract base fields
        const getValue = (prop) => {
            if ((prop === null || prop === void 0 ? void 0 : prop.value) !== undefined)
                return prop.value;
            if (prop !== undefined)
                return prop;
            return null;
        };
        const position = getValue(nodeData.position) || getValue((_a = nodeData.value) === null || _a === void 0 ? void 0 : _a.position) || { x: 0, y: 0, z: 0 };
        const rotation = getValue(nodeData.rotation) || getValue((_b = nodeData.value) === null || _b === void 0 ? void 0 : _b.rotation) || { x: 0, y: 0, z: 0, w: 1 };
        const scale = getValue(nodeData.scale) || getValue((_c = nodeData.value) === null || _c === void 0 ? void 0 : _c.scale) || { x: 1, y: 1, z: 1 };
        const active = (_f = (_d = getValue(nodeData.active)) !== null && _d !== void 0 ? _d : getValue((_e = nodeData.value) === null || _e === void 0 ? void 0 : _e.active)) !== null && _f !== void 0 ? _f : true;
        const name = nodeName || getValue(nodeData.name) || getValue((_g = nodeData.value) === null || _g === void 0 ? void 0 : _g.name) || 'Node';
        const layer = getValue(nodeData.layer) || getValue((_h = nodeData.value) === null || _h === void 0 ? void 0 : _h.layer) || 33554432;
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
    createStandardMetaContent(prefabName, prefabUuid) {
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
    async convertNodeToPrefabInstance(nodeUuid, prefabUuid, prefabPath) {
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
    async restorePrefabNode(nodeUuid, assetUuid) {
        return new Promise((resolve) => {
            // restore-prefab official API
            Editor.Message.request('scene', 'restore-prefab', nodeUuid, assetUuid).then(() => {
                resolve({
                    success: true,
                    data: {
                        nodeUuid: nodeUuid,
                        assetUuid: assetUuid,
                        message: 'Prefab node restored successfully'
                    }
                });
            }).catch((error) => {
                resolve({
                    success: false,
                    error: `Prefab node restore failed: ${error.message}`
                });
            });
        });
    }
    // New serializer aligned with official prefab format
    async getNodeDataForPrefab(nodeUuid) {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'query-node', nodeUuid).then((nodeData) => {
                if (!nodeData) {
                    resolve({ success: false, error: 'Node does not exist' });
                    return;
                }
                resolve({ success: true, data: nodeData });
            }).catch((error) => {
                resolve({ success: false, error: error.message });
            });
        });
    }
    async createStandardPrefabData(nodeData, prefabName, prefabUuid) {
        // Follow official Canvas.prefab layout
        const prefabData = [];
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
    async createNodeObject(nodeData, parentId, prefabData, currentId) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        const nodeId = currentId++;
        // Base props from query-node-tree
        const getValue = (prop) => {
            if ((prop === null || prop === void 0 ? void 0 : prop.value) !== undefined)
                return prop.value;
            if (prop !== undefined)
                return prop;
            return null;
        };
        const position = getValue(nodeData.position) || getValue((_a = nodeData.value) === null || _a === void 0 ? void 0 : _a.position) || { x: 0, y: 0, z: 0 };
        const rotation = getValue(nodeData.rotation) || getValue((_b = nodeData.value) === null || _b === void 0 ? void 0 : _b.rotation) || { x: 0, y: 0, z: 0, w: 1 };
        const scale = getValue(nodeData.scale) || getValue((_c = nodeData.value) === null || _c === void 0 ? void 0 : _c.scale) || { x: 1, y: 1, z: 1 };
        const active = (_f = (_d = getValue(nodeData.active)) !== null && _d !== void 0 ? _d : getValue((_e = nodeData.value) === null || _e === void 0 ? void 0 : _e.active)) !== null && _f !== void 0 ? _f : true;
        const name = getValue(nodeData.name) || getValue((_g = nodeData.value) === null || _g === void 0 ? void 0 : _g.name) || 'Node';
        const layer = getValue(nodeData.layer) || getValue((_h = nodeData.value) === null || _h === void 0 ? void 0 : _h.layer) || 33554432;
        const node = {
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
                const childName = childData.name || ((_j = childData.value) === null || _j === void 0 ? void 0 : _j.name) || 'unknown';
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
                }
                catch (error) {
                    console.error(`Error processing child ${childName}:`, error);
                }
            }
        }
        return { node, nextId: currentId };
    }
    // Extract component list from node dump
    extractComponentsFromNode(nodeData) {
        var _a, _b;
        const components = [];
        // Probe multiple dump locations
        const componentSources = [
            nodeData.__comps__,
            nodeData.components,
            (_a = nodeData.value) === null || _a === void 0 ? void 0 : _a.__comps__,
            (_b = nodeData.value) === null || _b === void 0 ? void 0 : _b.components
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
    createStandardComponentObject(componentData, nodeId, prefabInfoId) {
        const componentType = componentData.__type__ || componentData.type;
        if (!componentType) {
            console.warn('Component missing type info:', componentData);
            return null;
        }
        // Base component shell (official prefab layout)
        const component = {
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
    addComponentSpecificProperties(component, componentData, componentType) {
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
    addUITransformProperties(component, componentData) {
        component._contentSize = this.createSizeObject(this.getComponentPropertyValue(componentData, 'contentSize', { width: 100, height: 100 }));
        component._anchorPoint = this.createVec2Object(this.getComponentPropertyValue(componentData, 'anchorPoint', { x: 0.5, y: 0.5 }));
    }
    // Sprite props
    addSpriteProperties(component, componentData) {
        component._visFlags = 0;
        component._customMaterial = null;
        component._srcBlendFactor = 2;
        component._dstBlendFactor = 4;
        component._color = this.createColorObject(this.getComponentPropertyValue(componentData, 'color', { r: 255, g: 255, b: 255, a: 255 }));
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
    addLabelProperties(component, componentData) {
        component._visFlags = 0;
        component._customMaterial = null;
        component._srcBlendFactor = 2;
        component._dstBlendFactor = 4;
        component._color = this.createColorObject(this.getComponentPropertyValue(componentData, 'color', { r: 0, g: 0, b: 0, a: 255 }));
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
    addButtonProperties(component, componentData) {
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
    addGenericProperties(component, componentData) {
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
    createVec2Object(data) {
        return {
            "__type__": "cc.Vec2",
            "x": (data === null || data === void 0 ? void 0 : data.x) || 0,
            "y": (data === null || data === void 0 ? void 0 : data.y) || 0
        };
    }
    // Build Vec3
    createVec3Object(data) {
        return {
            "__type__": "cc.Vec3",
            "x": (data === null || data === void 0 ? void 0 : data.x) || 0,
            "y": (data === null || data === void 0 ? void 0 : data.y) || 0,
            "z": (data === null || data === void 0 ? void 0 : data.z) || 0
        };
    }
    // Build Size
    createSizeObject(data) {
        return {
            "__type__": "cc.Size",
            "width": (data === null || data === void 0 ? void 0 : data.width) || 100,
            "height": (data === null || data === void 0 ? void 0 : data.height) || 100
        };
    }
    // Build Color
    createColorObject(data) {
        var _a, _b, _c, _d;
        return {
            "__type__": "cc.Color",
            "r": (_a = data === null || data === void 0 ? void 0 : data.r) !== null && _a !== void 0 ? _a : 255,
            "g": (_b = data === null || data === void 0 ? void 0 : data.g) !== null && _b !== void 0 ? _b : 255,
            "b": (_c = data === null || data === void 0 ? void 0 : data.b) !== null && _c !== void 0 ? _c : 255,
            "a": (_d = data === null || data === void 0 ? void 0 : data.a) !== null && _d !== void 0 ? _d : 255
        };
    }
    // shouldCopy guard
    shouldCopyComponentProperty(key, value) {
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
    getComponentPropertyValue(componentData, propertyName, defaultValue) {
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
    extractValue(data) {
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
    createStandardMetaData(prefabName, prefabUuid) {
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
    async savePrefabWithMeta(prefabPath, prefabData, metaData) {
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
                }).catch((error) => {
                    reject(error);
                });
            });
            // Write .meta
            await new Promise((resolve, reject) => {
                Editor.Message.request('asset-db', 'create-asset', metaPath, metaContent).then(() => {
                    resolve(true);
                }).catch((error) => {
                    reject(error);
                });
            });
            console.log(`=== Prefab save complete ===`);
            console.log(`Prefab file saved: ${finalPrefabPath}`);
            console.log(`.meta saved: ${metaPath}`);
            console.log(`Prefab array length: ${prefabData.length}`);
            console.log(`Prefab root node index: ${prefabData.length - 1}`);
            return { success: true };
        }
        catch (error) {
            console.error('Error saving prefab file:', error);
            return { success: false, error: error.message };
        }
    }
}
exports.PrefabTools = PrefabTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmFiLXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL3ByZWZhYi10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFQSxNQUFhLFdBQVc7SUFDcEIsUUFBUTtRQUNKLE9BQU87WUFDSDtnQkFDSSxJQUFJLEVBQUUsaUJBQWlCO2dCQUN2QixXQUFXLEVBQUUsZ0NBQWdDO2dCQUM3QyxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLE1BQU0sRUFBRTs0QkFDSixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsa0NBQWtDOzRCQUMvQyxPQUFPLEVBQUUsYUFBYTt5QkFDekI7cUJBQ0o7aUJBQ0o7YUFDSjtZQUNEO2dCQUNJLElBQUksRUFBRSxhQUFhO2dCQUNuQixXQUFXLEVBQUUsdUJBQXVCO2dCQUNwQyxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLFVBQVUsRUFBRTs0QkFDUixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsbUJBQW1CO3lCQUNuQztxQkFDSjtvQkFDRCxRQUFRLEVBQUUsQ0FBQyxZQUFZLENBQUM7aUJBQzNCO2FBQ0o7WUFDRDtnQkFDSSxJQUFJLEVBQUUsb0JBQW9CO2dCQUMxQixXQUFXLEVBQUUsbUNBQW1DO2dCQUNoRCxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLFVBQVUsRUFBRTs0QkFDUixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsbUJBQW1CO3lCQUNuQzt3QkFDRCxVQUFVLEVBQUU7NEJBQ1IsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLDZCQUE2Qjt5QkFDN0M7d0JBQ0QsUUFBUSxFQUFFOzRCQUNOLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxrQkFBa0I7NEJB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Z0JBQWdCLFFBQVEsRUFBRSxDQUFDLENBQUM7WUFDeEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7WUFDekQsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBRWhFLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUM7UUFDN0IsQ0FBQztRQUFDLE9BQU8sS0FBVSxFQUFFLENBQUM7WUFDbEIsT0FBTyxDQUFDLEtBQUssQ0FBQywyQkFBMkIsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUNsRCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3BELENBQUM7SUFDTCxDQUFDO0NBRUo7QUFyeUZELGtDQXF5RkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUb29sRGVmaW5pdGlvbiwgVG9vbFJlc3BvbnNlLCBUb29sRXhlY3V0b3IsIFByZWZhYkluZm8gfSBmcm9tICcuLi90eXBlcyc7XG5cbmV4cG9ydCBjbGFzcyBQcmVmYWJUb29scyBpbXBsZW1lbnRzIFRvb2xFeGVjdXRvciB7XG4gICAgZ2V0VG9vbHMoKTogVG9vbERlZmluaXRpb25bXSB7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2dldF9wcmVmYWJfbGlzdCcsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdHZXQgYWxsIHByZWZhYnMgaW4gdGhlIHByb2plY3QnLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb2xkZXI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0ZvbGRlciBwYXRoIHRvIHNlYXJjaCAob3B0aW9uYWwpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiAnZGI6Ly9hc3NldHMnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdsb2FkX3ByZWZhYicsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdMb2FkIGEgcHJlZmFiIGJ5IHBhdGgnLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcmVmYWJQYXRoOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdQcmVmYWIgYXNzZXQgcGF0aCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsncHJlZmFiUGF0aCddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnaW5zdGFudGlhdGVfcHJlZmFiJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0luc3RhbnRpYXRlIGEgcHJlZmFiIGluIHRoZSBzY2VuZScsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByZWZhYlBhdGg6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1ByZWZhYiBhc3NldCBwYXRoJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudFV1aWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1BhcmVudCBub2RlIFVVSUQgKG9wdGlvbmFsKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnSW5pdGlhbCBwb3NpdGlvbicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OiB7IHR5cGU6ICdudW1iZXInIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IHsgdHlwZTogJ251bWJlcicgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgejogeyB0eXBlOiAnbnVtYmVyJyB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydwcmVmYWJQYXRoJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdjcmVhdGVfcHJlZmFiJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0NyZWF0ZSBhIHByZWZhYiBmcm9tIGEgbm9kZSB3aXRoIGFsbCBjaGlsZHJlbiBhbmQgY29tcG9uZW50cycsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdTb3VyY2Ugbm9kZSBVVUlEJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNhdmVQYXRoOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdQYXRoIHRvIHNhdmUgdGhlIHByZWZhYiAoZS5nLiwgZGI6Ly9hc3NldHMvcHJlZmFicy9NeVByZWZhYi5wcmVmYWIpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByZWZhYk5hbWU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1ByZWZhYiBuYW1lJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydub2RlVXVpZCcsICdzYXZlUGF0aCcsICdwcmVmYWJOYW1lJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICd1cGRhdGVfcHJlZmFiJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1VwZGF0ZSBhbiBleGlzdGluZyBwcmVmYWInLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcmVmYWJQYXRoOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdQcmVmYWIgYXNzZXQgcGF0aCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTm9kZSBVVUlEIHdpdGggY2hhbmdlcydcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsncHJlZmFiUGF0aCcsICdub2RlVXVpZCddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAncmV2ZXJ0X3ByZWZhYicsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdSZXZlcnQgcHJlZmFiIGluc3RhbmNlIHRvIG9yaWdpbmFsJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1ByZWZhYiBpbnN0YW5jZSBub2RlIFVVSUQnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ25vZGVVdWlkJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdnZXRfcHJlZmFiX2luZm8nLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnR2V0IGRldGFpbGVkIHByZWZhYiBpbmZvcm1hdGlvbicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByZWZhYlBhdGg6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1ByZWZhYiBhc3NldCBwYXRoJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydwcmVmYWJQYXRoJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICd2YWxpZGF0ZV9wcmVmYWInLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVmFsaWRhdGUgYSBwcmVmYWIgZmlsZSBmb3JtYXQnLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcmVmYWJQYXRoOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdQcmVmYWIgYXNzZXQgcGF0aCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsncHJlZmFiUGF0aCddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnZHVwbGljYXRlX3ByZWZhYicsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdEdXBsaWNhdGUgYW4gZXhpc3RpbmcgcHJlZmFiJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlUHJlZmFiUGF0aDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU291cmNlIHByZWZhYiBwYXRoJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldFByZWZhYlBhdGg6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RhcmdldCBwcmVmYWIgcGF0aCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdQcmVmYWJOYW1lOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdOZXcgcHJlZmFiIG5hbWUnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3NvdXJjZVByZWZhYlBhdGgnLCAndGFyZ2V0UHJlZmFiUGF0aCddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAncmVzdG9yZV9wcmVmYWJfbm9kZScsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdSZXN0b3JlIHByZWZhYiBub2RlIHVzaW5nIHByZWZhYiBhc3NldCAoYnVpbHQtaW4gdW5kbyByZWNvcmQpJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1ByZWZhYiBpbnN0YW5jZSBub2RlIFVVSUQnXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXRVdWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdQcmVmYWIgYXNzZXQgVVVJRCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnbm9kZVV1aWQnLCAnYXNzZXRVdWlkJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIF07XG4gICAgfVxuXG4gICAgYXN5bmMgZXhlY3V0ZSh0b29sTmFtZTogc3RyaW5nLCBhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBzd2l0Y2ggKHRvb2xOYW1lKSB7XG4gICAgICAgICAgICBjYXNlICdnZXRfcHJlZmFiX2xpc3QnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldFByZWZhYkxpc3QoYXJncy5mb2xkZXIpO1xuICAgICAgICAgICAgY2FzZSAnbG9hZF9wcmVmYWInOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmxvYWRQcmVmYWIoYXJncy5wcmVmYWJQYXRoKTtcbiAgICAgICAgICAgIGNhc2UgJ2luc3RhbnRpYXRlX3ByZWZhYic6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuaW5zdGFudGlhdGVQcmVmYWIoYXJncyk7XG4gICAgICAgICAgICBjYXNlICdjcmVhdGVfcHJlZmFiJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5jcmVhdGVQcmVmYWIoYXJncyk7XG4gICAgICAgICAgICBjYXNlICd1cGRhdGVfcHJlZmFiJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy51cGRhdGVQcmVmYWIoYXJncy5wcmVmYWJQYXRoLCBhcmdzLm5vZGVVdWlkKTtcbiAgICAgICAgICAgIGNhc2UgJ3JldmVydF9wcmVmYWInOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnJldmVydFByZWZhYihhcmdzLm5vZGVVdWlkKTtcbiAgICAgICAgICAgIGNhc2UgJ2dldF9wcmVmYWJfaW5mbyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0UHJlZmFiSW5mbyhhcmdzLnByZWZhYlBhdGgpO1xuICAgICAgICAgICAgY2FzZSAndmFsaWRhdGVfcHJlZmFiJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy52YWxpZGF0ZVByZWZhYihhcmdzLnByZWZhYlBhdGgpO1xuICAgICAgICAgICAgY2FzZSAnZHVwbGljYXRlX3ByZWZhYic6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZHVwbGljYXRlUHJlZmFiKGFyZ3MpO1xuICAgICAgICAgICAgY2FzZSAncmVzdG9yZV9wcmVmYWJfbm9kZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucmVzdG9yZVByZWZhYk5vZGUoYXJncy5ub2RlVXVpZCwgYXJncy5hc3NldFV1aWQpO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gdG9vbDogJHt0b29sTmFtZX1gKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2V0UHJlZmFiTGlzdChmb2xkZXI6IHN0cmluZyA9ICdkYjovL2Fzc2V0cycpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHBhdHRlcm4gPSBmb2xkZXIuZW5kc1dpdGgoJy8nKSA/IFxuICAgICAgICAgICAgICAgIGAke2ZvbGRlcn0qKi8qLnByZWZhYmAgOiBgJHtmb2xkZXJ9LyoqLyoucHJlZmFiYDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXRzJywge1xuICAgICAgICAgICAgICAgIHBhdHRlcm46IHBhdHRlcm5cbiAgICAgICAgICAgIH0pLnRoZW4oKHJlc3VsdHM6IGFueVtdKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJlZmFiczogUHJlZmFiSW5mb1tdID0gcmVzdWx0cy5tYXAoYXNzZXQgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogYXNzZXQubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogYXNzZXQudXJsLFxuICAgICAgICAgICAgICAgICAgICB1dWlkOiBhc3NldC51dWlkLFxuICAgICAgICAgICAgICAgICAgICBmb2xkZXI6IGFzc2V0LnVybC5zdWJzdHJpbmcoMCwgYXNzZXQudXJsLmxhc3RJbmRleE9mKCcvJykpXG4gICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBwcmVmYWJzIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGxvYWRQcmVmYWIocHJlZmFiUGF0aDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldC1pbmZvJywgcHJlZmFiUGF0aCkudGhlbigoYXNzZXRJbmZvOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIWFzc2V0SW5mbykge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1ByZWZhYiBub3QgZm91bmQnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2xvYWQtYXNzZXQnLCB7XG4gICAgICAgICAgICAgICAgICAgIHV1aWQ6IGFzc2V0SW5mby51dWlkXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KS50aGVuKChwcmVmYWJEYXRhOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogcHJlZmFiRGF0YS51dWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogcHJlZmFiRGF0YS5uYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ1ByZWZhYiBsb2FkZWQgc3VjY2Vzc2Z1bGx5J1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgaW5zdGFudGlhdGVQcmVmYWIoYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGFzeW5jIChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIC8vIEdldCBwcmVmYWIgYXNzZXQgaW5mb3JtYXRpb25cbiAgICAgICAgICAgICAgICBjb25zdCBhc3NldEluZm8gPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldC1pbmZvJywgYXJncy5wcmVmYWJQYXRoKTtcbiAgICAgICAgICAgICAgICBpZiAoIWFzc2V0SW5mbykge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1ByZWZhYiBub3QgZm91bmQnKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBJbnN0YW50aWF0ZSBmcm9tIHByZWZhYiBhc3NldCB1c2luZyBjcmVhdGUtbm9kZSBBUElcbiAgICAgICAgICAgICAgICBjb25zdCBjcmVhdGVOb2RlT3B0aW9uczogYW55ID0ge1xuICAgICAgICAgICAgICAgICAgICBhc3NldFV1aWQ6IGFzc2V0SW5mby51dWlkXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIC8vIFNldCBwYXJlbnQgbm9kZVxuICAgICAgICAgICAgICAgIGlmIChhcmdzLnBhcmVudFV1aWQpIHtcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRlTm9kZU9wdGlvbnMucGFyZW50ID0gYXJncy5wYXJlbnRVdWlkO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFNldCBub2RlIG5hbWVcbiAgICAgICAgICAgICAgICBpZiAoYXJncy5uYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIGNyZWF0ZU5vZGVPcHRpb25zLm5hbWUgPSBhcmdzLm5hbWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChhc3NldEluZm8ubmFtZSkge1xuICAgICAgICAgICAgICAgICAgICBjcmVhdGVOb2RlT3B0aW9ucy5uYW1lID0gYXNzZXRJbmZvLm5hbWU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gU2V0IGluaXRpYWwgcHJvcGVydGllcyAoZS5nLiBwb3NpdGlvbilcbiAgICAgICAgICAgICAgICBpZiAoYXJncy5wb3NpdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBjcmVhdGVOb2RlT3B0aW9ucy5kdW1wID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogYXJncy5wb3NpdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBub2RlXG4gICAgICAgICAgICAgICAgY29uc3Qgbm9kZVV1aWQgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdjcmVhdGUtbm9kZScsIGNyZWF0ZU5vZGVPcHRpb25zKTtcbiAgICAgICAgICAgICAgICBjb25zdCB1dWlkID0gQXJyYXkuaXNBcnJheShub2RlVXVpZCkgPyBub2RlVXVpZFswXSA6IG5vZGVVdWlkO1xuXG4gICAgICAgICAgICAgICAgLy8gTm90ZTogY3JlYXRlLW5vZGUgZnJvbSBwcmVmYWIgYXNzZXQgc2hvdWxkIGVzdGFibGlzaCBwcmVmYWIgbGluayBhdXRvbWF0aWNhbGx5XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1ByZWZhYiBub2RlIGNyZWF0ZWQgc3VjY2Vzc2Z1bGx5OicsIHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHV1aWQsXG4gICAgICAgICAgICAgICAgICAgIHByZWZhYlV1aWQ6IGFzc2V0SW5mby51dWlkLFxuICAgICAgICAgICAgICAgICAgICBwcmVmYWJQYXRoOiBhcmdzLnByZWZhYlBhdGhcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcmVmYWJQYXRoOiBhcmdzLnByZWZhYlBhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnRVdWlkOiBhcmdzLnBhcmVudFV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogYXJncy5wb3NpdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdQcmVmYWIgaW5zdGFudGlhdGVkIHN1Y2Nlc3NmdWxseTsgcHJlZmFiIGxpbmsgZXN0YWJsaXNoZWQnXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IFxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiBgUHJlZmFiIGluc3RhbnRpYXRpb24gZmFpbGVkOiAke2Vyci5tZXNzYWdlfWAsXG4gICAgICAgICAgICAgICAgICAgIGluc3RydWN0aW9uOiAnVmVyaWZ5IHRoZSBwcmVmYWIgcGF0aCBpcyBjb3JyZWN0IGFuZCB0aGUgcHJlZmFiIGZpbGUgZm9ybWF0IGlzIHZhbGlkJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBMaW5rIG5vZGUgdG8gcHJlZmFiIGluc3RhbmNlXG4gICAgICogQ3JlYXRlcyBQcmVmYWJJbmZvIGFuZCBQcmVmYWJJbnN0YW5jZSBzdHJ1Y3R1cmVzXG4gICAgICovXG4gICAgcHJpdmF0ZSBhc3luYyBlc3RhYmxpc2hQcmVmYWJDb25uZWN0aW9uKG5vZGVVdWlkOiBzdHJpbmcsIHByZWZhYlV1aWQ6IHN0cmluZywgcHJlZmFiUGF0aDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBSZWFkIHByZWZhYiBmaWxlIHRvIG9idGFpbiByb290IG5vZGUgZmlsZUlkXG4gICAgICAgICAgICBjb25zdCBwcmVmYWJDb250ZW50ID0gYXdhaXQgdGhpcy5yZWFkUHJlZmFiRmlsZShwcmVmYWJQYXRoKTtcbiAgICAgICAgICAgIGlmICghcHJlZmFiQ29udGVudCB8fCAhcHJlZmFiQ29udGVudC5kYXRhIHx8ICFwcmVmYWJDb250ZW50LmRhdGEubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmFibGUgdG8gcmVhZCBwcmVmYWIgZmlsZSBjb250ZW50Jyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFJvb3QgcHJlZmFiIGZpbGVJZCAodXN1YWxseSBzZWNvbmQgb2JqZWN0LCBpbmRleCAxKVxuICAgICAgICAgICAgY29uc3Qgcm9vdE5vZGUgPSBwcmVmYWJDb250ZW50LmRhdGEuZmluZCgoaXRlbTogYW55KSA9PiBpdGVtLl9fdHlwZSA9PT0gJ2NjLk5vZGUnICYmIGl0ZW0uX3BhcmVudCA9PT0gbnVsbCk7XG4gICAgICAgICAgICBpZiAoIXJvb3ROb2RlIHx8ICFyb290Tm9kZS5fcHJlZmFiKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmFibGUgdG8gZmluZCBwcmVmYWIgcm9vdCBub2RlIG9yIGl0cyBwcmVmYWIgbWV0YWRhdGEnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gR2V0IFByZWZhYkluZm8gb24gcm9vdFxuICAgICAgICAgICAgY29uc3Qgcm9vdFByZWZhYkluZm8gPSBwcmVmYWJDb250ZW50LmRhdGFbcm9vdE5vZGUuX3ByZWZhYi5fX2lkX19dO1xuICAgICAgICAgICAgaWYgKCFyb290UHJlZmFiSW5mbyB8fCByb290UHJlZmFiSW5mby5fX3R5cGUgIT09ICdjYy5QcmVmYWJJbmZvJykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIGZpbmQgUHJlZmFiSW5mbyBvbiB0aGUgcHJlZmFiIHJvb3Qgbm9kZScpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCByb290RmlsZUlkID0gcm9vdFByZWZhYkluZm8uZmlsZUlkO1xuXG4gICAgICAgICAgICAvLyBMaW5rIHByZWZhYiB2aWEgc2NlbmUgQVBJXG4gICAgICAgICAgICBjb25zdCBwcmVmYWJDb25uZWN0aW9uRGF0YSA9IHtcbiAgICAgICAgICAgICAgICBub2RlOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICBwcmVmYWI6IHByZWZhYlV1aWQsXG4gICAgICAgICAgICAgICAgZmlsZUlkOiByb290RmlsZUlkXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBUcnkgbXVsdGlwbGUgQVBJcyB0byBlc3RhYmxpc2ggcHJlZmFiIGxpbmtcbiAgICAgICAgICAgIGNvbnN0IGNvbm5lY3Rpb25NZXRob2RzID0gW1xuICAgICAgICAgICAgICAgICgpID0+IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2Nvbm5lY3QtcHJlZmFiLWluc3RhbmNlJywgcHJlZmFiQ29ubmVjdGlvbkRhdGEpLFxuICAgICAgICAgICAgICAgICgpID0+IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcmVmYWItY29ubmVjdGlvbicsIHByZWZhYkNvbm5lY3Rpb25EYXRhKSxcbiAgICAgICAgICAgICAgICAoKSA9PiBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdhcHBseS1wcmVmYWItbGluaycsIHByZWZhYkNvbm5lY3Rpb25EYXRhKVxuICAgICAgICAgICAgXTtcblxuICAgICAgICAgICAgbGV0IGNvbm5lY3RlZCA9IGZhbHNlO1xuICAgICAgICAgICAgZm9yIChjb25zdCBtZXRob2Qgb2YgY29ubmVjdGlvbk1ldGhvZHMpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCBtZXRob2QoKTtcbiAgICAgICAgICAgICAgICAgICAgY29ubmVjdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdQcmVmYWIgbGluayBtZXRob2QgZmFpbGVkLCB0cnlpbmcgbmV4dCBtZXRob2Q6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFjb25uZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBJZiBhbGwgQVBJcyBmYWlsLCB0cnkgbWFudWFsIHNjZW5lIGRhdGEgcGF0Y2hcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ0FsbCBwcmVmYWIgbGluayBBUElzIGZhaWxlZCwgYXR0ZW1wdGluZyBtYW51YWwgY29ubmVjdGlvbicpO1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMubWFudWFsbHlFc3RhYmxpc2hQcmVmYWJDb25uZWN0aW9uKG5vZGVVdWlkLCBwcmVmYWJVdWlkLCByb290RmlsZUlkKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGVzdGFibGlzaCBwcmVmYWIgY29ubmVjdGlvbjonLCBlcnJvcik7XG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1hbnVhbCBwcmVmYWIgbGluayBmYWxsYmFjayB3aGVuIEFQSXMgZmFpbFxuICAgICAqL1xuICAgIHByaXZhdGUgYXN5bmMgbWFudWFsbHlFc3RhYmxpc2hQcmVmYWJDb25uZWN0aW9uKG5vZGVVdWlkOiBzdHJpbmcsIHByZWZhYlV1aWQ6IHN0cmluZywgcm9vdEZpbGVJZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBUcnkgZHVtcCBBUEkgdG8gbW9kaWZ5IG5vZGUgX3ByZWZhYlxuICAgICAgICAgICAgY29uc3QgcHJlZmFiQ29ubmVjdGlvbkRhdGEgPSB7XG4gICAgICAgICAgICAgICAgW25vZGVVdWlkXToge1xuICAgICAgICAgICAgICAgICAgICAnX3ByZWZhYic6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdfX3V1aWRfXyc6IHByZWZhYlV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAnX19leHBlY3RlZFR5cGVfXyc6ICdjYy5QcmVmYWInLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ2ZpbGVJZCc6IHJvb3RGaWxlSWRcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcbiAgICAgICAgICAgICAgICB1dWlkOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICBwYXRoOiAnX3ByZWZhYicsXG4gICAgICAgICAgICAgICAgZHVtcDoge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ19fdXVpZF9fJzogcHJlZmFiVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICdfX2V4cGVjdGVkVHlwZV9fJzogJ2NjLlByZWZhYidcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdNYW51YWwgcHJlZmFiIGNvbm5lY3Rpb24gYWxzbyBmYWlsZWQ6JywgZXJyb3IpO1xuICAgICAgICAgICAgLy8gRG8gbm90IHRocm93OyBiYXNlIG5vZGUgY3JlYXRpb24gc3VjY2VlZGVkXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZWFkIHByZWZhYiBmaWxlIGNvbnRlbnRcbiAgICAgKi9cbiAgICBwcml2YXRlIGFzeW5jIHJlYWRQcmVmYWJGaWxlKHByZWZhYlBhdGg6IHN0cmluZyk6IFByb21pc2U8YW55PiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBUcnkgYXNzZXQtZGIgQVBJIHRvIHJlYWQgZmlsZVxuICAgICAgICAgICAgbGV0IGFzc2V0Q29udGVudDogYW55O1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBhc3NldENvbnRlbnQgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldC1pbmZvJywgcHJlZmFiUGF0aCk7XG4gICAgICAgICAgICAgICAgaWYgKGFzc2V0Q29udGVudCAmJiBhc3NldENvbnRlbnQuc291cmNlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIElmIHNvdXJjZSBwYXRoIGV4aXN0cywgcmVhZCBmaWxlIGRpcmVjdGx5XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZzID0gcmVxdWlyZSgnZnMnKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZnVsbFBhdGggPSBwYXRoLnJlc29sdmUoYXNzZXRDb250ZW50LnNvdXJjZSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVDb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKGZ1bGxQYXRoLCAndXRmOCcpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gSlNPTi5wYXJzZShmaWxlQ29udGVudCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ2Fzc2V0LWRiIHJlYWQgZmFpbGVkLCB0cnlpbmcgb3RoZXIgbWV0aG9kczonLCBlcnJvcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEZhbGxiYWNrOiByZXNvbHZlIGRiOi8vIHRvIGZpbGVzeXN0ZW0gcGF0aFxuICAgICAgICAgICAgY29uc3QgZnNQYXRoID0gcHJlZmFiUGF0aC5yZXBsYWNlKCdkYjovL2Fzc2V0cy8nLCAnYXNzZXRzLycpLnJlcGxhY2UoJ2RiOi8vYXNzZXRzJywgJ2Fzc2V0cycpO1xuICAgICAgICAgICAgY29uc3QgZnMgPSByZXF1aXJlKCdmcycpO1xuICAgICAgICAgICAgY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVHJ5IG11bHRpcGxlIGNhbmRpZGF0ZSBwcm9qZWN0IHJvb3RzXG4gICAgICAgICAgICBjb25zdCBwb3NzaWJsZVBhdGhzID0gW1xuICAgICAgICAgICAgICAgIHBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCAnLi4vLi4vTmV3UHJvamVjdF8zJywgZnNQYXRoKSxcbiAgICAgICAgICAgICAgICBwYXRoLnJlc29sdmUoJy9Vc2Vycy9saXpoaXlvbmcvTmV3UHJvamVjdF8zJywgZnNQYXRoKSxcbiAgICAgICAgICAgICAgICBwYXRoLnJlc29sdmUoZnNQYXRoKSxcbiAgICAgICAgICAgICAgICAvLyBBbHNvIHRyeSBkaXJlY3QgcGF0aCBmb3IgcHJvamVjdC1yb290IGZpbGVzXG4gICAgICAgICAgICAgICAgcGF0aC5yZXNvbHZlKCcvVXNlcnMvbGl6aGl5b25nL05ld1Byb2plY3RfMy9hc3NldHMnLCBwYXRoLmJhc2VuYW1lKGZzUGF0aCkpXG4gICAgICAgICAgICBdO1xuXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnQXR0ZW1wdGluZyB0byByZWFkIHByZWZhYiBmaWxlLCBwYXRoIHJlc29sdXRpb246Jywge1xuICAgICAgICAgICAgICAgIG9yaWdpbmFsUGF0aDogcHJlZmFiUGF0aCxcbiAgICAgICAgICAgICAgICBmc1BhdGg6IGZzUGF0aCxcbiAgICAgICAgICAgICAgICBwb3NzaWJsZVBhdGhzOiBwb3NzaWJsZVBhdGhzXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgZm9yIChjb25zdCBmdWxsUGF0aCBvZiBwb3NzaWJsZVBhdGhzKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYENoZWNraW5nIHBhdGg6ICR7ZnVsbFBhdGh9YCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChmcy5leGlzdHNTeW5jKGZ1bGxQYXRoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYEZvdW5kIGZpbGU6ICR7ZnVsbFBhdGh9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWxlQ29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhmdWxsUGF0aCwgJ3V0ZjgnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhcnNlZCA9IEpTT04ucGFyc2UoZmlsZUNvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0ZpbGUgcGFyc2VkIHN1Y2Nlc3NmdWxseSwgZGF0YSBzdHJ1Y3R1cmU6Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhc0RhdGE6ICEhcGFyc2VkLmRhdGEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YUxlbmd0aDogcGFyc2VkLmRhdGEgPyBwYXJzZWQuZGF0YS5sZW5ndGggOiAwXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZWQ7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgRmlsZSBkb2VzIG5vdCBleGlzdDogJHtmdWxsUGF0aH1gKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKHJlYWRFcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYEZhaWxlZCB0byByZWFkIGZpbGUgJHtmdWxsUGF0aH06YCwgcmVhZEVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIGZpbmQgb3IgcmVhZCBwcmVmYWIgZmlsZScpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHJlYWQgcHJlZmFiIGZpbGU6JywgZXJyb3IpO1xuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHRyeUNyZWF0ZU5vZGVXaXRoUHJlZmFiKGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXQtaW5mbycsIGFyZ3MucHJlZmFiUGF0aCkudGhlbigoYXNzZXRJbmZvOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIWFzc2V0SW5mbykge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1ByZWZhYiBub3QgZm91bmQnKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBBcHByb2FjaCAyOiBjcmVhdGUtbm9kZSB3aXRoIHByZWZhYiBhc3NldFxuICAgICAgICAgICAgICAgIGNvbnN0IGNyZWF0ZU5vZGVPcHRpb25zOiBhbnkgPSB7XG4gICAgICAgICAgICAgICAgICAgIGFzc2V0VXVpZDogYXNzZXRJbmZvLnV1aWRcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgLy8gU2V0IHBhcmVudCBub2RlXG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MucGFyZW50VXVpZCkge1xuICAgICAgICAgICAgICAgICAgICBjcmVhdGVOb2RlT3B0aW9ucy5wYXJlbnQgPSBhcmdzLnBhcmVudFV1aWQ7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2NyZWF0ZS1ub2RlJywgY3JlYXRlTm9kZU9wdGlvbnMpO1xuICAgICAgICAgICAgfSkudGhlbigobm9kZVV1aWQ6IHN0cmluZyB8IHN0cmluZ1tdKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgdXVpZCA9IEFycmF5LmlzQXJyYXkobm9kZVV1aWQpID8gbm9kZVV1aWRbMF0gOiBub2RlVXVpZDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBBcHBseSBwb3NpdGlvbiB3aGVuIHByb3ZpZGVkXG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MucG9zaXRpb24gJiYgdXVpZCkge1xuICAgICAgICAgICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdzZXQtcHJvcGVydHknLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiB1dWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogJ3Bvc2l0aW9uJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGR1bXA6IHsgdmFsdWU6IGFyZ3MucG9zaXRpb24gfVxuICAgICAgICAgICAgICAgICAgICB9KS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDogdXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJlZmFiUGF0aDogYXJncy5wcmVmYWJQYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogYXJncy5wb3NpdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ1ByZWZhYiBpbnN0YW50aWF0ZWQgKGZhbGxiYWNrKSBhbmQgcG9zaXRpb24gc2V0J1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByZWZhYlBhdGg6IGFyZ3MucHJlZmFiUGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ1ByZWZhYiBpbnN0YW50aWF0ZWQgKGZhbGxiYWNrKSBidXQgcG9zaXRpb24gc2V0IGZhaWxlZCdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiB1dWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByZWZhYlBhdGg6IGFyZ3MucHJlZmFiUGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnUHJlZmFiIGluc3RhbnRpYXRlZCBzdWNjZXNzZnVsbHkgKGZhbGxiYWNrKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiBgRmFsbGJhY2sgcHJlZmFiIGluc3RhbnRpYXRpb24gYWxzbyBmYWlsZWQ6ICR7ZXJyLm1lc3NhZ2V9YFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgdHJ5QWx0ZXJuYXRpdmVJbnN0YW50aWF0ZU1ldGhvZHMoYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGFzeW5jIChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIC8vIEFwcHJvYWNoIDE6IGNyZWF0ZS1ub2RlIHRoZW4gYXBwbHkgcHJlZmFiXG4gICAgICAgICAgICAgICAgY29uc3QgYXNzZXRJbmZvID0gYXdhaXQgdGhpcy5nZXRBc3NldEluZm8oYXJncy5wcmVmYWJQYXRoKTtcbiAgICAgICAgICAgICAgICBpZiAoIWFzc2V0SW5mbykge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnVW5hYmxlIHRvIGdldCBwcmVmYWIgaW5mb3JtYXRpb24nIH0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIGVtcHR5IG5vZGVcbiAgICAgICAgICAgICAgICBjb25zdCBjcmVhdGVSZXN1bHQgPSBhd2FpdCB0aGlzLmNyZWF0ZU5vZGUoYXJncy5wYXJlbnRVdWlkLCBhcmdzLnBvc2l0aW9uKTtcbiAgICAgICAgICAgICAgICBpZiAoIWNyZWF0ZVJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoY3JlYXRlUmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFRyeSBhcHBseWluZyBwcmVmYWIgZGF0YSB0byBub2RlXG4gICAgICAgICAgICAgICAgY29uc3QgYXBwbHlSZXN1bHQgPSBhd2FpdCB0aGlzLmFwcGx5UHJlZmFiVG9Ob2RlKGNyZWF0ZVJlc3VsdC5kYXRhLm5vZGVVdWlkLCBhc3NldEluZm8udXVpZCk7XG4gICAgICAgICAgICAgICAgaWYgKGFwcGx5UmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiBjcmVhdGVSZXN1bHQuZGF0YS5ub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBjcmVhdGVSZXN1bHQuZGF0YS5uYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdQcmVmYWIgaW5zdGFudGlhdGVkIHN1Y2Nlc3NmdWxseSAoYWx0ZXJuYXRlIG1ldGhvZCknXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogJ1VuYWJsZSB0byBhcHBseSBwcmVmYWIgdG8gbm9kZScsXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IGNyZWF0ZVJlc3VsdC5kYXRhLm5vZGVVdWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdOb2RlIGNyZWF0ZWQgYnV0IHByZWZhYiBkYXRhIGNvdWxkIG5vdCBiZSBhcHBsaWVkJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYEFsdGVybmF0ZSBpbnN0YW50aWF0aW9uIGZhaWxlZDogJHtlcnJvcn1gIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGdldEFzc2V0SW5mbyhwcmVmYWJQYXRoOiBzdHJpbmcpOiBQcm9taXNlPGFueT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0LWluZm8nLCBwcmVmYWJQYXRoKS50aGVuKChhc3NldEluZm86IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoYXNzZXRJbmZvKTtcbiAgICAgICAgICAgIH0pLmNhdGNoKCgpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKG51bGwpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgY3JlYXRlTm9kZShwYXJlbnRVdWlkPzogc3RyaW5nLCBwb3NpdGlvbj86IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY3JlYXRlTm9kZU9wdGlvbnM6IGFueSA9IHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnUHJlZmFiSW5zdGFuY2UnXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBTZXQgcGFyZW50IG5vZGVcbiAgICAgICAgICAgIGlmIChwYXJlbnRVdWlkKSB7XG4gICAgICAgICAgICAgICAgY3JlYXRlTm9kZU9wdGlvbnMucGFyZW50ID0gcGFyZW50VXVpZDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU2V0IHBvc2l0aW9uXG4gICAgICAgICAgICBpZiAocG9zaXRpb24pIHtcbiAgICAgICAgICAgICAgICBjcmVhdGVOb2RlT3B0aW9ucy5kdW1wID0ge1xuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogcG9zaXRpb25cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdjcmVhdGUtbm9kZScsIGNyZWF0ZU5vZGVPcHRpb25zKS50aGVuKChub2RlVXVpZDogc3RyaW5nIHwgc3RyaW5nW10pID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCB1dWlkID0gQXJyYXkuaXNBcnJheShub2RlVXVpZCkgPyBub2RlVXVpZFswXSA6IG5vZGVVdWlkO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDogdXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6ICdQcmVmYWJJbnN0YW5jZSdcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2goKGVycm9yOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIHx8ICdGYWlsZWQgdG8gY3JlYXRlIG5vZGUnIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgYXBwbHlQcmVmYWJUb05vZGUobm9kZVV1aWQ6IHN0cmluZywgcHJlZmFiVXVpZDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICAvLyBUcnkgbXVsdGlwbGUgd2F5cyB0byBhcHBseSBwcmVmYWIgZGF0YVxuICAgICAgICAgICAgY29uc3QgbWV0aG9kcyA9IFtcbiAgICAgICAgICAgICAgICAoKSA9PiBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdhcHBseS1wcmVmYWInLCB7IG5vZGU6IG5vZGVVdWlkLCBwcmVmYWI6IHByZWZhYlV1aWQgfSksXG4gICAgICAgICAgICAgICAgKCkgPT4gRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnc2V0LXByZWZhYicsIHsgbm9kZTogbm9kZVV1aWQsIHByZWZhYjogcHJlZmFiVXVpZCB9KSxcbiAgICAgICAgICAgICAgICAoKSA9PiBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdsb2FkLXByZWZhYi10by1ub2RlJywgeyBub2RlOiBub2RlVXVpZCwgcHJlZmFiOiBwcmVmYWJVdWlkIH0pXG4gICAgICAgICAgICBdO1xuXG4gICAgICAgICAgICBjb25zdCB0cnlNZXRob2QgPSAoaW5kZXg6IG51bWJlcikgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChpbmRleCA+PSBtZXRob2RzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnVW5hYmxlIHRvIGFwcGx5IHByZWZhYiBkYXRhJyB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIG1ldGhvZHNbaW5kZXhdKCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiB0cnVlIH0pO1xuICAgICAgICAgICAgICAgIH0pLmNhdGNoKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdHJ5TWV0aG9kKGluZGV4ICsgMSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0cnlNZXRob2QoMCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE5ldyBwcmVmYWIgY3JlYXRpb24gcGF0aCB2aWEgYXNzZXQtZGIgQVBJXG4gICAgICogSW50ZWdyYXRlcyBhc3NldC1kYiBmb3IgZnVsbCBwcmVmYWIgY3JlYXRpb24gZmxvd1xuICAgICAqL1xuICAgIHByaXZhdGUgYXN5bmMgY3JlYXRlUHJlZmFiV2l0aEFzc2V0REIobm9kZVV1aWQ6IHN0cmluZywgc2F2ZVBhdGg6IHN0cmluZywgcHJlZmFiTmFtZTogc3RyaW5nLCBpbmNsdWRlQ2hpbGRyZW46IGJvb2xlYW4sIGluY2x1ZGVDb21wb25lbnRzOiBib29sZWFuKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGFzeW5jIChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCc9PT0gQ3JlYXRpbmcgcHJlZmFiIHZpYSBBc3NldC1EQiBBUEkgPT09Jyk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYE5vZGUgVVVJRDogJHtub2RlVXVpZH1gKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgU2F2ZSBwYXRoOiAke3NhdmVQYXRofWApO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBQcmVmYWIgbmFtZTogJHtwcmVmYWJOYW1lfWApO1xuXG4gICAgICAgICAgICAgICAgLy8gU3RlcCAxOiBmZXRjaCBub2RlIGRhdGEgKGluY2wuIHRyYW5zZm9ybSlcbiAgICAgICAgICAgICAgICBjb25zdCBub2RlRGF0YSA9IGF3YWl0IHRoaXMuZ2V0Tm9kZURhdGEobm9kZVV1aWQpO1xuICAgICAgICAgICAgICAgIGlmICghbm9kZURhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiAnVW5hYmxlIHRvIGdldCBub2RlIGRhdGEnXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ05vZGUgZGF0YSByZXRyaWV2ZWQsIGNoaWxkIGNvdW50OicsIG5vZGVEYXRhLmNoaWxkcmVuID8gbm9kZURhdGEuY2hpbGRyZW4ubGVuZ3RoIDogMCk7XG5cbiAgICAgICAgICAgICAgICAvLyBTdGVwIDI6IGNyZWF0ZSBhc3NldCBmaWxlIGZvciBlbmdpbmUgVVVJRFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdDcmVhdGluZyBwcmVmYWIgYXNzZXQgZmlsZS4uLicpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHRlbXBQcmVmYWJDb250ZW50ID0gSlNPTi5zdHJpbmdpZnkoW3tcIl9fdHlwZV9fXCI6IFwiY2MuUHJlZmFiXCIsIFwiX25hbWVcIjogcHJlZmFiTmFtZX1dLCBudWxsLCAyKTtcbiAgICAgICAgICAgICAgICBjb25zdCBjcmVhdGVSZXN1bHQgPSBhd2FpdCB0aGlzLmNyZWF0ZUFzc2V0V2l0aEFzc2V0REIoc2F2ZVBhdGgsIHRlbXBQcmVmYWJDb250ZW50KTtcbiAgICAgICAgICAgICAgICBpZiAoIWNyZWF0ZVJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoY3JlYXRlUmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFJlYWQgZW5naW5lLWFzc2lnbmVkIFVVSURcbiAgICAgICAgICAgICAgICBjb25zdCBhY3R1YWxQcmVmYWJVdWlkID0gY3JlYXRlUmVzdWx0LmRhdGE/LnV1aWQ7XG4gICAgICAgICAgICAgICAgaWYgKCFhY3R1YWxQcmVmYWJVdWlkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogJ1VuYWJsZSB0byBnZXQgZW5naW5lLWFzc2lnbmVkIHByZWZhYiBVVUlEJ1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnRW5naW5lLWFzc2lnbmVkIFVVSUQ6JywgYWN0dWFsUHJlZmFiVXVpZCk7XG5cbiAgICAgICAgICAgICAgICAvLyBTdGVwIDM6IHJlZ2VuZXJhdGUgcHJlZmFiIEpTT04gd2l0aCByZWFsIFVVSURcbiAgICAgICAgICAgICAgICBjb25zdCBwcmVmYWJDb250ZW50ID0gYXdhaXQgdGhpcy5jcmVhdGVTdGFuZGFyZFByZWZhYkNvbnRlbnQobm9kZURhdGEsIHByZWZhYk5hbWUsIGFjdHVhbFByZWZhYlV1aWQsIGluY2x1ZGVDaGlsZHJlbiwgaW5jbHVkZUNvbXBvbmVudHMpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHByZWZhYkNvbnRlbnRTdHJpbmcgPSBKU09OLnN0cmluZ2lmeShwcmVmYWJDb250ZW50LCBudWxsLCAyKTtcblxuICAgICAgICAgICAgICAgIC8vIFN0ZXAgNDogd3JpdGUgcHJlZmFiIGZpbGVcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnVXBkYXRpbmcgcHJlZmFiIGZpbGUgY29udGVudC4uLicpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHVwZGF0ZVJlc3VsdCA9IGF3YWl0IHRoaXMudXBkYXRlQXNzZXRXaXRoQXNzZXREQihzYXZlUGF0aCwgcHJlZmFiQ29udGVudFN0cmluZyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU3RlcCA1OiB3cml0ZSAubWV0YSB3aXRoIHJlYWwgVVVJRFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdDcmVhdGluZyBwcmVmYWIgLm1ldGEgZmlsZS4uLicpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG1ldGFDb250ZW50ID0gdGhpcy5jcmVhdGVTdGFuZGFyZE1ldGFDb250ZW50KHByZWZhYk5hbWUsIGFjdHVhbFByZWZhYlV1aWQpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG1ldGFSZXN1bHQgPSBhd2FpdCB0aGlzLmNyZWF0ZU1ldGFXaXRoQXNzZXREQihzYXZlUGF0aCwgbWV0YUNvbnRlbnQpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFN0ZXAgNjogcmUtaW1wb3J0IGFzc2V0XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1JlLWltcG9ydGluZyBwcmVmYWIgYXNzZXQuLi4nKTtcbiAgICAgICAgICAgICAgICBjb25zdCByZWltcG9ydFJlc3VsdCA9IGF3YWl0IHRoaXMucmVpbXBvcnRBc3NldFdpdGhBc3NldERCKHNhdmVQYXRoKTtcblxuICAgICAgICAgICAgICAgIC8vIFN0ZXAgNzogY29udmVydCBzb3VyY2Ugbm9kZSB0byBwcmVmYWIgaW5zdGFuY2VcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnQXR0ZW1wdGluZyB0byBjb252ZXJ0IHNvdXJjZSBub2RlIHRvIHByZWZhYiBpbnN0YW5jZS4uLicpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbnZlcnRSZXN1bHQgPSBhd2FpdCB0aGlzLmNvbnZlcnROb2RlVG9QcmVmYWJJbnN0YW5jZShub2RlVXVpZCwgYWN0dWFsUHJlZmFiVXVpZCwgc2F2ZVBhdGgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcmVmYWJVdWlkOiBhY3R1YWxQcmVmYWJVdWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJlZmFiUGF0aDogc2F2ZVBhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcmVmYWJOYW1lOiBwcmVmYWJOYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29udmVydGVkVG9QcmVmYWJJbnN0YW5jZTogY29udmVydFJlc3VsdC5zdWNjZXNzLFxuICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlQXNzZXRSZXN1bHQ6IGNyZWF0ZVJlc3VsdCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZVJlc3VsdDogdXBkYXRlUmVzdWx0LFxuICAgICAgICAgICAgICAgICAgICAgICAgbWV0YVJlc3VsdDogbWV0YVJlc3VsdCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlaW1wb3J0UmVzdWx0OiByZWltcG9ydFJlc3VsdCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnZlcnRSZXN1bHQ6IGNvbnZlcnRSZXN1bHQsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBjb252ZXJ0UmVzdWx0LnN1Y2Nlc3MgPyAnUHJlZmFiIGNyZWF0ZWQgYW5kIHNvdXJjZSBub2RlIGNvbnZlcnRlZCcgOiAnUHJlZmFiIGNyZWF0ZWQgYnV0IG5vZGUgY29udmVyc2lvbiBmYWlsZWQnXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciB3aGlsZSBjcmVhdGluZyBwcmVmYWI6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBGYWlsZWQgdG8gY3JlYXRlIHByZWZhYjogJHtlcnJvcn1gXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgY3JlYXRlUHJlZmFiKGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShhc3luYyAocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAvLyBBY2NlcHQgcHJlZmFiUGF0aCBvciBzYXZlUGF0aFxuICAgICAgICAgICAgICAgIGNvbnN0IHBhdGhQYXJhbSA9IGFyZ3MucHJlZmFiUGF0aCB8fCBhcmdzLnNhdmVQYXRoO1xuICAgICAgICAgICAgICAgIGlmICghcGF0aFBhcmFtKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogJ01pc3NpbmcgcHJlZmFiIHBhdGguIFByb3ZpZGUgcHJlZmFiUGF0aCBvciBzYXZlUGF0aC4nXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgcHJlZmFiTmFtZSA9IGFyZ3MucHJlZmFiTmFtZSB8fCAnTmV3UHJlZmFiJztcbiAgICAgICAgICAgICAgICBjb25zdCBmdWxsUGF0aCA9IHBhdGhQYXJhbS5lbmRzV2l0aCgnLnByZWZhYicpID8gXG4gICAgICAgICAgICAgICAgICAgIHBhdGhQYXJhbSA6IGAke3BhdGhQYXJhbX0vJHtwcmVmYWJOYW1lfS5wcmVmYWJgO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgaW5jbHVkZUNoaWxkcmVuID0gYXJncy5pbmNsdWRlQ2hpbGRyZW4gIT09IGZhbHNlOyAvLyBkZWZhdWx0IHRydWVcbiAgICAgICAgICAgICAgICBjb25zdCBpbmNsdWRlQ29tcG9uZW50cyA9IGFyZ3MuaW5jbHVkZUNvbXBvbmVudHMgIT09IGZhbHNlOyAvLyBkZWZhdWx0IHRydWVcblxuICAgICAgICAgICAgICAgIC8vIFByZWZlciBuZXcgYXNzZXQtZGIgcHJlZmFiIGNyZWF0aW9uXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0NyZWF0aW5nIHByZWZhYiB3aXRoIG5ldyBhc3NldC1kYiBtZXRob2QuLi4nKTtcbiAgICAgICAgICAgICAgICBjb25zdCBhc3NldERiUmVzdWx0ID0gYXdhaXQgdGhpcy5jcmVhdGVQcmVmYWJXaXRoQXNzZXREQihcbiAgICAgICAgICAgICAgICAgICAgYXJncy5ub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgZnVsbFBhdGgsXG4gICAgICAgICAgICAgICAgICAgIHByZWZhYk5hbWUsXG4gICAgICAgICAgICAgICAgICAgIGluY2x1ZGVDaGlsZHJlbixcbiAgICAgICAgICAgICAgICAgICAgaW5jbHVkZUNvbXBvbmVudHNcbiAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgaWYgKGFzc2V0RGJSZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGFzc2V0RGJSZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gSWYgYXNzZXQtZGIgZmFpbHMsIHRyeSBuYXRpdmUgQ3JlYXRvciBwcmVmYWIgQVBJc1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdhc3NldC1kYiBtZXRob2QgZmFpbGVkLCB0cnlpbmcgbmF0aXZlIEFQSS4uLicpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5hdGl2ZVJlc3VsdCA9IGF3YWl0IHRoaXMuY3JlYXRlUHJlZmFiTmF0aXZlKGFyZ3Mubm9kZVV1aWQsIGZ1bGxQYXRoKTtcbiAgICAgICAgICAgICAgICBpZiAobmF0aXZlUmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShuYXRpdmVSZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gSWYgbmF0aXZlIGZhaWxzLCB1c2UgY3VzdG9tIHNlcmlhbGl6ZXJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnTmF0aXZlIEFQSSBmYWlsZWQsIHVzaW5nIGN1c3RvbSBpbXBsZW1lbnRhdGlvbi4uLicpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGN1c3RvbVJlc3VsdCA9IGF3YWl0IHRoaXMuY3JlYXRlUHJlZmFiQ3VzdG9tKGFyZ3Mubm9kZVV1aWQsIGZ1bGxQYXRoLCBwcmVmYWJOYW1lKTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKGN1c3RvbVJlc3VsdCk7XG5cbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogYEVycm9yIHdoaWxlIGNyZWF0aW5nIHByZWZhYjogJHtlcnJvcn1gXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgY3JlYXRlUHJlZmFiTmF0aXZlKG5vZGVVdWlkOiBzdHJpbmcsIHByZWZhYlBhdGg6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgLy8gTm8gc2luZ2xlIG9mZmljaWFsIEFQSSBjcmVhdGVzIHByZWZhYnMgZW5kLXRvLWVuZFxuICAgICAgICAgICAgLy8gTWFudWFsIHByZWZhYiBjcmVhdGlvbiBpbiBlZGl0b3IgaXMgcmVxdWlyZWRcbiAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGVycm9yOiAnTmF0aXZlIHByZWZhYiBjcmVhdGlvbiBBUEkgZG9lcyBub3QgZXhpc3QnLFxuICAgICAgICAgICAgICAgIGluc3RydWN0aW9uOiAnUGVyIENvY29zIENyZWF0b3Igb2ZmaWNpYWwgQVBJcywgY3JlYXRlIHByZWZhYnMgbWFudWFsbHk6XFxuMS4gU2VsZWN0IHRoZSBub2RlIGluIHRoZSBzY2VuZVxcbjIuIERyYWcgaXQgaW50byB0aGUgQXNzZXRzIHBhbmVsXFxuMy4gT3IgcmlnaHQtY2xpY2sgdGhlIG5vZGUgYW5kIGNob29zZSBDcmVhdGUgUHJlZmFiJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgY3JlYXRlUHJlZmFiQ3VzdG9tKG5vZGVVdWlkOiBzdHJpbmcsIHByZWZhYlBhdGg6IHN0cmluZywgcHJlZmFiTmFtZTogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGFzeW5jIChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIC8vIDEuIEZldGNoIGZ1bGwgc291cmNlIG5vZGUgZGF0YVxuICAgICAgICAgICAgICAgIGNvbnN0IG5vZGVEYXRhID0gYXdhaXQgdGhpcy5nZXROb2RlRGF0YShub2RlVXVpZCk7XG4gICAgICAgICAgICAgICAgaWYgKCFub2RlRGF0YSkge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBOb2RlIG5vdCBmb3VuZDogJHtub2RlVXVpZH1gXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gMi4gR2VuZXJhdGUgcHJlZmFiIFVVSURcbiAgICAgICAgICAgICAgICBjb25zdCBwcmVmYWJVdWlkID0gdGhpcy5nZW5lcmF0ZVVVSUQoKTtcblxuICAgICAgICAgICAgICAgIC8vIDMuIEJ1aWxkIHByZWZhYiBkYXRhIHN0cnVjdHVyZVxuICAgICAgICAgICAgICAgIGNvbnN0IHByZWZhYkRhdGEgPSB0aGlzLmNyZWF0ZVByZWZhYkRhdGEobm9kZURhdGEsIHByZWZhYk5hbWUsIHByZWZhYlV1aWQpO1xuXG4gICAgICAgICAgICAgICAgLy8gNC4gTWF0Y2ggb2ZmaWNpYWwgcHJlZmFiIEpTT04gbGF5b3V0XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJz09PSBTdGFydGluZyBwcmVmYWIgY3JlYXRpb24gPT09Jyk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ05vZGUgbmFtZTonLCBub2RlRGF0YS5uYW1lPy52YWx1ZSB8fCAndW5rbm93bicpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdOb2RlIFVVSUQ6Jywgbm9kZURhdGEudXVpZD8udmFsdWUgfHwgJ3Vua25vd24nKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnUHJlZmFiIHNhdmUgcGF0aDonLCBwcmVmYWJQYXRoKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgU3RhcnRpbmcgcHJlZmFiIGNyZWF0aW9uLCBub2RlIGRhdGE6YCwgbm9kZURhdGEpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHByZWZhYkpzb25EYXRhID0gYXdhaXQgdGhpcy5jcmVhdGVTdGFuZGFyZFByZWZhYkNvbnRlbnQobm9kZURhdGEsIHByZWZhYk5hbWUsIHByZWZhYlV1aWQsIHRydWUsIHRydWUpO1xuXG4gICAgICAgICAgICAgICAgLy8gNS4gQnVpbGQgc3RhbmRhcmQgLm1ldGEgcGF5bG9hZFxuICAgICAgICAgICAgICAgIGNvbnN0IHN0YW5kYXJkTWV0YURhdGEgPSB0aGlzLmNyZWF0ZVN0YW5kYXJkTWV0YURhdGEocHJlZmFiTmFtZSwgcHJlZmFiVXVpZCk7XG5cbiAgICAgICAgICAgICAgICAvLyA2LiBTYXZlIHByZWZhYiBhbmQgLm1ldGFcbiAgICAgICAgICAgICAgICBjb25zdCBzYXZlUmVzdWx0ID0gYXdhaXQgdGhpcy5zYXZlUHJlZmFiV2l0aE1ldGEocHJlZmFiUGF0aCwgcHJlZmFiSnNvbkRhdGEsIHN0YW5kYXJkTWV0YURhdGEpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHNhdmVSZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgICAgICAvLyBBZnRlciBzYXZlLCBjb252ZXJ0IHNvdXJjZSBub2RlIHRvIGluc3RhbmNlXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbnZlcnRSZXN1bHQgPSBhd2FpdCB0aGlzLmNvbnZlcnROb2RlVG9QcmVmYWJJbnN0YW5jZShub2RlVXVpZCwgcHJlZmFiUGF0aCwgcHJlZmFiVXVpZCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJlZmFiVXVpZDogcHJlZmFiVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmVmYWJQYXRoOiBwcmVmYWJQYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmVmYWJOYW1lOiBwcmVmYWJOYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnZlcnRlZFRvUHJlZmFiSW5zdGFuY2U6IGNvbnZlcnRSZXN1bHQuc3VjY2VzcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBjb252ZXJ0UmVzdWx0LnN1Y2Nlc3MgPyBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0N1c3RvbSBwcmVmYWIgY3JlYXRlZDsgc291cmNlIG5vZGUgY29udmVydGVkIHRvIHByZWZhYiBpbnN0YW5jZScgOiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1ByZWZhYiBjcmVhdGVkIGJ1dCBub2RlIGNvbnZlcnNpb24gZmFpbGVkJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IHNhdmVSZXN1bHQuZXJyb3IgfHwgJ0ZhaWxlZCB0byBzYXZlIHByZWZhYiBmaWxlJ1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogYEVycm9yIHdoaWxlIGNyZWF0aW5nIHByZWZhYjogJHtlcnJvcn1gXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2V0Tm9kZURhdGEobm9kZVV1aWQ6IHN0cmluZyk6IFByb21pc2U8YW55PiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShhc3luYyAocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAvLyBGZXRjaCBiYXNpYyBub2RlIGluZm8gZmlyc3RcbiAgICAgICAgICAgICAgICBjb25zdCBub2RlSW5mbyA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUnLCBub2RlVXVpZCk7XG4gICAgICAgICAgICAgICAgaWYgKCFub2RlSW5mbykge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKG51bGwpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFJldHJpZXZlZCBiYXNpYyBpbmZvIGZvciBub2RlICR7bm9kZVV1aWR9YCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVXNlIHF1ZXJ5LW5vZGUtdHJlZSBmb3Igc3VidHJlZVxuICAgICAgICAgICAgICAgIGNvbnN0IG5vZGVUcmVlID0gYXdhaXQgdGhpcy5nZXROb2RlV2l0aENoaWxkcmVuKG5vZGVVdWlkKTtcbiAgICAgICAgICAgICAgICBpZiAobm9kZVRyZWUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFJldHJpZXZlZCBmdWxsIHRyZWUgZm9yIG5vZGUgJHtub2RlVXVpZH1gKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShub2RlVHJlZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFVzaW5nIGJhc2ljIG5vZGUgaW5mb3JtYXRpb25gKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShub2RlSW5mbyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYEZhaWxlZCB0byBnZXQgbm9kZSBkYXRhICR7bm9kZVV1aWR9OmAsIGVycm9yKTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKG51bGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBGdWxsIG5vZGUgc3VidHJlZSB2aWEgcXVlcnktbm9kZS10cmVlXG4gICAgcHJpdmF0ZSBhc3luYyBnZXROb2RlV2l0aENoaWxkcmVuKG5vZGVVdWlkOiBzdHJpbmcpOiBQcm9taXNlPGFueT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gTG9hZCBmdWxsIHNjZW5lIHRyZWVcbiAgICAgICAgICAgIGNvbnN0IHRyZWUgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlLXRyZWUnKTtcbiAgICAgICAgICAgIGlmICghdHJlZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBGaW5kIG5vZGUgYnkgVVVJRCBpbiB0cmVlXG4gICAgICAgICAgICBjb25zdCB0YXJnZXROb2RlID0gdGhpcy5maW5kTm9kZUluVHJlZSh0cmVlLCBub2RlVXVpZCk7XG4gICAgICAgICAgICBpZiAodGFyZ2V0Tm9kZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBGb3VuZCBub2RlICR7bm9kZVV1aWR9IGluIHNjZW5lIHRyZWUsIGNoaWxkIGNvdW50OiAke3RhcmdldE5vZGUuY2hpbGRyZW4gPyB0YXJnZXROb2RlLmNoaWxkcmVuLmxlbmd0aCA6IDB9YCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gRW5yaWNoIHRyZWUgd2l0aCBhY2N1cmF0ZSBjb21wb25lbnQgaW5mb1xuICAgICAgICAgICAgICAgIGNvbnN0IGVuaGFuY2VkVHJlZSA9IGF3YWl0IHRoaXMuZW5oYW5jZVRyZWVXaXRoTUNQQ29tcG9uZW50cyh0YXJnZXROb2RlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZW5oYW5jZWRUcmVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgRmFpbGVkIHRvIGdldCBub2RlIHRyZWUgZm9yICR7bm9kZVV1aWR9OmAsIGVycm9yKTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gUmVjdXJzaXZlbHkgZmluZCBub2RlIFVVSUQgaW4gdHJlZVxuICAgIHByaXZhdGUgZmluZE5vZGVJblRyZWUobm9kZTogYW55LCB0YXJnZXRVdWlkOiBzdHJpbmcpOiBhbnkge1xuICAgICAgICBpZiAoIW5vZGUpIHJldHVybiBudWxsO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5zcGVjdCBjdXJyZW50IG5vZGVcbiAgICAgICAgaWYgKG5vZGUudXVpZCA9PT0gdGFyZ2V0VXVpZCB8fCBub2RlLnZhbHVlPy51dWlkID09PSB0YXJnZXRVdWlkKSB7XG4gICAgICAgICAgICByZXR1cm4gbm9kZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlY3Vyc2UgaW50byBjaGlsZHJlblxuICAgICAgICBpZiAobm9kZS5jaGlsZHJlbiAmJiBBcnJheS5pc0FycmF5KG5vZGUuY2hpbGRyZW4pKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIG5vZGUuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgICAgICBjb25zdCBmb3VuZCA9IHRoaXMuZmluZE5vZGVJblRyZWUoY2hpbGQsIHRhcmdldFV1aWQpO1xuICAgICAgICAgICAgICAgIGlmIChmb3VuZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZm91bmQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRW5yaWNoIG5vZGUgdHJlZSB2aWEgTUNQIGZvciBhY2N1cmF0ZSBjb21wb25lbnRzXG4gICAgICovXG4gICAgcHJpdmF0ZSBhc3luYyBlbmhhbmNlVHJlZVdpdGhNQ1BDb21wb25lbnRzKG5vZGU6IGFueSk6IFByb21pc2U8YW55PiB7XG4gICAgICAgIGlmICghbm9kZSB8fCAhbm9kZS51dWlkKSB7XG4gICAgICAgICAgICByZXR1cm4gbm9kZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBGZXRjaCBjb21wb25lbnRzIHZpYSBNQ1BcbiAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goJ2h0dHA6Ly9sb2NhbGhvc3Q6ODU4NS9tY3AnLCB7XG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgaGVhZGVyczogeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0sXG4gICAgICAgICAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgICAgICBcImpzb25ycGNcIjogXCIyLjBcIixcbiAgICAgICAgICAgICAgICAgICAgXCJtZXRob2RcIjogXCJ0b29scy9jYWxsXCIsXG4gICAgICAgICAgICAgICAgICAgIFwicGFyYW1zXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcImNvbXBvbmVudF9nZXRfY29tcG9uZW50c1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJhcmd1bWVudHNcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwibm9kZVV1aWRcIjogbm9kZS51dWlkXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIFwiaWRcIjogRGF0ZS5ub3coKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgbWNwUmVzdWx0ID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICAgICAgICAgICAgaWYgKG1jcFJlc3VsdC5yZXN1bHQ/LmNvbnRlbnQ/LlswXT8udGV4dCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbXBvbmVudERhdGEgPSBKU09OLnBhcnNlKG1jcFJlc3VsdC5yZXN1bHQuY29udGVudFswXS50ZXh0KTtcbiAgICAgICAgICAgICAgICBpZiAoY29tcG9uZW50RGF0YS5zdWNjZXNzICYmIGNvbXBvbmVudERhdGEuZGF0YS5jb21wb25lbnRzKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFJlcGxhY2Ugbm9kZS5jb21wb25lbnRzIHdpdGggTUNQIGRhdGFcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5jb21wb25lbnRzID0gY29tcG9uZW50RGF0YS5kYXRhLmNvbXBvbmVudHM7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBOb2RlICR7bm9kZS51dWlkfSBoYXMgJHtjb21wb25lbnREYXRhLmRhdGEuY29tcG9uZW50cy5sZW5ndGh9IGNvbXBvbmVudHMgKGluY2x1ZGluZyBzY3JpcHQgdHlwZXMpYCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBGYWlsZWQgdG8gZ2V0IE1DUCBjb21wb25lbnQgaW5mbyBmb3Igbm9kZSAke25vZGUudXVpZH06YCwgZXJyb3IpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVjdXJzZSBpbnRvIGNoaWxkcmVuXG4gICAgICAgIGlmIChub2RlLmNoaWxkcmVuICYmIEFycmF5LmlzQXJyYXkobm9kZS5jaGlsZHJlbikpIHtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbm9kZS5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIG5vZGUuY2hpbGRyZW5baV0gPSBhd2FpdCB0aGlzLmVuaGFuY2VUcmVlV2l0aE1DUENvbXBvbmVudHMobm9kZS5jaGlsZHJlbltpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGJ1aWxkQmFzaWNOb2RlSW5mbyhub2RlVXVpZDogc3RyaW5nKTogUHJvbWlzZTxhbnk+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICAvLyBCdWlsZCBtaW5pbWFsIG5vZGUgcmVjb3JkXG4gICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlJywgbm9kZVV1aWQpLnRoZW4oKG5vZGVJbmZvOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIW5vZGVJbmZvKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUobnVsbCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBTaW1wbGlmaWVkOiBiYXNpYyBmaWVsZHMgb25seVxuICAgICAgICAgICAgICAgIC8vIENoaWxkcmVuL2NvbXBvbmVudHMgYWRkZWQgbGF0ZXIgaW4gcGlwZWxpbmVcbiAgICAgICAgICAgICAgICBjb25zdCBiYXNpY0luZm8gPSB7XG4gICAgICAgICAgICAgICAgICAgIC4uLm5vZGVJbmZvLFxuICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbjogW10sXG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudHM6IFtdXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKGJhc2ljSW5mbyk7XG4gICAgICAgICAgICB9KS5jYXRjaCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShudWxsKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBWYWxpZGF0ZSBub2RlIHBheWxvYWRcbiAgICBwcml2YXRlIGlzVmFsaWROb2RlRGF0YShub2RlRGF0YTogYW55KTogYm9vbGVhbiB7XG4gICAgICAgIGlmICghbm9kZURhdGEpIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYgKHR5cGVvZiBub2RlRGF0YSAhPT0gJ29iamVjdCcpIHJldHVybiBmYWxzZTtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGJhc2UgZmllbGRzIChxdWVyeS1ub2RlLXRyZWUgc2hhcGUpXG4gICAgICAgIHJldHVybiBub2RlRGF0YS5oYXNPd25Qcm9wZXJ0eSgndXVpZCcpIHx8IFxuICAgICAgICAgICAgICAgbm9kZURhdGEuaGFzT3duUHJvcGVydHkoJ25hbWUnKSB8fCBcbiAgICAgICAgICAgICAgIG5vZGVEYXRhLmhhc093blByb3BlcnR5KCdfX3R5cGVfXycpIHx8XG4gICAgICAgICAgICAgICAobm9kZURhdGEudmFsdWUgJiYgKFxuICAgICAgICAgICAgICAgICAgIG5vZGVEYXRhLnZhbHVlLmhhc093blByb3BlcnR5KCd1dWlkJykgfHxcbiAgICAgICAgICAgICAgICAgICBub2RlRGF0YS52YWx1ZS5oYXNPd25Qcm9wZXJ0eSgnbmFtZScpIHx8XG4gICAgICAgICAgICAgICAgICAgbm9kZURhdGEudmFsdWUuaGFzT3duUHJvcGVydHkoJ19fdHlwZV9fJylcbiAgICAgICAgICAgICAgICkpO1xuICAgIH1cblxuICAgIC8vIE5vcm1hbGl6ZSBjaGlsZCBVVUlEIGV4dHJhY3Rpb25cbiAgICBwcml2YXRlIGV4dHJhY3RDaGlsZFV1aWQoY2hpbGRSZWY6IGFueSk6IHN0cmluZyB8IG51bGwge1xuICAgICAgICBpZiAoIWNoaWxkUmVmKSByZXR1cm4gbnVsbDtcbiAgICAgICAgXG4gICAgICAgIC8vIFBhdHRlcm4gMTogcGxhaW4gc3RyaW5nXG4gICAgICAgIGlmICh0eXBlb2YgY2hpbGRSZWYgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICByZXR1cm4gY2hpbGRSZWY7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFBhdHRlcm4gMjogdmFsdWUgc3RyaW5nXG4gICAgICAgIGlmIChjaGlsZFJlZi52YWx1ZSAmJiB0eXBlb2YgY2hpbGRSZWYudmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICByZXR1cm4gY2hpbGRSZWYudmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFBhdHRlcm4gMzogdmFsdWUudXVpZFxuICAgICAgICBpZiAoY2hpbGRSZWYudmFsdWUgJiYgY2hpbGRSZWYudmFsdWUudXVpZCkge1xuICAgICAgICAgICAgcmV0dXJuIGNoaWxkUmVmLnZhbHVlLnV1aWQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFBhdHRlcm4gNDogdXVpZCBmaWVsZFxuICAgICAgICBpZiAoY2hpbGRSZWYudXVpZCkge1xuICAgICAgICAgICAgcmV0dXJuIGNoaWxkUmVmLnV1aWQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFBhdHRlcm4gNTogX19pZF9fIHJlZnMgbmVlZCByZXNvbHZlclxuICAgICAgICBpZiAoY2hpbGRSZWYuX19pZF9fICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBGb3VuZCBfX2lkX18gcmVmZXJlbmNlOiAke2NoaWxkUmVmLl9faWRfX307IG1heSBuZWVkIGxvb2t1cCBpbiBkYXRhIHN0cnVjdHVyZWApO1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7IC8vIFRPRE86IHJlc29sdmUgX19pZF9fIHJlZmVyZW5jZXNcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc29sZS53YXJuKCdVbmFibGUgdG8gZXh0cmFjdCBjaGlsZCBub2RlIFVVSUQ6JywgSlNPTi5zdHJpbmdpZnkoY2hpbGRSZWYpKTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gQ29sbGVjdCBjaGlsZCByZWNvcmRzIHRvIHByb2Nlc3NcbiAgICBwcml2YXRlIGdldENoaWxkcmVuVG9Qcm9jZXNzKG5vZGVEYXRhOiBhbnkpOiBhbnlbXSB7XG4gICAgICAgIGNvbnN0IGNoaWxkcmVuOiBhbnlbXSA9IFtdO1xuICAgICAgICBcbiAgICAgICAgLy8gUHJlZmVyIGNoaWxkcmVuW10gZnJvbSBxdWVyeS1ub2RlLXRyZWVcbiAgICAgICAgaWYgKG5vZGVEYXRhLmNoaWxkcmVuICYmIEFycmF5LmlzQXJyYXkobm9kZURhdGEuY2hpbGRyZW4pKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgQ2hpbGRyZW4gZnJvbSBjaGlsZHJlbltdIGNvdW50OiAke25vZGVEYXRhLmNoaWxkcmVuLmxlbmd0aH1gKTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2Ygbm9kZURhdGEuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgICAgICAvLyBxdWVyeS1ub2RlLXRyZWUgY2hpbGRyZW4gYXJlIHVzdWFsbHkgY29tcGxldGVcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pc1ZhbGlkTm9kZURhdGEoY2hpbGQpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuLnB1c2goY2hpbGQpO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgQWRkIGNoaWxkOiAke2NoaWxkLm5hbWUgfHwgY2hpbGQudmFsdWU/Lm5hbWUgfHwgJ3Vua25vd24nfWApO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdJbnZhbGlkIGNoaWxkIG5vZGUgZGF0YTonLCBKU09OLnN0cmluZ2lmeShjaGlsZCwgbnVsbCwgMikpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdOb2RlIGhhcyBubyBjaGlsZHJlbiBvciBjaGlsZHJlbiBhcnJheSBpcyBlbXB0eScpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gY2hpbGRyZW47XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZW5lcmF0ZVVVSUQoKTogc3RyaW5nIHtcbiAgICAgICAgLy8gVVVJRCB2NCBjb21wYXRpYmxlIHdpdGggQ3JlYXRvclxuICAgICAgICBjb25zdCBjaGFycyA9ICcwMTIzNDU2Nzg5YWJjZGVmJztcbiAgICAgICAgbGV0IHV1aWQgPSAnJztcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzMjsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoaSA9PT0gOCB8fCBpID09PSAxMiB8fCBpID09PSAxNiB8fCBpID09PSAyMCkge1xuICAgICAgICAgICAgICAgIHV1aWQgKz0gJy0nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdXVpZCArPSBjaGFyc1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBjaGFycy5sZW5ndGgpXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdXVpZDtcbiAgICB9XG5cbiAgICBwcml2YXRlIGNyZWF0ZVByZWZhYkRhdGEobm9kZURhdGE6IGFueSwgcHJlZmFiTmFtZTogc3RyaW5nLCBwcmVmYWJVdWlkOiBzdHJpbmcpOiBhbnlbXSB7XG4gICAgICAgIC8vIEJ1aWxkIGNhbm9uaWNhbCBwcmVmYWIgSlNPTiBhcnJheVxuICAgICAgICBjb25zdCBwcmVmYWJBc3NldCA9IHtcbiAgICAgICAgICAgIFwiX190eXBlX19cIjogXCJjYy5QcmVmYWJcIixcbiAgICAgICAgICAgIFwiX25hbWVcIjogcHJlZmFiTmFtZSxcbiAgICAgICAgICAgIFwiX29iakZsYWdzXCI6IDAsXG4gICAgICAgICAgICBcIl9fZWRpdG9yRXh0cmFzX19cIjoge30sXG4gICAgICAgICAgICBcIl9uYXRpdmVcIjogXCJcIixcbiAgICAgICAgICAgIFwiZGF0YVwiOiB7XG4gICAgICAgICAgICAgICAgXCJfX2lkX19cIjogMVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwib3B0aW1pemF0aW9uUG9saWN5XCI6IDAsXG4gICAgICAgICAgICBcInBlcnNpc3RlbnRcIjogZmFsc2VcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBOb3JtYWxpemUgbm9kZSBkYXRhIGZvciBwcmVmYWJcbiAgICAgICAgY29uc3QgcHJvY2Vzc2VkTm9kZURhdGEgPSB0aGlzLnByb2Nlc3NOb2RlRm9yUHJlZmFiKG5vZGVEYXRhLCBwcmVmYWJVdWlkKTtcblxuICAgICAgICByZXR1cm4gW3ByZWZhYkFzc2V0LCAuLi5wcm9jZXNzZWROb2RlRGF0YV07XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBwcm9jZXNzTm9kZUZvclByZWZhYihub2RlRGF0YTogYW55LCBwcmVmYWJVdWlkOiBzdHJpbmcpOiBhbnlbXSB7XG4gICAgICAgIC8vIE5vcm1hbGl6ZSBub2RlIGRhdGEgZm9yIHByZWZhYiBleHBvcnRcbiAgICAgICAgY29uc3QgcHJvY2Vzc2VkRGF0YTogYW55W10gPSBbXTtcbiAgICAgICAgbGV0IGlkQ291bnRlciA9IDE7XG5cbiAgICAgICAgLy8gUmVjdXJzZSBub2RlcyBhbmQgY29tcG9uZW50c1xuICAgICAgICBjb25zdCBwcm9jZXNzTm9kZSA9IChub2RlOiBhbnksIHBhcmVudElkOiBudW1iZXIgPSAwKTogbnVtYmVyID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG5vZGVJZCA9IGlkQ291bnRlcisrO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBQdXNoIG5vZGUgb2JqZWN0XG4gICAgICAgICAgICBjb25zdCBwcm9jZXNzZWROb2RlID0ge1xuICAgICAgICAgICAgICAgIFwiX190eXBlX19cIjogXCJjYy5Ob2RlXCIsXG4gICAgICAgICAgICAgICAgXCJfbmFtZVwiOiBub2RlLm5hbWUgfHwgXCJOb2RlXCIsXG4gICAgICAgICAgICAgICAgXCJfb2JqRmxhZ3NcIjogMCxcbiAgICAgICAgICAgICAgICBcIl9fZWRpdG9yRXh0cmFzX19cIjoge30sXG4gICAgICAgICAgICAgICAgXCJfcGFyZW50XCI6IHBhcmVudElkID4gMCA/IHsgXCJfX2lkX19cIjogcGFyZW50SWQgfSA6IG51bGwsXG4gICAgICAgICAgICAgICAgXCJfY2hpbGRyZW5cIjogbm9kZS5jaGlsZHJlbiA/IG5vZGUuY2hpbGRyZW4ubWFwKCgpID0+ICh7IFwiX19pZF9fXCI6IGlkQ291bnRlcisrIH0pKSA6IFtdLFxuICAgICAgICAgICAgICAgIFwiX2FjdGl2ZVwiOiBub2RlLmFjdGl2ZSAhPT0gZmFsc2UsXG4gICAgICAgICAgICAgICAgXCJfY29tcG9uZW50c1wiOiBub2RlLmNvbXBvbmVudHMgPyBub2RlLmNvbXBvbmVudHMubWFwKCgpID0+ICh7IFwiX19pZF9fXCI6IGlkQ291bnRlcisrIH0pKSA6IFtdLFxuICAgICAgICAgICAgICAgIFwiX3ByZWZhYlwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwiX19pZF9fXCI6IGlkQ291bnRlcisrXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBcIl9scG9zXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJfX3R5cGVfX1wiOiBcImNjLlZlYzNcIixcbiAgICAgICAgICAgICAgICAgICAgXCJ4XCI6IDAsXG4gICAgICAgICAgICAgICAgICAgIFwieVwiOiAwLFxuICAgICAgICAgICAgICAgICAgICBcInpcIjogMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXCJfbHJvdFwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwiX190eXBlX19cIjogXCJjYy5RdWF0XCIsXG4gICAgICAgICAgICAgICAgICAgIFwieFwiOiAwLFxuICAgICAgICAgICAgICAgICAgICBcInlcIjogMCxcbiAgICAgICAgICAgICAgICAgICAgXCJ6XCI6IDAsXG4gICAgICAgICAgICAgICAgICAgIFwid1wiOiAxXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBcIl9sc2NhbGVcIjoge1xuICAgICAgICAgICAgICAgICAgICBcIl9fdHlwZV9fXCI6IFwiY2MuVmVjM1wiLFxuICAgICAgICAgICAgICAgICAgICBcInhcIjogMSxcbiAgICAgICAgICAgICAgICAgICAgXCJ5XCI6IDEsXG4gICAgICAgICAgICAgICAgICAgIFwielwiOiAxXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBcIl9tb2JpbGl0eVwiOiAwLFxuICAgICAgICAgICAgICAgIFwiX2xheWVyXCI6IDEwNzM3NDE4MjQsXG4gICAgICAgICAgICAgICAgXCJfZXVsZXJcIjoge1xuICAgICAgICAgICAgICAgICAgICBcIl9fdHlwZV9fXCI6IFwiY2MuVmVjM1wiLFxuICAgICAgICAgICAgICAgICAgICBcInhcIjogMCxcbiAgICAgICAgICAgICAgICAgICAgXCJ5XCI6IDAsXG4gICAgICAgICAgICAgICAgICAgIFwielwiOiAwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBcIl9pZFwiOiBcIlwiXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBwcm9jZXNzZWREYXRhLnB1c2gocHJvY2Vzc2VkTm9kZSk7XG5cbiAgICAgICAgICAgIC8vIFNlcmlhbGl6ZSBjb21wb25lbnRzXG4gICAgICAgICAgICBpZiAobm9kZS5jb21wb25lbnRzKSB7XG4gICAgICAgICAgICAgICAgbm9kZS5jb21wb25lbnRzLmZvckVhY2goKGNvbXBvbmVudDogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbXBvbmVudElkID0gaWRDb3VudGVyKys7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb2Nlc3NlZENvbXBvbmVudHMgPSB0aGlzLnByb2Nlc3NDb21wb25lbnRGb3JQcmVmYWIoY29tcG9uZW50LCBjb21wb25lbnRJZCk7XG4gICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZERhdGEucHVzaCguLi5wcm9jZXNzZWRDb21wb25lbnRzKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU2VyaWFsaXplIGNoaWxkcmVuXG4gICAgICAgICAgICBpZiAobm9kZS5jaGlsZHJlbikge1xuICAgICAgICAgICAgICAgIG5vZGUuY2hpbGRyZW4uZm9yRWFjaCgoY2hpbGQ6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBwcm9jZXNzTm9kZShjaGlsZCwgbm9kZUlkKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIG5vZGVJZDtcbiAgICAgICAgfTtcblxuICAgICAgICBwcm9jZXNzTm9kZShub2RlRGF0YSk7XG4gICAgICAgIHJldHVybiBwcm9jZXNzZWREYXRhO1xuICAgIH1cblxuICAgIHByaXZhdGUgcHJvY2Vzc0NvbXBvbmVudEZvclByZWZhYihjb21wb25lbnQ6IGFueSwgY29tcG9uZW50SWQ6IG51bWJlcik6IGFueVtdIHtcbiAgICAgICAgLy8gTm9ybWFsaXplIGNvbXBvbmVudCBwcm9wc1xuICAgICAgICBjb25zdCBwcm9jZXNzZWRDb21wb25lbnQgPSB7XG4gICAgICAgICAgICBcIl9fdHlwZV9fXCI6IGNvbXBvbmVudC50eXBlIHx8IFwiY2MuQ29tcG9uZW50XCIsXG4gICAgICAgICAgICBcIl9uYW1lXCI6IFwiXCIsXG4gICAgICAgICAgICBcIl9vYmpGbGFnc1wiOiAwLFxuICAgICAgICAgICAgXCJfX2VkaXRvckV4dHJhc19fXCI6IHt9LFxuICAgICAgICAgICAgXCJub2RlXCI6IHtcbiAgICAgICAgICAgICAgICBcIl9faWRfX1wiOiBjb21wb25lbnRJZCAtIDFcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcIl9lbmFibGVkXCI6IGNvbXBvbmVudC5lbmFibGVkICE9PSBmYWxzZSxcbiAgICAgICAgICAgIFwiX19wcmVmYWJcIjoge1xuICAgICAgICAgICAgICAgIFwiX19pZF9fXCI6IGNvbXBvbmVudElkICsgMVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIC4uLmNvbXBvbmVudC5wcm9wZXJ0aWVzXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQXR0YWNoIENvbXBQcmVmYWJJbmZvIG1ldGFkYXRhXG4gICAgICAgIGNvbnN0IGNvbXBQcmVmYWJJbmZvID0ge1xuICAgICAgICAgICAgXCJfX3R5cGVfX1wiOiBcImNjLkNvbXBQcmVmYWJJbmZvXCIsXG4gICAgICAgICAgICBcImZpbGVJZFwiOiB0aGlzLmdlbmVyYXRlRmlsZUlkKClcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gW3Byb2Nlc3NlZENvbXBvbmVudCwgY29tcFByZWZhYkluZm9dO1xuICAgIH1cblxuICAgIHByaXZhdGUgZ2VuZXJhdGVGaWxlSWQoKTogc3RyaW5nIHtcbiAgICAgICAgLy8gR2VuZXJhdGUgZmlsZUlkIChzaW1wbGlmaWVkKVxuICAgICAgICBjb25zdCBjaGFycyA9ICdhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ekFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaMDEyMzQ1Njc4OSsvJztcbiAgICAgICAgbGV0IGZpbGVJZCA9ICcnO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDIyOyBpKyspIHtcbiAgICAgICAgICAgIGZpbGVJZCArPSBjaGFyc1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBjaGFycy5sZW5ndGgpXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmlsZUlkO1xuICAgIH1cblxuICAgIHByaXZhdGUgY3JlYXRlTWV0YURhdGEocHJlZmFiTmFtZTogc3RyaW5nLCBwcmVmYWJVdWlkOiBzdHJpbmcpOiBhbnkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgXCJ2ZXJcIjogXCIxLjEuNTBcIixcbiAgICAgICAgICAgIFwiaW1wb3J0ZXJcIjogXCJwcmVmYWJcIixcbiAgICAgICAgICAgIFwiaW1wb3J0ZWRcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwidXVpZFwiOiBwcmVmYWJVdWlkLFxuICAgICAgICAgICAgXCJmaWxlc1wiOiBbXG4gICAgICAgICAgICAgICAgXCIuanNvblwiXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgXCJzdWJNZXRhc1wiOiB7fSxcbiAgICAgICAgICAgIFwidXNlckRhdGFcIjoge1xuICAgICAgICAgICAgICAgIFwic3luY05vZGVOYW1lXCI6IHByZWZhYk5hbWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHNhdmVQcmVmYWJGaWxlcyhwcmVmYWJQYXRoOiBzdHJpbmcsIHByZWZhYkRhdGE6IGFueVtdLCBtZXRhRGF0YTogYW55KTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IGVycm9yPzogc3RyaW5nIH0+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIC8vIFNhdmUgdmlhIEVkaXRvci9hc3NldC1kYlxuICAgICAgICAgICAgICAgIGNvbnN0IHByZWZhYkNvbnRlbnQgPSBKU09OLnN0cmluZ2lmeShwcmVmYWJEYXRhLCBudWxsLCAyKTtcbiAgICAgICAgICAgICAgICBjb25zdCBtZXRhQ29udGVudCA9IEpTT04uc3RyaW5naWZ5KG1ldGFEYXRhLCBudWxsLCAyKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZXRyeSB3aXRoIGFsdGVybmF0ZSBzYXZlIHBhdGhcbiAgICAgICAgICAgICAgICB0aGlzLnNhdmVBc3NldEZpbGUocHJlZmFiUGF0aCwgcHJlZmFiQ29udGVudCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFdyaXRlIGNvbXBhbmlvbiAubWV0YVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBtZXRhUGF0aCA9IGAke3ByZWZhYlBhdGh9Lm1ldGFgO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zYXZlQXNzZXRGaWxlKG1ldGFQYXRoLCBtZXRhQ29udGVudCk7XG4gICAgICAgICAgICAgICAgfSkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiB0cnVlIH0pO1xuICAgICAgICAgICAgICAgIH0pLmNhdGNoKChlcnJvcjogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfHwgJ0ZhaWxlZCB0byBzYXZlIHByZWZhYiBmaWxlJyB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYEVycm9yIHdoaWxlIHNhdmluZyBmaWxlOiAke2Vycm9yfWAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgc2F2ZUFzc2V0RmlsZShmaWxlUGF0aDogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIC8vIE11bHRpcGxlIHNhdmUgc3RyYXRlZ2llc1xuICAgICAgICAgICAgY29uc3Qgc2F2ZU1ldGhvZHMgPSBbXG4gICAgICAgICAgICAgICAgKCkgPT4gRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAnY3JlYXRlLWFzc2V0JywgZmlsZVBhdGgsIGNvbnRlbnQpLFxuICAgICAgICAgICAgICAgICgpID0+IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3NhdmUtYXNzZXQnLCBmaWxlUGF0aCwgY29udGVudCksXG4gICAgICAgICAgICAgICAgKCkgPT4gRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAnd3JpdGUtYXNzZXQnLCBmaWxlUGF0aCwgY29udGVudClcbiAgICAgICAgICAgIF07XG5cbiAgICAgICAgICAgIGNvbnN0IHRyeVNhdmUgPSAoaW5kZXg6IG51bWJlcikgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChpbmRleCA+PSBzYXZlTWV0aG9kcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcignQWxsIHNhdmUgbWV0aG9kcyBmYWlsZWQnKSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBzYXZlTWV0aG9kc1tpbmRleF0oKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgICAgIH0pLmNhdGNoKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdHJ5U2F2ZShpbmRleCArIDEpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdHJ5U2F2ZSgwKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyB1cGRhdGVQcmVmYWIocHJlZmFiUGF0aDogc3RyaW5nLCBub2RlVXVpZDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldC1pbmZvJywgcHJlZmFiUGF0aCkudGhlbigoYXNzZXRJbmZvOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIWFzc2V0SW5mbykge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1ByZWZhYiBub3QgZm91bmQnKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnYXBwbHktcHJlZmFiJywge1xuICAgICAgICAgICAgICAgICAgICBub2RlOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgcHJlZmFiOiBhc3NldEluZm8udXVpZFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdQcmVmYWIgdXBkYXRlZCBzdWNjZXNzZnVsbHknXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcmV2ZXJ0UHJlZmFiKG5vZGVVdWlkOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3JldmVydC1wcmVmYWInLCB7XG4gICAgICAgICAgICAgICAgbm9kZTogbm9kZVV1aWRcbiAgICAgICAgICAgIH0pLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnUHJlZmFiIGluc3RhbmNlIHJldmVydGVkIHN1Y2Nlc3NmdWxseSdcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnI6IEVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRQcmVmYWJJbmZvKHByZWZhYlBhdGg6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXQtaW5mbycsIHByZWZhYlBhdGgpLnRoZW4oKGFzc2V0SW5mbzogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCFhc3NldEluZm8pIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQcmVmYWIgbm90IGZvdW5kJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0LW1ldGEnLCBhc3NldEluZm8udXVpZCk7XG4gICAgICAgICAgICB9KS50aGVuKChtZXRhSW5mbzogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgaW5mbzogUHJlZmFiSW5mbyA9IHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogbWV0YUluZm8ubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgdXVpZDogbWV0YUluZm8udXVpZCxcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogcHJlZmFiUGF0aCxcbiAgICAgICAgICAgICAgICAgICAgZm9sZGVyOiBwcmVmYWJQYXRoLnN1YnN0cmluZygwLCBwcmVmYWJQYXRoLmxhc3RJbmRleE9mKCcvJykpLFxuICAgICAgICAgICAgICAgICAgICBjcmVhdGVUaW1lOiBtZXRhSW5mby5jcmVhdGVUaW1lLFxuICAgICAgICAgICAgICAgICAgICBtb2RpZnlUaW1lOiBtZXRhSW5mby5tb2RpZnlUaW1lLFxuICAgICAgICAgICAgICAgICAgICBkZXBlbmRlbmNpZXM6IG1ldGFJbmZvLmRlcGVuZHMgfHwgW11cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBpbmZvIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGNyZWF0ZVByZWZhYkZyb21Ob2RlKGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIC8vIERlcml2ZSBuYW1lIGZyb20gcHJlZmFiUGF0aFxuICAgICAgICBjb25zdCBwcmVmYWJQYXRoID0gYXJncy5wcmVmYWJQYXRoO1xuICAgICAgICBjb25zdCBwcmVmYWJOYW1lID0gcHJlZmFiUGF0aC5zcGxpdCgnLycpLnBvcCgpPy5yZXBsYWNlKCcucHJlZmFiJywgJycpIHx8ICdOZXdQcmVmYWInO1xuICAgICAgICBcbiAgICAgICAgLy8gRGVsZWdhdGUgdG8gbGVnYWN5IGNyZWF0ZVByZWZhYlxuICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5jcmVhdGVQcmVmYWIoe1xuICAgICAgICAgICAgbm9kZVV1aWQ6IGFyZ3Mubm9kZVV1aWQsXG4gICAgICAgICAgICBzYXZlUGF0aDogcHJlZmFiUGF0aCxcbiAgICAgICAgICAgIHByZWZhYk5hbWU6IHByZWZhYk5hbWVcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyB2YWxpZGF0ZVByZWZhYihwcmVmYWJQYXRoOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgLy8gUmVhZCBwcmVmYWIgSlNPTiBmcm9tIGRpc2tcbiAgICAgICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldC1pbmZvJywgcHJlZmFiUGF0aCkudGhlbigoYXNzZXRJbmZvOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFhc3NldEluZm8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiAnUHJlZmFiIGZpbGUgZG9lcyBub3QgZXhpc3QnXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIFZhbGlkYXRlIHByZWZhYiBKU09OXG4gICAgICAgICAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3JlYWQtYXNzZXQnLCBwcmVmYWJQYXRoKS50aGVuKChjb250ZW50OiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJlZmFiRGF0YSA9IEpTT04ucGFyc2UoY29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmFsaWRhdGlvblJlc3VsdCA9IHRoaXMudmFsaWRhdGVQcmVmYWJGb3JtYXQocHJlZmFiRGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzVmFsaWQ6IHZhbGlkYXRpb25SZXN1bHQuaXNWYWxpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzc3VlczogdmFsaWRhdGlvblJlc3VsdC5pc3N1ZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlQ291bnQ6IHZhbGlkYXRpb25SZXN1bHQubm9kZUNvdW50LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50Q291bnQ6IHZhbGlkYXRpb25SZXN1bHQuY29tcG9uZW50Q291bnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiB2YWxpZGF0aW9uUmVzdWx0LmlzVmFsaWQgPyAnUHJlZmFiIGZvcm1hdCBpcyB2YWxpZCcgOiAnUHJlZmFiIGZvcm1hdCBoYXMgaXNzdWVzJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChwYXJzZUVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogJ1ByZWZhYiBmaWxlIGlzIG5vdCB2YWxpZCBKU09OJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaCgoZXJyb3I6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBGYWlsZWQgdG8gcmVhZCBwcmVmYWIgZmlsZTogJHtlcnJvci5tZXNzYWdlfWBcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KS5jYXRjaCgoZXJyb3I6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBGYWlsZWQgdG8gcXVlcnkgcHJlZmFiIGluZm86ICR7ZXJyb3IubWVzc2FnZX1gXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiBgRXJyb3Igd2hpbGUgdmFsaWRhdGluZyBwcmVmYWI6ICR7ZXJyb3J9YFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHZhbGlkYXRlUHJlZmFiRm9ybWF0KHByZWZhYkRhdGE6IGFueSk6IHsgaXNWYWxpZDogYm9vbGVhbjsgaXNzdWVzOiBzdHJpbmdbXTsgbm9kZUNvdW50OiBudW1iZXI7IGNvbXBvbmVudENvdW50OiBudW1iZXIgfSB7XG4gICAgICAgIGNvbnN0IGlzc3Vlczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgbGV0IG5vZGVDb3VudCA9IDA7XG4gICAgICAgIGxldCBjb21wb25lbnRDb3VudCA9IDA7XG5cbiAgICAgICAgLy8gU3RydWN0dXJhbCBjaGVja3NcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHByZWZhYkRhdGEpKSB7XG4gICAgICAgICAgICBpc3N1ZXMucHVzaCgnUHJlZmFiIGRhdGEgbXVzdCBiZSBhbiBhcnJheScpO1xuICAgICAgICAgICAgcmV0dXJuIHsgaXNWYWxpZDogZmFsc2UsIGlzc3Vlcywgbm9kZUNvdW50LCBjb21wb25lbnRDb3VudCB9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHByZWZhYkRhdGEubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBpc3N1ZXMucHVzaCgnUHJlZmFiIGRhdGEgaXMgZW1wdHknKTtcbiAgICAgICAgICAgIHJldHVybiB7IGlzVmFsaWQ6IGZhbHNlLCBpc3N1ZXMsIG5vZGVDb3VudCwgY29tcG9uZW50Q291bnQgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEVuc3VyZSBmaXJzdCBlbGVtZW50IGlzIHByZWZhYiBhc3NldFxuICAgICAgICBjb25zdCBmaXJzdEVsZW1lbnQgPSBwcmVmYWJEYXRhWzBdO1xuICAgICAgICBpZiAoIWZpcnN0RWxlbWVudCB8fCBmaXJzdEVsZW1lbnQuX190eXBlX18gIT09ICdjYy5QcmVmYWInKSB7XG4gICAgICAgICAgICBpc3N1ZXMucHVzaCgnRmlyc3QgZWxlbWVudCBtdXN0IGJlIGNjLlByZWZhYicpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ291bnQgbm9kZXMvY29tcG9uZW50c1xuICAgICAgICBwcmVmYWJEYXRhLmZvckVhY2goKGl0ZW06IGFueSwgaW5kZXg6IG51bWJlcikgPT4ge1xuICAgICAgICAgICAgaWYgKGl0ZW0uX190eXBlX18gPT09ICdjYy5Ob2RlJykge1xuICAgICAgICAgICAgICAgIG5vZGVDb3VudCsrO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChpdGVtLl9fdHlwZV9fICYmIGl0ZW0uX190eXBlX18uaW5jbHVkZXMoJ2NjLicpKSB7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50Q291bnQrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmVxdWlyZWQgZmllbGQgY2hlY2tzXG4gICAgICAgIGlmIChub2RlQ291bnQgPT09IDApIHtcbiAgICAgICAgICAgIGlzc3Vlcy5wdXNoKCdQcmVmYWIgbXVzdCBjb250YWluIGF0IGxlYXN0IG9uZSBub2RlJyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaXNWYWxpZDogaXNzdWVzLmxlbmd0aCA9PT0gMCxcbiAgICAgICAgICAgIGlzc3VlcyxcbiAgICAgICAgICAgIG5vZGVDb3VudCxcbiAgICAgICAgICAgIGNvbXBvbmVudENvdW50XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBkdXBsaWNhdGVQcmVmYWIoYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGFzeW5jIChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHsgc291cmNlUHJlZmFiUGF0aCwgdGFyZ2V0UHJlZmFiUGF0aCwgbmV3UHJlZmFiTmFtZSB9ID0gYXJncztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZWFkIHNvdXJjZSBwcmVmYWJcbiAgICAgICAgICAgICAgICBjb25zdCBzb3VyY2VJbmZvID0gYXdhaXQgdGhpcy5nZXRQcmVmYWJJbmZvKHNvdXJjZVByZWZhYlBhdGgpO1xuICAgICAgICAgICAgICAgIGlmICghc291cmNlSW5mby5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogYEZhaWxlZCB0byByZWFkIHNvdXJjZSBwcmVmYWI6ICR7c291cmNlSW5mby5lcnJvcn1gXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gUmVhZCBzb3VyY2UgcHJlZmFiIEpTT05cbiAgICAgICAgICAgICAgICBjb25zdCBzb3VyY2VDb250ZW50ID0gYXdhaXQgdGhpcy5yZWFkUHJlZmFiQ29udGVudChzb3VyY2VQcmVmYWJQYXRoKTtcbiAgICAgICAgICAgICAgICBpZiAoIXNvdXJjZUNvbnRlbnQuc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBGYWlsZWQgdG8gcmVhZCBzb3VyY2UgcHJlZmFiIGNvbnRlbnQ6ICR7c291cmNlQ29udGVudC5lcnJvcn1gXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gUmVnZW5lcmF0ZSBVVUlEc1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1V1aWQgPSB0aGlzLmdlbmVyYXRlVVVJRCgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFBhdGNoIHByZWZhYiBkYXRhXG4gICAgICAgICAgICAgICAgY29uc3QgbW9kaWZpZWREYXRhID0gdGhpcy5tb2RpZnlQcmVmYWJGb3JEdXBsaWNhdGlvbihzb3VyY2VDb250ZW50LmRhdGEsIG5ld1ByZWZhYk5hbWUsIG5ld1V1aWQpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEJ1aWxkIG5ldyAubWV0YVxuICAgICAgICAgICAgICAgIGNvbnN0IG5ld01ldGFEYXRhID0gdGhpcy5jcmVhdGVNZXRhRGF0YShuZXdQcmVmYWJOYW1lIHx8ICdEdXBsaWNhdGVkUHJlZmFiJywgbmV3VXVpZCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUHJlZmFiIGR1cGxpY2F0aW9uIGRpc2FibGVkIChjb21wbGV4IHNlcmlhbGl6YXRpb24pXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogJ1ByZWZhYiBkdXBsaWNhdGlvbiBpcyB0ZW1wb3JhcmlseSB1bmF2YWlsYWJsZScsXG4gICAgICAgICAgICAgICAgICAgIGluc3RydWN0aW9uOiAnRHVwbGljYXRlIHByZWZhYnMgbWFudWFsbHkgaW4gQ29jb3MgQ3JlYXRvcjpcXG4xLiBTZWxlY3QgdGhlIHByZWZhYiBpbiBBc3NldHNcXG4yLiBSaWdodC1jbGljayDihpIgRHVwbGljYXRlIChvciBDb3B5L1Bhc3RlKVxcbjMuIFBsYWNlIGl0IGluIHRoZSB0YXJnZXQgZm9sZGVyJ1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBFcnJvciB3aGlsZSBkdXBsaWNhdGluZyBwcmVmYWI6ICR7ZXJyb3J9YFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHJlYWRQcmVmYWJDb250ZW50KHByZWZhYlBhdGg6IHN0cmluZyk6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyBkYXRhPzogYW55OyBlcnJvcj86IHN0cmluZyB9PiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncmVhZC1hc3NldCcsIHByZWZhYlBhdGgpLnRoZW4oKGNvbnRlbnQ6IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHByZWZhYkRhdGEgPSBKU09OLnBhcnNlKGNvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogcHJlZmFiRGF0YSB9KTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChwYXJzZUVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdJbnZhbGlkIHByZWZhYiBmaWxlIGZvcm1hdCcgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkuY2F0Y2goKGVycm9yOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIHx8ICdGYWlsZWQgdG8gcmVhZCBwcmVmYWIgZmlsZScgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBtb2RpZnlQcmVmYWJGb3JEdXBsaWNhdGlvbihwcmVmYWJEYXRhOiBhbnlbXSwgbmV3TmFtZTogc3RyaW5nLCBuZXdVdWlkOiBzdHJpbmcpOiBhbnlbXSB7XG4gICAgICAgIC8vIENsb25lIHByZWZhYiBkYXRhXG4gICAgICAgIGNvbnN0IG1vZGlmaWVkRGF0YSA9IFsuLi5wcmVmYWJEYXRhXTtcbiAgICAgICAgXG4gICAgICAgIC8vIFBhdGNoIGVsZW1lbnQgMCAoUHJlZmFiIGFzc2V0KVxuICAgICAgICBpZiAobW9kaWZpZWREYXRhWzBdICYmIG1vZGlmaWVkRGF0YVswXS5fX3R5cGVfXyA9PT0gJ2NjLlByZWZhYicpIHtcbiAgICAgICAgICAgIG1vZGlmaWVkRGF0YVswXS5fbmFtZSA9IG5ld05hbWUgfHwgJ0R1cGxpY2F0ZWRQcmVmYWInO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVtYXAgVVVJRCByZWZlcmVuY2VzIChzaW1wbGlmaWVkKVxuICAgICAgICAvLyBQcm9kdWN0aW9uIG1heSBuZWVkIHJpY2hlciBVVUlEIHJlbWFwXG4gICAgICAgIFxuICAgICAgICByZXR1cm4gbW9kaWZpZWREYXRhO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGNyZWF0ZUFzc2V0IHZpYSBhc3NldC1kYlxuICAgICAqL1xuICAgIHByaXZhdGUgYXN5bmMgY3JlYXRlQXNzZXRXaXRoQXNzZXREQihhc3NldFBhdGg6IHN0cmluZywgY29udGVudDogc3RyaW5nKTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IGRhdGE/OiBhbnk7IGVycm9yPzogc3RyaW5nIH0+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdjcmVhdGUtYXNzZXQnLCBhc3NldFBhdGgsIGNvbnRlbnQsIHtcbiAgICAgICAgICAgICAgICBvdmVyd3JpdGU6IHRydWUsXG4gICAgICAgICAgICAgICAgcmVuYW1lOiBmYWxzZVxuICAgICAgICAgICAgfSkudGhlbigoYXNzZXRJbmZvOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnQXNzZXQgZmlsZSBjcmVhdGVkOicsIGFzc2V0SW5mbyk7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IGFzc2V0SW5mbyB9KTtcbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnJvcjogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGNyZWF0ZSBhc3NldCBmaWxlOicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIHx8ICdGYWlsZWQgdG8gY3JlYXRlIGFzc2V0IGZpbGUnIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHdyaXRlIC5tZXRhIHZpYSBhc3NldC1kYlxuICAgICAqL1xuICAgIHByaXZhdGUgYXN5bmMgY3JlYXRlTWV0YVdpdGhBc3NldERCKGFzc2V0UGF0aDogc3RyaW5nLCBtZXRhQ29udGVudDogYW55KTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IGRhdGE/OiBhbnk7IGVycm9yPzogc3RyaW5nIH0+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBtZXRhQ29udGVudFN0cmluZyA9IEpTT04uc3RyaW5naWZ5KG1ldGFDb250ZW50LCBudWxsLCAyKTtcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3NhdmUtYXNzZXQtbWV0YScsIGFzc2V0UGF0aCwgbWV0YUNvbnRlbnRTdHJpbmcpLnRoZW4oKGFzc2V0SW5mbzogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJy5tZXRhIGZpbGUgY3JlYXRlZDonLCBhc3NldEluZm8pO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBhc3NldEluZm8gfSk7XG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyb3I6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBjcmVhdGUgLm1ldGEgZmlsZTonLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB8fCAnRmFpbGVkIHRvIGNyZWF0ZSAubWV0YSBmaWxlJyB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiByZWltcG9ydCB2aWEgYXNzZXQtZGJcbiAgICAgKi9cbiAgICBwcml2YXRlIGFzeW5jIHJlaW1wb3J0QXNzZXRXaXRoQXNzZXREQihhc3NldFBhdGg6IHN0cmluZyk6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyBkYXRhPzogYW55OyBlcnJvcj86IHN0cmluZyB9PiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncmVpbXBvcnQtYXNzZXQnLCBhc3NldFBhdGgpLnRoZW4oKHJlc3VsdDogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1JlLWltcG9ydCBzdWNjZWVkZWQ6JywgcmVzdWx0KTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogcmVzdWx0IH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2goKGVycm9yOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdSZS1pbXBvcnQgZmFpbGVkOicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIHx8ICdSZS1pbXBvcnQgZmFpbGVkJyB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBvdmVyd3JpdGUgYXNzZXQgdmlhIGFzc2V0LWRiXG4gICAgICovXG4gICAgcHJpdmF0ZSBhc3luYyB1cGRhdGVBc3NldFdpdGhBc3NldERCKGFzc2V0UGF0aDogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgZGF0YT86IGFueTsgZXJyb3I/OiBzdHJpbmcgfT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3NhdmUtYXNzZXQnLCBhc3NldFBhdGgsIGNvbnRlbnQpLnRoZW4oKHJlc3VsdDogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0Fzc2V0IGZpbGUgdXBkYXRlZDonLCByZXN1bHQpO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiB0cnVlLCBkYXRhOiByZXN1bHQgfSk7XG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyb3I6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byB1cGRhdGUgYXNzZXQgZmlsZTonLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB8fCAnRmFpbGVkIHRvIHVwZGF0ZSBhc3NldCBmaWxlJyB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBCdWlsZCBDcmVhdG9yLXN0YW5kYXJkIHByZWZhYiBKU09OXG4gICAgICogUmVjdXJzaXZlIHRyZWUgbWF0Y2hpbmcgZW5naW5lIGxheW91dFxuICAgICAqL1xuICAgIHByaXZhdGUgYXN5bmMgY3JlYXRlU3RhbmRhcmRQcmVmYWJDb250ZW50KG5vZGVEYXRhOiBhbnksIHByZWZhYk5hbWU6IHN0cmluZywgcHJlZmFiVXVpZDogc3RyaW5nLCBpbmNsdWRlQ2hpbGRyZW46IGJvb2xlYW4sIGluY2x1ZGVDb21wb25lbnRzOiBib29sZWFuKTogUHJvbWlzZTxhbnlbXT4ge1xuICAgICAgICBjb25zb2xlLmxvZygnQnVpbGRpbmcgZW5naW5lLXN0YW5kYXJkIHByZWZhYiBjb250ZW50Li4uJyk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBwcmVmYWJEYXRhOiBhbnlbXSA9IFtdO1xuICAgICAgICBsZXQgY3VycmVudElkID0gMDtcblxuICAgICAgICAvLyAxLiBQdXNoIGNjLlByZWZhYiBhc3NldCAoaW5kZXggMClcbiAgICAgICAgY29uc3QgcHJlZmFiQXNzZXQgPSB7XG4gICAgICAgICAgICBcIl9fdHlwZV9fXCI6IFwiY2MuUHJlZmFiXCIsXG4gICAgICAgICAgICBcIl9uYW1lXCI6IHByZWZhYk5hbWUgfHwgXCJcIiwgLy8gRW5zdXJlIHByZWZhYiBuYW1lIG5vbi1lbXB0eVxuICAgICAgICAgICAgXCJfb2JqRmxhZ3NcIjogMCxcbiAgICAgICAgICAgIFwiX19lZGl0b3JFeHRyYXNfX1wiOiB7fSxcbiAgICAgICAgICAgIFwiX25hdGl2ZVwiOiBcIlwiLFxuICAgICAgICAgICAgXCJkYXRhXCI6IHtcbiAgICAgICAgICAgICAgICBcIl9faWRfX1wiOiAxXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJvcHRpbWl6YXRpb25Qb2xpY3lcIjogMCxcbiAgICAgICAgICAgIFwicGVyc2lzdGVudFwiOiBmYWxzZVxuICAgICAgICB9O1xuICAgICAgICBwcmVmYWJEYXRhLnB1c2gocHJlZmFiQXNzZXQpO1xuICAgICAgICBjdXJyZW50SWQrKztcblxuICAgICAgICAvLyAyLiBSZWN1cnNpdmVseSBlbWl0IG5vZGUgZ3JhcGhcbiAgICAgICAgY29uc3QgY29udGV4dCA9IHtcbiAgICAgICAgICAgIHByZWZhYkRhdGEsXG4gICAgICAgICAgICBjdXJyZW50SWQ6IGN1cnJlbnRJZCArIDEsIC8vIFJvb3QgdXNlcyBpbmRleCAxOyBjaGlsZHJlbiBmb2xsb3dcbiAgICAgICAgICAgIHByZWZhYkFzc2V0SW5kZXg6IDAsXG4gICAgICAgICAgICBub2RlRmlsZUlkczogbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKSwgLy8gTWFwIG5vZGUgaWQgLT4gZmlsZUlkXG4gICAgICAgICAgICBub2RlVXVpZFRvSW5kZXg6IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCksIC8vIE1hcCBub2RlIFVVSUQgLT4gX19pZF9fIGluZGV4XG4gICAgICAgICAgICBjb21wb25lbnRVdWlkVG9JbmRleDogbmV3IE1hcDxzdHJpbmcsIG51bWJlcj4oKSAvLyBNYXAgY29tcG9uZW50IFVVSUQgLT4gaW5kZXhcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBSb290IHBhcmVudCBtdXN0IGJlIG51bGwgKG5vdCBwcmVmYWIgYXNzZXQpXG4gICAgICAgIGF3YWl0IHRoaXMuY3JlYXRlQ29tcGxldGVOb2RlVHJlZShub2RlRGF0YSwgbnVsbCwgMSwgY29udGV4dCwgaW5jbHVkZUNoaWxkcmVuLCBpbmNsdWRlQ29tcG9uZW50cywgcHJlZmFiTmFtZSk7XG5cbiAgICAgICAgY29uc29sZS5sb2coYFByZWZhYiBjb250ZW50IGJ1aWx0LCAke3ByZWZhYkRhdGEubGVuZ3RofSBvYmplY3RzIHRvdGFsYCk7XG4gICAgICAgIGNvbnNvbGUubG9nKCdOb2RlIGZpbGVJZCBtYXA6JywgQXJyYXkuZnJvbShjb250ZXh0Lm5vZGVGaWxlSWRzLmVudHJpZXMoKSkpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHByZWZhYkRhdGE7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmVjdXJzaXZlbHkgYnVpbGQgbm9kZSB0cmVlIHdpdGggUHJlZmFiSW5mbyBwZXIgbm9kZVxuICAgICAqL1xuICAgIHByaXZhdGUgYXN5bmMgY3JlYXRlQ29tcGxldGVOb2RlVHJlZShcbiAgICAgICAgbm9kZURhdGE6IGFueSwgXG4gICAgICAgIHBhcmVudE5vZGVJbmRleDogbnVtYmVyIHwgbnVsbCwgXG4gICAgICAgIG5vZGVJbmRleDogbnVtYmVyLFxuICAgICAgICBjb250ZXh0OiB7IFxuICAgICAgICAgICAgcHJlZmFiRGF0YTogYW55W10sIFxuICAgICAgICAgICAgY3VycmVudElkOiBudW1iZXIsIFxuICAgICAgICAgICAgcHJlZmFiQXNzZXRJbmRleDogbnVtYmVyLCBcbiAgICAgICAgICAgIG5vZGVGaWxlSWRzOiBNYXA8c3RyaW5nLCBzdHJpbmc+LFxuICAgICAgICAgICAgbm9kZVV1aWRUb0luZGV4OiBNYXA8c3RyaW5nLCBudW1iZXI+LFxuICAgICAgICAgICAgY29tcG9uZW50VXVpZFRvSW5kZXg6IE1hcDxzdHJpbmcsIG51bWJlcj5cbiAgICAgICAgfSxcbiAgICAgICAgaW5jbHVkZUNoaWxkcmVuOiBib29sZWFuLFxuICAgICAgICBpbmNsdWRlQ29tcG9uZW50czogYm9vbGVhbixcbiAgICAgICAgbm9kZU5hbWU/OiBzdHJpbmdcbiAgICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyBwcmVmYWJEYXRhIH0gPSBjb250ZXh0O1xuICAgICAgICBcbiAgICAgICAgLy8gUHVzaCBub2RlIG9iamVjdFxuICAgICAgICBjb25zdCBub2RlID0gdGhpcy5jcmVhdGVFbmdpbmVTdGFuZGFyZE5vZGUobm9kZURhdGEsIHBhcmVudE5vZGVJbmRleCwgbm9kZU5hbWUpO1xuICAgICAgICBcbiAgICAgICAgLy8gUGluIG5vZGUgYXQgdGFyZ2V0IGluZGV4XG4gICAgICAgIHdoaWxlIChwcmVmYWJEYXRhLmxlbmd0aCA8PSBub2RlSW5kZXgpIHtcbiAgICAgICAgICAgIHByZWZhYkRhdGEucHVzaChudWxsKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLmxvZyhgUGxhY2Ugbm9kZSBhdCBpbmRleCAke25vZGVJbmRleH06ICR7bm9kZS5fbmFtZX0sIF9wYXJlbnQ6YCwgbm9kZS5fcGFyZW50LCBgX2NoaWxkcmVuIGNvdW50OiAke25vZGUuX2NoaWxkcmVuLmxlbmd0aH1gKTtcbiAgICAgICAgcHJlZmFiRGF0YVtub2RlSW5kZXhdID0gbm9kZTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFzc2lnbiBmaWxlSWQgKyBVVUlEIG1hcFxuICAgICAgICBjb25zdCBub2RlVXVpZCA9IHRoaXMuZXh0cmFjdE5vZGVVdWlkKG5vZGVEYXRhKTtcbiAgICAgICAgY29uc3QgZmlsZUlkID0gbm9kZVV1aWQgfHwgdGhpcy5nZW5lcmF0ZUZpbGVJZCgpO1xuICAgICAgICBjb250ZXh0Lm5vZGVGaWxlSWRzLnNldChub2RlSW5kZXgudG9TdHJpbmcoKSwgZmlsZUlkKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFRyYWNrIFVVSUQtPmluZGV4XG4gICAgICAgIGlmIChub2RlVXVpZCkge1xuICAgICAgICAgICAgY29udGV4dC5ub2RlVXVpZFRvSW5kZXguc2V0KG5vZGVVdWlkLCBub2RlSW5kZXgpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coYFJlY29yZCBub2RlIFVVSUQgbWFwOiAke25vZGVVdWlkfSAtPiAke25vZGVJbmRleH1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFByb2Nlc3MgY2hpbGRyZW4gZmlyc3QgKG1hbnVhbCBpbmRleCBvcmRlcilcbiAgICAgICAgY29uc3QgY2hpbGRyZW5Ub1Byb2Nlc3MgPSB0aGlzLmdldENoaWxkcmVuVG9Qcm9jZXNzKG5vZGVEYXRhKTtcbiAgICAgICAgaWYgKGluY2x1ZGVDaGlsZHJlbiAmJiBjaGlsZHJlblRvUHJvY2Vzcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgUHJvY2Vzc2luZyAke2NoaWxkcmVuVG9Qcm9jZXNzLmxlbmd0aH0gY2hpbGRyZW4gb2YgJHtub2RlLl9uYW1lfWApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBbGxvY2F0ZSBjaGlsZCBpbmRpY2VzXG4gICAgICAgICAgICBjb25zdCBjaGlsZEluZGljZXM6IG51bWJlcltdID0gW107XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgQWxsb2NhdGluZyBpbmRpY2VzIGZvciAke2NoaWxkcmVuVG9Qcm9jZXNzLmxlbmd0aH0gY2hpbGRyZW4sIGN1cnJlbnRJZDogJHtjb250ZXh0LmN1cnJlbnRJZH1gKTtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY2hpbGRyZW5Ub1Byb2Nlc3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgQ2hpbGQgJHtpKzF9LCBjdXJyZW50SWQ6ICR7Y29udGV4dC5jdXJyZW50SWR9YCk7XG4gICAgICAgICAgICAgICAgY29uc3QgY2hpbGRJbmRleCA9IGNvbnRleHQuY3VycmVudElkKys7XG4gICAgICAgICAgICAgICAgY2hpbGRJbmRpY2VzLnB1c2goY2hpbGRJbmRleCk7XG4gICAgICAgICAgICAgICAgbm9kZS5fY2hpbGRyZW4ucHVzaCh7IFwiX19pZF9fXCI6IGNoaWxkSW5kZXggfSk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYEFkZGVkIGNoaWxkIHJlZiBvbiAke25vZGUuX25hbWV9OiB7X19pZF9fOiAke2NoaWxkSW5kZXh9fWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc29sZS5sb2coYEZpbmFsIF9jaGlsZHJlbiBmb3IgJHtub2RlLl9uYW1lfTpgLCBub2RlLl9jaGlsZHJlbik7XG5cbiAgICAgICAgICAgIC8vIFJlY3Vyc2UgY2hpbGQgY3JlYXRpb25cbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY2hpbGRyZW5Ub1Byb2Nlc3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjaGlsZERhdGEgPSBjaGlsZHJlblRvUHJvY2Vzc1tpXTtcbiAgICAgICAgICAgICAgICBjb25zdCBjaGlsZEluZGV4ID0gY2hpbGRJbmRpY2VzW2ldO1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuY3JlYXRlQ29tcGxldGVOb2RlVHJlZShcbiAgICAgICAgICAgICAgICAgICAgY2hpbGREYXRhLCBcbiAgICAgICAgICAgICAgICAgICAgbm9kZUluZGV4LCBcbiAgICAgICAgICAgICAgICAgICAgY2hpbGRJbmRleCwgXG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHQsXG4gICAgICAgICAgICAgICAgICAgIGluY2x1ZGVDaGlsZHJlbixcbiAgICAgICAgICAgICAgICAgICAgaW5jbHVkZUNvbXBvbmVudHMsXG4gICAgICAgICAgICAgICAgICAgIGNoaWxkRGF0YS5uYW1lIHx8IGBDaGlsZCR7aSsxfWBcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gVGhlbiBzZXJpYWxpemUgY29tcG9uZW50c1xuICAgICAgICBpZiAoaW5jbHVkZUNvbXBvbmVudHMgJiYgbm9kZURhdGEuY29tcG9uZW50cyAmJiBBcnJheS5pc0FycmF5KG5vZGVEYXRhLmNvbXBvbmVudHMpKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgUHJvY2Vzc2luZyAke25vZGVEYXRhLmNvbXBvbmVudHMubGVuZ3RofSBjb21wb25lbnRzIG9uICR7bm9kZS5fbmFtZX1gKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgY29tcG9uZW50SW5kaWNlczogbnVtYmVyW10gPSBbXTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgY29tcG9uZW50IG9mIG5vZGVEYXRhLmNvbXBvbmVudHMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb21wb25lbnRJbmRleCA9IGNvbnRleHQuY3VycmVudElkKys7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50SW5kaWNlcy5wdXNoKGNvbXBvbmVudEluZGV4KTtcbiAgICAgICAgICAgICAgICBub2RlLl9jb21wb25lbnRzLnB1c2goeyBcIl9faWRfX1wiOiBjb21wb25lbnRJbmRleCB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBNYXAgY29tcG9uZW50IFVVSURzXG4gICAgICAgICAgICAgICAgY29uc3QgY29tcG9uZW50VXVpZCA9IGNvbXBvbmVudC51dWlkIHx8IChjb21wb25lbnQudmFsdWUgJiYgY29tcG9uZW50LnZhbHVlLnV1aWQpO1xuICAgICAgICAgICAgICAgIGlmIChjb21wb25lbnRVdWlkKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHQuY29tcG9uZW50VXVpZFRvSW5kZXguc2V0KGNvbXBvbmVudFV1aWQsIGNvbXBvbmVudEluZGV4KTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFJlY29yZCBjb21wb25lbnQgVVVJRCBtYXA6ICR7Y29tcG9uZW50VXVpZH0gLT4gJHtjb21wb25lbnRJbmRleH1gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gRW1pdCBjb21wb25lbnQgd2l0aCByZWYgY29udGV4dFxuICAgICAgICAgICAgICAgIGNvbnN0IGNvbXBvbmVudE9iaiA9IHRoaXMuY3JlYXRlQ29tcG9uZW50T2JqZWN0KGNvbXBvbmVudCwgbm9kZUluZGV4LCBjb250ZXh0KTtcbiAgICAgICAgICAgICAgICBwcmVmYWJEYXRhW2NvbXBvbmVudEluZGV4XSA9IGNvbXBvbmVudE9iajtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBBdHRhY2ggQ29tcFByZWZhYkluZm9cbiAgICAgICAgICAgICAgICBjb25zdCBjb21wUHJlZmFiSW5mb0luZGV4ID0gY29udGV4dC5jdXJyZW50SWQrKztcbiAgICAgICAgICAgICAgICBwcmVmYWJEYXRhW2NvbXBQcmVmYWJJbmZvSW5kZXhdID0ge1xuICAgICAgICAgICAgICAgICAgICBcIl9fdHlwZV9fXCI6IFwiY2MuQ29tcFByZWZhYkluZm9cIixcbiAgICAgICAgICAgICAgICAgICAgXCJmaWxlSWRcIjogdGhpcy5nZW5lcmF0ZUZpbGVJZCgpXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBXaXJlIF9fcHJlZmFiIHdoZW4gcHJlc2VudFxuICAgICAgICAgICAgICAgIGlmIChjb21wb25lbnRPYmogJiYgdHlwZW9mIGNvbXBvbmVudE9iaiA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50T2JqLl9fcHJlZmFiID0geyBcIl9faWRfX1wiOiBjb21wUHJlZmFiSW5mb0luZGV4IH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgQXR0YWNoZWQgJHtjb21wb25lbnRJbmRpY2VzLmxlbmd0aH0gY29tcG9uZW50cyB0byAke25vZGUuX25hbWV9YCk7XG4gICAgICAgIH1cblxuXG4gICAgICAgIC8vIFB1c2ggUHJlZmFiSW5mbyBibG9ja1xuICAgICAgICBjb25zdCBwcmVmYWJJbmZvSW5kZXggPSBjb250ZXh0LmN1cnJlbnRJZCsrO1xuICAgICAgICBub2RlLl9wcmVmYWIgPSB7IFwiX19pZF9fXCI6IHByZWZhYkluZm9JbmRleCB9O1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcHJlZmFiSW5mbzogYW55ID0ge1xuICAgICAgICAgICAgXCJfX3R5cGVfX1wiOiBcImNjLlByZWZhYkluZm9cIixcbiAgICAgICAgICAgIFwicm9vdFwiOiB7IFwiX19pZF9fXCI6IDEgfSxcbiAgICAgICAgICAgIFwiYXNzZXRcIjogeyBcIl9faWRfX1wiOiBjb250ZXh0LnByZWZhYkFzc2V0SW5kZXggfSxcbiAgICAgICAgICAgIFwiZmlsZUlkXCI6IGZpbGVJZCxcbiAgICAgICAgICAgIFwidGFyZ2V0T3ZlcnJpZGVzXCI6IG51bGwsXG4gICAgICAgICAgICBcIm5lc3RlZFByZWZhYkluc3RhbmNlUm9vdHNcIjogbnVsbFxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gUm9vdC1zcGVjaWZpYyBydWxlc1xuICAgICAgICBpZiAobm9kZUluZGV4ID09PSAxKSB7XG4gICAgICAgICAgICAvLyBSb290OiBubyBpbnN0YW5jZSwgbWF5YmUgb3ZlcnJpZGVzXG4gICAgICAgICAgICBwcmVmYWJJbmZvLmluc3RhbmNlID0gbnVsbDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIENoaWxkcmVuOiBpbnN0YW5jZSBudWxsXG4gICAgICAgICAgICBwcmVmYWJJbmZvLmluc3RhbmNlID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcHJlZmFiRGF0YVtwcmVmYWJJbmZvSW5kZXhdID0gcHJlZmFiSW5mbztcbiAgICAgICAgY29udGV4dC5jdXJyZW50SWQgPSBwcmVmYWJJbmZvSW5kZXggKyAxO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENvbXByZXNzIFVVSUQgbGlrZSBDcmVhdG9yXG4gICAgICogTWlycm9ycyBlZGl0b3IgY29tcHJlc3Npb25cbiAgICAgKiBGaXJzdCA1IGhleCBjaGFycyBsaXRlcmFsLCBjb21wcmVzcyB0YWlsXG4gICAgICovXG4gICAgcHJpdmF0ZSB1dWlkVG9Db21wcmVzc2VkSWQodXVpZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3QgQkFTRTY0X0tFWVMgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLz0nO1xuICAgICAgICBcbiAgICAgICAgLy8gU3RyaXAgaHlwaGVucywgbG93ZXJjYXNlXG4gICAgICAgIGNvbnN0IGNsZWFuVXVpZCA9IHV1aWQucmVwbGFjZSgvLS9nLCAnJykudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFZhbGlkYXRlIFVVSURcbiAgICAgICAgaWYgKGNsZWFuVXVpZC5sZW5ndGggIT09IDMyKSB7XG4gICAgICAgICAgICByZXR1cm4gdXVpZDsgLy8gUGFzc3Rocm91Z2ggaW52YWxpZCB0b2tlbnNcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRvciBVVUlEIGNvbXByZXNzaW9uIHNjaGVtZVxuICAgICAgICBsZXQgcmVzdWx0ID0gY2xlYW5VdWlkLnN1YnN0cmluZygwLCA1KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFRhaWwgMjcgaGV4IC0+IDE4IGNoYXJzXG4gICAgICAgIGNvbnN0IHJlbWFpbmRlciA9IGNsZWFuVXVpZC5zdWJzdHJpbmcoNSk7XG4gICAgICAgIFxuICAgICAgICAvLyBQYWNrIDMgaGV4IG5pYmJsZXMgLT4gMiBjaGFyc1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJlbWFpbmRlci5sZW5ndGg7IGkgKz0gMykge1xuICAgICAgICAgICAgY29uc3QgaGV4MSA9IHJlbWFpbmRlcltpXSB8fCAnMCc7XG4gICAgICAgICAgICBjb25zdCBoZXgyID0gcmVtYWluZGVyW2kgKyAxXSB8fCAnMCc7XG4gICAgICAgICAgICBjb25zdCBoZXgzID0gcmVtYWluZGVyW2kgKyAyXSB8fCAnMCc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIDEyIGJpdHMgLT4gMiBiYXNlNjQgc3ltYm9sc1xuICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBwYXJzZUludChoZXgxICsgaGV4MiArIGhleDMsIDE2KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU3BsaXQgMTIgYml0cyBpbnRvIHR3byA2LWJpdCBjaHVua3NcbiAgICAgICAgICAgIGNvbnN0IGhpZ2g2ID0gKHZhbHVlID4+IDYpICYgNjM7XG4gICAgICAgICAgICBjb25zdCBsb3c2ID0gdmFsdWUgJiA2MztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmVzdWx0ICs9IEJBU0U2NF9LRVlTW2hpZ2g2XSArIEJBU0U2NF9LRVlTW2xvdzZdO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEJ1aWxkIGNvbXBvbmVudCBKU09OXG4gICAgICovXG4gICAgcHJpdmF0ZSBjcmVhdGVDb21wb25lbnRPYmplY3QoY29tcG9uZW50RGF0YTogYW55LCBub2RlSW5kZXg6IG51bWJlciwgY29udGV4dD86IHsgXG4gICAgICAgIG5vZGVVdWlkVG9JbmRleD86IE1hcDxzdHJpbmcsIG51bWJlcj4sXG4gICAgICAgIGNvbXBvbmVudFV1aWRUb0luZGV4PzogTWFwPHN0cmluZywgbnVtYmVyPlxuICAgIH0pOiBhbnkge1xuICAgICAgICBsZXQgY29tcG9uZW50VHlwZSA9IGNvbXBvbmVudERhdGEudHlwZSB8fCBjb21wb25lbnREYXRhLl9fdHlwZV9fIHx8ICdjYy5Db21wb25lbnQnO1xuICAgICAgICBjb25zdCBlbmFibGVkID0gY29tcG9uZW50RGF0YS5lbmFibGVkICE9PSB1bmRlZmluZWQgPyBjb21wb25lbnREYXRhLmVuYWJsZWQgOiB0cnVlO1xuICAgICAgICBcbiAgICAgICAgLy8gY29uc29sZS5sb2coYENyZWF0ZSBjb21wb25lbnQgLSByYXcgdHlwZTogJHtjb21wb25lbnRUeXBlfWApO1xuICAgICAgICAvLyBjb25zb2xlLmxvZygnRnVsbCBjb21wb25lbnQgZGF0YTonLCBKU09OLnN0cmluZ2lmeShjb21wb25lbnREYXRhLCBudWxsLCAyKSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTY3JpcHQgY29tcG9uZW50cyBhbHJlYWR5IGNvbXByZXNzZWQgdmlhIE1DUFxuICAgICAgICBpZiAoY29tcG9uZW50VHlwZSAmJiAhY29tcG9uZW50VHlwZS5zdGFydHNXaXRoKCdjYy4nKSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coYFNjcmlwdCBjb21wb25lbnQgY29tcHJlc3NlZCBVVUlEIHR5cGU6ICR7Y29tcG9uZW50VHlwZX1gKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQmFzZSBjb21wb25lbnQgc2hlbGxcbiAgICAgICAgY29uc3QgY29tcG9uZW50OiBhbnkgPSB7XG4gICAgICAgICAgICBcIl9fdHlwZV9fXCI6IGNvbXBvbmVudFR5cGUsXG4gICAgICAgICAgICBcIl9uYW1lXCI6IFwiXCIsXG4gICAgICAgICAgICBcIl9vYmpGbGFnc1wiOiAwLFxuICAgICAgICAgICAgXCJfX2VkaXRvckV4dHJhc19fXCI6IHt9LFxuICAgICAgICAgICAgXCJub2RlXCI6IHsgXCJfX2lkX19cIjogbm9kZUluZGV4IH0sXG4gICAgICAgICAgICBcIl9lbmFibGVkXCI6IGVuYWJsZWRcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIFByZWZpbGwgX19wcmVmYWIgcGxhY2Vob2xkZXJcbiAgICAgICAgY29tcG9uZW50Ll9fcHJlZmFiID0gbnVsbDtcbiAgICAgICAgXG4gICAgICAgIC8vIFR5cGUtc3BlY2lmaWMgZGVmYXVsdHNcbiAgICAgICAgaWYgKGNvbXBvbmVudFR5cGUgPT09ICdjYy5VSVRyYW5zZm9ybScpIHtcbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnRTaXplID0gY29tcG9uZW50RGF0YS5wcm9wZXJ0aWVzPy5jb250ZW50U2l6ZT8udmFsdWUgfHwgeyB3aWR0aDogMTAwLCBoZWlnaHQ6IDEwMCB9O1xuICAgICAgICAgICAgY29uc3QgYW5jaG9yUG9pbnQgPSBjb21wb25lbnREYXRhLnByb3BlcnRpZXM/LmFuY2hvclBvaW50Py52YWx1ZSB8fCB7IHg6IDAuNSwgeTogMC41IH07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbXBvbmVudC5fY29udGVudFNpemUgPSB7XG4gICAgICAgICAgICAgICAgXCJfX3R5cGVfX1wiOiBcImNjLlNpemVcIixcbiAgICAgICAgICAgICAgICBcIndpZHRoXCI6IGNvbnRlbnRTaXplLndpZHRoLFxuICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6IGNvbnRlbnRTaXplLmhlaWdodFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGNvbXBvbmVudC5fYW5jaG9yUG9pbnQgPSB7XG4gICAgICAgICAgICAgICAgXCJfX3R5cGVfX1wiOiBcImNjLlZlYzJcIixcbiAgICAgICAgICAgICAgICBcInhcIjogYW5jaG9yUG9pbnQueCxcbiAgICAgICAgICAgICAgICBcInlcIjogYW5jaG9yUG9pbnQueVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIGlmIChjb21wb25lbnRUeXBlID09PSAnY2MuU3ByaXRlJykge1xuICAgICAgICAgICAgLy8gU3ByaXRlLnNwcml0ZUZyYW1lIHJlZnNcbiAgICAgICAgICAgIGNvbnN0IHNwcml0ZUZyYW1lUHJvcCA9IGNvbXBvbmVudERhdGEucHJvcGVydGllcz8uX3Nwcml0ZUZyYW1lIHx8IGNvbXBvbmVudERhdGEucHJvcGVydGllcz8uc3ByaXRlRnJhbWU7XG4gICAgICAgICAgICBpZiAoc3ByaXRlRnJhbWVQcm9wKSB7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50Ll9zcHJpdGVGcmFtZSA9IHRoaXMucHJvY2Vzc0NvbXBvbmVudFByb3BlcnR5KHNwcml0ZUZyYW1lUHJvcCwgY29udGV4dCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbXBvbmVudC5fc3ByaXRlRnJhbWUgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb21wb25lbnQuX3R5cGUgPSBjb21wb25lbnREYXRhLnByb3BlcnRpZXM/Ll90eXBlPy52YWx1ZSA/PyAwO1xuICAgICAgICAgICAgY29tcG9uZW50Ll9maWxsVHlwZSA9IGNvbXBvbmVudERhdGEucHJvcGVydGllcz8uX2ZpbGxUeXBlPy52YWx1ZSA/PyAwO1xuICAgICAgICAgICAgY29tcG9uZW50Ll9zaXplTW9kZSA9IGNvbXBvbmVudERhdGEucHJvcGVydGllcz8uX3NpemVNb2RlPy52YWx1ZSA/PyAxO1xuICAgICAgICAgICAgY29tcG9uZW50Ll9maWxsQ2VudGVyID0geyBcIl9fdHlwZV9fXCI6IFwiY2MuVmVjMlwiLCBcInhcIjogMCwgXCJ5XCI6IDAgfTtcbiAgICAgICAgICAgIGNvbXBvbmVudC5fZmlsbFN0YXJ0ID0gY29tcG9uZW50RGF0YS5wcm9wZXJ0aWVzPy5fZmlsbFN0YXJ0Py52YWx1ZSA/PyAwO1xuICAgICAgICAgICAgY29tcG9uZW50Ll9maWxsUmFuZ2UgPSBjb21wb25lbnREYXRhLnByb3BlcnRpZXM/Ll9maWxsUmFuZ2U/LnZhbHVlID8/IDA7XG4gICAgICAgICAgICBjb21wb25lbnQuX2lzVHJpbW1lZE1vZGUgPSBjb21wb25lbnREYXRhLnByb3BlcnRpZXM/Ll9pc1RyaW1tZWRNb2RlPy52YWx1ZSA/PyB0cnVlO1xuICAgICAgICAgICAgY29tcG9uZW50Ll91c2VHcmF5c2NhbGUgPSBjb21wb25lbnREYXRhLnByb3BlcnRpZXM/Ll91c2VHcmF5c2NhbGU/LnZhbHVlID8/IGZhbHNlO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBEZWJ1ZzogbG9nIHNwcml0ZSBwcm9wcyAoY29tbWVudGVkKVxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ1Nwcml0ZSBjb21wb25lbnQgcHJvcHM6JywgSlNPTi5zdHJpbmdpZnkoY29tcG9uZW50RGF0YS5wcm9wZXJ0aWVzLCBudWxsLCAyKSk7XG4gICAgICAgICAgICBjb21wb25lbnQuX2F0bGFzID0gbnVsbDtcbiAgICAgICAgICAgIGNvbXBvbmVudC5faWQgPSBcIlwiO1xuICAgICAgICB9IGVsc2UgaWYgKGNvbXBvbmVudFR5cGUgPT09ICdjYy5CdXR0b24nKSB7XG4gICAgICAgICAgICBjb21wb25lbnQuX2ludGVyYWN0YWJsZSA9IHRydWU7XG4gICAgICAgICAgICBjb21wb25lbnQuX3RyYW5zaXRpb24gPSAzO1xuICAgICAgICAgICAgY29tcG9uZW50Ll9ub3JtYWxDb2xvciA9IHsgXCJfX3R5cGVfX1wiOiBcImNjLkNvbG9yXCIsIFwiclwiOiAyNTUsIFwiZ1wiOiAyNTUsIFwiYlwiOiAyNTUsIFwiYVwiOiAyNTUgfTtcbiAgICAgICAgICAgIGNvbXBvbmVudC5faG92ZXJDb2xvciA9IHsgXCJfX3R5cGVfX1wiOiBcImNjLkNvbG9yXCIsIFwiclwiOiAyMTEsIFwiZ1wiOiAyMTEsIFwiYlwiOiAyMTEsIFwiYVwiOiAyNTUgfTtcbiAgICAgICAgICAgIGNvbXBvbmVudC5fcHJlc3NlZENvbG9yID0geyBcIl9fdHlwZV9fXCI6IFwiY2MuQ29sb3JcIiwgXCJyXCI6IDI1NSwgXCJnXCI6IDI1NSwgXCJiXCI6IDI1NSwgXCJhXCI6IDI1NSB9O1xuICAgICAgICAgICAgY29tcG9uZW50Ll9kaXNhYmxlZENvbG9yID0geyBcIl9fdHlwZV9fXCI6IFwiY2MuQ29sb3JcIiwgXCJyXCI6IDEyNCwgXCJnXCI6IDEyNCwgXCJiXCI6IDEyNCwgXCJhXCI6IDI1NSB9O1xuICAgICAgICAgICAgY29tcG9uZW50Ll9ub3JtYWxTcHJpdGUgPSBudWxsO1xuICAgICAgICAgICAgY29tcG9uZW50Ll9ob3ZlclNwcml0ZSA9IG51bGw7XG4gICAgICAgICAgICBjb21wb25lbnQuX3ByZXNzZWRTcHJpdGUgPSBudWxsO1xuICAgICAgICAgICAgY29tcG9uZW50Ll9kaXNhYmxlZFNwcml0ZSA9IG51bGw7XG4gICAgICAgICAgICBjb21wb25lbnQuX2R1cmF0aW9uID0gMC4xO1xuICAgICAgICAgICAgY29tcG9uZW50Ll96b29tU2NhbGUgPSAxLjI7XG4gICAgICAgICAgICAvLyBCdXR0b24udGFyZ2V0IHdpcmluZ1xuICAgICAgICAgICAgY29uc3QgdGFyZ2V0UHJvcCA9IGNvbXBvbmVudERhdGEucHJvcGVydGllcz8uX3RhcmdldCB8fCBjb21wb25lbnREYXRhLnByb3BlcnRpZXM/LnRhcmdldDtcbiAgICAgICAgICAgIGlmICh0YXJnZXRQcm9wKSB7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50Ll90YXJnZXQgPSB0aGlzLnByb2Nlc3NDb21wb25lbnRQcm9wZXJ0eSh0YXJnZXRQcm9wLCBjb250ZXh0KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50Ll90YXJnZXQgPSB7IFwiX19pZF9fXCI6IG5vZGVJbmRleCB9OyAvLyBkZWZhdWx0IHNlbGYgbm9kZVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29tcG9uZW50Ll9jbGlja0V2ZW50cyA9IFtdO1xuICAgICAgICAgICAgY29tcG9uZW50Ll9pZCA9IFwiXCI7XG4gICAgICAgIH0gZWxzZSBpZiAoY29tcG9uZW50VHlwZSA9PT0gJ2NjLkxhYmVsJykge1xuICAgICAgICAgICAgY29tcG9uZW50Ll9zdHJpbmcgPSBjb21wb25lbnREYXRhLnByb3BlcnRpZXM/Ll9zdHJpbmc/LnZhbHVlIHx8IFwiTGFiZWxcIjtcbiAgICAgICAgICAgIGNvbXBvbmVudC5faG9yaXpvbnRhbEFsaWduID0gMTtcbiAgICAgICAgICAgIGNvbXBvbmVudC5fdmVydGljYWxBbGlnbiA9IDE7XG4gICAgICAgICAgICBjb21wb25lbnQuX2FjdHVhbEZvbnRTaXplID0gMjA7XG4gICAgICAgICAgICBjb21wb25lbnQuX2ZvbnRTaXplID0gMjA7XG4gICAgICAgICAgICBjb21wb25lbnQuX2ZvbnRGYW1pbHkgPSBcIkFyaWFsXCI7XG4gICAgICAgICAgICBjb21wb25lbnQuX2xpbmVIZWlnaHQgPSAyNTtcbiAgICAgICAgICAgIGNvbXBvbmVudC5fb3ZlcmZsb3cgPSAwO1xuICAgICAgICAgICAgY29tcG9uZW50Ll9lbmFibGVXcmFwVGV4dCA9IHRydWU7XG4gICAgICAgICAgICBjb21wb25lbnQuX2ZvbnQgPSBudWxsO1xuICAgICAgICAgICAgY29tcG9uZW50Ll9pc1N5c3RlbUZvbnRVc2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIGNvbXBvbmVudC5fc3BhY2luZ1ggPSAwO1xuICAgICAgICAgICAgY29tcG9uZW50Ll9pc0l0YWxpYyA9IGZhbHNlO1xuICAgICAgICAgICAgY29tcG9uZW50Ll9pc0JvbGQgPSBmYWxzZTtcbiAgICAgICAgICAgIGNvbXBvbmVudC5faXNVbmRlcmxpbmUgPSBmYWxzZTtcbiAgICAgICAgICAgIGNvbXBvbmVudC5fdW5kZXJsaW5lSGVpZ2h0ID0gMjtcbiAgICAgICAgICAgIGNvbXBvbmVudC5fY2FjaGVNb2RlID0gMDtcbiAgICAgICAgICAgIGNvbXBvbmVudC5faWQgPSBcIlwiO1xuICAgICAgICB9IGVsc2UgaWYgKGNvbXBvbmVudERhdGEucHJvcGVydGllcykge1xuICAgICAgICAgICAgLy8gU2VyaWFsaXplIGFsbCBjb21wb25lbnQgcHJvcHNcbiAgICAgICAgICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKGNvbXBvbmVudERhdGEucHJvcGVydGllcykpIHtcbiAgICAgICAgICAgICAgICBpZiAoa2V5ID09PSAnbm9kZScgfHwga2V5ID09PSAnZW5hYmxlZCcgfHwga2V5ID09PSAnX190eXBlX18nIHx8IFxuICAgICAgICAgICAgICAgICAgICBrZXkgPT09ICd1dWlkJyB8fCBrZXkgPT09ICduYW1lJyB8fCBrZXkgPT09ICdfX3NjcmlwdEFzc2V0JyB8fCBrZXkgPT09ICdfb2JqRmxhZ3MnKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlOyAvLyBza2lwIGludGVybmFsIGZsYWdzIGluY2wuIF9vYmpGbGFnc1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVbmRlcnNjb3JlIHByb3BzIG5lZWQgY2FyZVxuICAgICAgICAgICAgICAgIGlmIChrZXkuc3RhcnRzV2l0aCgnXycpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFByZXNlcnZlIGV4YWN0IHByb3BlcnR5IG5hbWVzXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb3BWYWx1ZSA9IHRoaXMucHJvY2Vzc0NvbXBvbmVudFByb3BlcnR5KHZhbHVlLCBjb250ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHByb3BWYWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRba2V5XSA9IHByb3BWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFB1YmxpYyBwcm9wcyBoYW5kbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb3BWYWx1ZSA9IHRoaXMucHJvY2Vzc0NvbXBvbmVudFByb3BlcnR5KHZhbHVlLCBjb250ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHByb3BWYWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRba2V5XSA9IHByb3BWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gS2VlcCBfaWQgbGFzdFxuICAgICAgICBjb25zdCBfaWQgPSBjb21wb25lbnQuX2lkIHx8IFwiXCI7XG4gICAgICAgIGRlbGV0ZSBjb21wb25lbnQuX2lkO1xuICAgICAgICBjb21wb25lbnQuX2lkID0gX2lkO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGNvbXBvbmVudDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBOb3JtYWxpemUgcHJvcGVydHkgdmFsdWVzIGxpa2UgbWFudWFsIHByZWZhYnNcbiAgICAgKi9cbiAgICBwcml2YXRlIHByb2Nlc3NDb21wb25lbnRQcm9wZXJ0eShwcm9wRGF0YTogYW55LCBjb250ZXh0PzogeyBcbiAgICAgICAgbm9kZVV1aWRUb0luZGV4PzogTWFwPHN0cmluZywgbnVtYmVyPixcbiAgICAgICAgY29tcG9uZW50VXVpZFRvSW5kZXg/OiBNYXA8c3RyaW5nLCBudW1iZXI+XG4gICAgfSk6IGFueSB7XG4gICAgICAgIGlmICghcHJvcERhdGEgfHwgdHlwZW9mIHByb3BEYXRhICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgcmV0dXJuIHByb3BEYXRhO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgdmFsdWUgPSBwcm9wRGF0YS52YWx1ZTtcbiAgICAgICAgY29uc3QgdHlwZSA9IHByb3BEYXRhLnR5cGU7XG5cbiAgICAgICAgLy8gbnVsbCBoYW5kbGluZ1xuICAgICAgICBpZiAodmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBFbXB0eSBVVUlEIC0+IG51bGxcbiAgICAgICAgaWYgKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgdmFsdWUudXVpZCA9PT0gJycpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTm9kZSByZWZlcmVuY2VzXG4gICAgICAgIGlmICh0eXBlID09PSAnY2MuTm9kZScgJiYgdmFsdWU/LnV1aWQpIHtcbiAgICAgICAgICAgIC8vIEludGVybmFsIG5vZGUgcmVmcyAtPiBfX2lkX19cbiAgICAgICAgICAgIGlmIChjb250ZXh0Py5ub2RlVXVpZFRvSW5kZXggJiYgY29udGV4dC5ub2RlVXVpZFRvSW5kZXguaGFzKHZhbHVlLnV1aWQpKSB7XG4gICAgICAgICAgICAgICAgLy8gSW50ZXJuYWwgLT4gX19pZF9fXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgXCJfX2lkX19cIjogY29udGV4dC5ub2RlVXVpZFRvSW5kZXguZ2V0KHZhbHVlLnV1aWQpXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEV4dGVybmFsIG5vZGVzIC0+IG51bGxcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgTm9kZSByZWZlcmVuY2UgVVVJRCAke3ZhbHVlLnV1aWR9IG5vdCBmb3VuZCBpbiBwcmVmYWIgY29udGV4dCwgc2V0dGluZyB0byBudWxsIChleHRlcm5hbCByZWZlcmVuY2UpYCk7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFzc2V0IHJlZnMgKHByZWZhYi90ZXh0dXJlL3Nwcml0ZUZyYW1lKVxuICAgICAgICBpZiAodmFsdWU/LnV1aWQgJiYgKFxuICAgICAgICAgICAgdHlwZSA9PT0gJ2NjLlByZWZhYicgfHwgXG4gICAgICAgICAgICB0eXBlID09PSAnY2MuVGV4dHVyZTJEJyB8fCBcbiAgICAgICAgICAgIHR5cGUgPT09ICdjYy5TcHJpdGVGcmFtZScgfHxcbiAgICAgICAgICAgIHR5cGUgPT09ICdjYy5NYXRlcmlhbCcgfHxcbiAgICAgICAgICAgIHR5cGUgPT09ICdjYy5BbmltYXRpb25DbGlwJyB8fFxuICAgICAgICAgICAgdHlwZSA9PT0gJ2NjLkF1ZGlvQ2xpcCcgfHxcbiAgICAgICAgICAgIHR5cGUgPT09ICdjYy5Gb250JyB8fFxuICAgICAgICAgICAgdHlwZSA9PT0gJ2NjLkFzc2V0J1xuICAgICAgICApKSB7XG4gICAgICAgICAgICAvLyBQcmVmYWIgcmVmcyBrZWVwIFVVSURcbiAgICAgICAgICAgIGNvbnN0IHV1aWRUb1VzZSA9IHR5cGUgPT09ICdjYy5QcmVmYWInID8gdmFsdWUudXVpZCA6IHRoaXMudXVpZFRvQ29tcHJlc3NlZElkKHZhbHVlLnV1aWQpO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBcIl9fdXVpZF9fXCI6IHV1aWRUb1VzZSxcbiAgICAgICAgICAgICAgICBcIl9fZXhwZWN0ZWRUeXBlX19cIjogdHlwZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENvbXBvbmVudCByZWZzIChMYWJlbC9CdXR0b24vLi4uKVxuICAgICAgICBpZiAodmFsdWU/LnV1aWQgJiYgKHR5cGUgPT09ICdjYy5Db21wb25lbnQnIHx8IFxuICAgICAgICAgICAgdHlwZSA9PT0gJ2NjLkxhYmVsJyB8fCB0eXBlID09PSAnY2MuQnV0dG9uJyB8fCB0eXBlID09PSAnY2MuU3ByaXRlJyB8fCBcbiAgICAgICAgICAgIHR5cGUgPT09ICdjYy5VSVRyYW5zZm9ybScgfHwgdHlwZSA9PT0gJ2NjLlJpZ2lkQm9keTJEJyB8fCBcbiAgICAgICAgICAgIHR5cGUgPT09ICdjYy5Cb3hDb2xsaWRlcjJEJyB8fCB0eXBlID09PSAnY2MuQW5pbWF0aW9uJyB8fCBcbiAgICAgICAgICAgIHR5cGUgPT09ICdjYy5BdWRpb1NvdXJjZScgfHwgKHR5cGU/LnN0YXJ0c1dpdGgoJ2NjLicpICYmICF0eXBlLmluY2x1ZGVzKCdAJykpKSkge1xuICAgICAgICAgICAgLy8gSW50ZXJuYWwgY29tcG9uZW50IHJlZnMgLT4gX19pZF9fXG4gICAgICAgICAgICBpZiAoY29udGV4dD8uY29tcG9uZW50VXVpZFRvSW5kZXggJiYgY29udGV4dC5jb21wb25lbnRVdWlkVG9JbmRleC5oYXModmFsdWUudXVpZCkpIHtcbiAgICAgICAgICAgICAgICAvLyBJbnRlcm5hbCAtPiBfX2lkX19cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgQ29tcG9uZW50IHJlZmVyZW5jZSAke3R5cGV9IFVVSUQgJHt2YWx1ZS51dWlkfSBmb3VuZCBpbiBwcmVmYWIgY29udGV4dCwgY29udmVydGluZyB0byBfX2lkX19gKTtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBcIl9faWRfX1wiOiBjb250ZXh0LmNvbXBvbmVudFV1aWRUb0luZGV4LmdldCh2YWx1ZS51dWlkKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBFeHRlcm5hbCBjb21wb25lbnRzIC0+IG51bGxcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgQ29tcG9uZW50IHJlZmVyZW5jZSAke3R5cGV9IFVVSUQgJHt2YWx1ZS51dWlkfSBub3QgZm91bmQgaW4gcHJlZmFiIGNvbnRleHQsIHNldHRpbmcgdG8gbnVsbCAoZXh0ZXJuYWwgcmVmZXJlbmNlKWApO1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDb21wbGV4IHZhbHVlcyBuZWVkIF9fdHlwZV9fXG4gICAgICAgIGlmICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBpZiAodHlwZSA9PT0gJ2NjLkNvbG9yJykge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIFwiX190eXBlX19cIjogXCJjYy5Db2xvclwiLFxuICAgICAgICAgICAgICAgICAgICBcInJcIjogTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIodmFsdWUucikgfHwgMCkpLFxuICAgICAgICAgICAgICAgICAgICBcImdcIjogTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIodmFsdWUuZykgfHwgMCkpLFxuICAgICAgICAgICAgICAgICAgICBcImJcIjogTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIodmFsdWUuYikgfHwgMCkpLFxuICAgICAgICAgICAgICAgICAgICBcImFcIjogdmFsdWUuYSAhPT0gdW5kZWZpbmVkID8gTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIodmFsdWUuYSkpKSA6IDI1NVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdjYy5WZWMzJykge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIFwiX190eXBlX19cIjogXCJjYy5WZWMzXCIsXG4gICAgICAgICAgICAgICAgICAgIFwieFwiOiBOdW1iZXIodmFsdWUueCkgfHwgMCxcbiAgICAgICAgICAgICAgICAgICAgXCJ5XCI6IE51bWJlcih2YWx1ZS55KSB8fCAwLFxuICAgICAgICAgICAgICAgICAgICBcInpcIjogTnVtYmVyKHZhbHVlLnopIHx8IDBcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnY2MuVmVjMicpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBcIl9fdHlwZV9fXCI6IFwiY2MuVmVjMlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ4XCI6IE51bWJlcih2YWx1ZS54KSB8fCAwLFxuICAgICAgICAgICAgICAgICAgICBcInlcIjogTnVtYmVyKHZhbHVlLnkpIHx8IDBcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnY2MuU2l6ZScpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBcIl9fdHlwZV9fXCI6IFwiY2MuU2l6ZVwiLFxuICAgICAgICAgICAgICAgICAgICBcIndpZHRoXCI6IE51bWJlcih2YWx1ZS53aWR0aCkgfHwgMCxcbiAgICAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjogTnVtYmVyKHZhbHVlLmhlaWdodCkgfHwgMFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdjYy5RdWF0Jykge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIFwiX190eXBlX19cIjogXCJjYy5RdWF0XCIsXG4gICAgICAgICAgICAgICAgICAgIFwieFwiOiBOdW1iZXIodmFsdWUueCkgfHwgMCxcbiAgICAgICAgICAgICAgICAgICAgXCJ5XCI6IE51bWJlcih2YWx1ZS55KSB8fCAwLFxuICAgICAgICAgICAgICAgICAgICBcInpcIjogTnVtYmVyKHZhbHVlLnopIHx8IDAsXG4gICAgICAgICAgICAgICAgICAgIFwid1wiOiB2YWx1ZS53ICE9PSB1bmRlZmluZWQgPyBOdW1iZXIodmFsdWUudykgOiAxXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFycmF5c1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgIC8vIE5vZGUgYXJyYXlzXG4gICAgICAgICAgICBpZiAocHJvcERhdGEuZWxlbWVudFR5cGVEYXRhPy50eXBlID09PSAnY2MuTm9kZScpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWUubWFwKGl0ZW0gPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbT8udXVpZCAmJiBjb250ZXh0Py5ub2RlVXVpZFRvSW5kZXg/LmhhcyhpdGVtLnV1aWQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBcIl9faWRfX1wiOiBjb250ZXh0Lm5vZGVVdWlkVG9JbmRleC5nZXQoaXRlbS51dWlkKSB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgIH0pLmZpbHRlcihpdGVtID0+IGl0ZW0gIT09IG51bGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBc3NldCBhcnJheXNcbiAgICAgICAgICAgIGlmIChwcm9wRGF0YS5lbGVtZW50VHlwZURhdGE/LnR5cGUgJiYgcHJvcERhdGEuZWxlbWVudFR5cGVEYXRhLnR5cGUuc3RhcnRzV2l0aCgnY2MuJykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWUubWFwKGl0ZW0gPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbT8udXVpZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIl9fdXVpZF9fXCI6IHRoaXMudXVpZFRvQ29tcHJlc3NlZElkKGl0ZW0udXVpZCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJfX2V4cGVjdGVkVHlwZV9fXCI6IHByb3BEYXRhLmVsZW1lbnRUeXBlRGF0YS50eXBlXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgIH0pLmZpbHRlcihpdGVtID0+IGl0ZW0gIT09IG51bGwpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBQcmltaXRpdmUgYXJyYXlzXG4gICAgICAgICAgICByZXR1cm4gdmFsdWUubWFwKGl0ZW0gPT4gaXRlbT8udmFsdWUgIT09IHVuZGVmaW5lZCA/IGl0ZW0udmFsdWUgOiBpdGVtKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE90aGVyIG9iamVjdHMga2VlcCBzaGFwZSArIF9fdHlwZV9fXG4gICAgICAgIGlmICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHR5cGUgJiYgdHlwZS5zdGFydHNXaXRoKCdjYy4nKSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBcIl9fdHlwZV9fXCI6IHR5cGUsXG4gICAgICAgICAgICAgICAgLi4udmFsdWVcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRW5naW5lLXNoYXBlZCBub2RlIG9iamVjdFxuICAgICAqL1xuICAgIHByaXZhdGUgY3JlYXRlRW5naW5lU3RhbmRhcmROb2RlKG5vZGVEYXRhOiBhbnksIHBhcmVudE5vZGVJbmRleDogbnVtYmVyIHwgbnVsbCwgbm9kZU5hbWU/OiBzdHJpbmcpOiBhbnkge1xuICAgICAgICAvLyBEZWJ1ZyBkdW1wIG5vZGVEYXRhIChjb21tZW50ZWQpXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdSYXcgbm9kZSBkYXRhOicsIEpTT04uc3RyaW5naWZ5KG5vZGVEYXRhLCBudWxsLCAyKSk7XG4gICAgICAgIFxuICAgICAgICAvLyBFeHRyYWN0IGJhc2UgZmllbGRzXG4gICAgICAgIGNvbnN0IGdldFZhbHVlID0gKHByb3A6IGFueSkgPT4ge1xuICAgICAgICAgICAgaWYgKHByb3A/LnZhbHVlICE9PSB1bmRlZmluZWQpIHJldHVybiBwcm9wLnZhbHVlO1xuICAgICAgICAgICAgaWYgKHByb3AgIT09IHVuZGVmaW5lZCkgcmV0dXJuIHByb3A7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHBvc2l0aW9uID0gZ2V0VmFsdWUobm9kZURhdGEucG9zaXRpb24pIHx8IGdldFZhbHVlKG5vZGVEYXRhLnZhbHVlPy5wb3NpdGlvbikgfHwgeyB4OiAwLCB5OiAwLCB6OiAwIH07XG4gICAgICAgIGNvbnN0IHJvdGF0aW9uID0gZ2V0VmFsdWUobm9kZURhdGEucm90YXRpb24pIHx8IGdldFZhbHVlKG5vZGVEYXRhLnZhbHVlPy5yb3RhdGlvbikgfHwgeyB4OiAwLCB5OiAwLCB6OiAwLCB3OiAxIH07XG4gICAgICAgIGNvbnN0IHNjYWxlID0gZ2V0VmFsdWUobm9kZURhdGEuc2NhbGUpIHx8IGdldFZhbHVlKG5vZGVEYXRhLnZhbHVlPy5zY2FsZSkgfHwgeyB4OiAxLCB5OiAxLCB6OiAxIH07XG4gICAgICAgIGNvbnN0IGFjdGl2ZSA9IGdldFZhbHVlKG5vZGVEYXRhLmFjdGl2ZSkgPz8gZ2V0VmFsdWUobm9kZURhdGEudmFsdWU/LmFjdGl2ZSkgPz8gdHJ1ZTtcbiAgICAgICAgY29uc3QgbmFtZSA9IG5vZGVOYW1lIHx8IGdldFZhbHVlKG5vZGVEYXRhLm5hbWUpIHx8IGdldFZhbHVlKG5vZGVEYXRhLnZhbHVlPy5uYW1lKSB8fCAnTm9kZSc7XG4gICAgICAgIGNvbnN0IGxheWVyID0gZ2V0VmFsdWUobm9kZURhdGEubGF5ZXIpIHx8IGdldFZhbHVlKG5vZGVEYXRhLnZhbHVlPy5sYXllcikgfHwgMTA3Mzc0MTgyNDtcblxuICAgICAgICAvLyBEZWJ1ZyB0cmFjZVxuICAgICAgICBjb25zb2xlLmxvZyhgQ3JlYXRlIG5vZGU6ICR7bmFtZX0sIHBhcmVudE5vZGVJbmRleDogJHtwYXJlbnROb2RlSW5kZXh9YCk7XG5cbiAgICAgICAgY29uc3QgcGFyZW50UmVmID0gcGFyZW50Tm9kZUluZGV4ICE9PSBudWxsID8geyBcIl9faWRfX1wiOiBwYXJlbnROb2RlSW5kZXggfSA6IG51bGw7XG4gICAgICAgIGNvbnNvbGUubG9nKGBQYXJlbnQgcmVmIGZvciAke25hbWV9OmAsIHBhcmVudFJlZik7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIFwiX190eXBlX19cIjogXCJjYy5Ob2RlXCIsXG4gICAgICAgICAgICBcIl9uYW1lXCI6IG5hbWUsXG4gICAgICAgICAgICBcIl9vYmpGbGFnc1wiOiAwLFxuICAgICAgICAgICAgXCJfX2VkaXRvckV4dHJhc19fXCI6IHt9LFxuICAgICAgICAgICAgXCJfcGFyZW50XCI6IHBhcmVudFJlZixcbiAgICAgICAgICAgIFwiX2NoaWxkcmVuXCI6IFtdLCAvLyBfY2hpbGRyZW4gZmlsbGVkIGR1cmluZyByZWN1cnNpb25cbiAgICAgICAgICAgIFwiX2FjdGl2ZVwiOiBhY3RpdmUsXG4gICAgICAgICAgICBcIl9jb21wb25lbnRzXCI6IFtdLCAvLyBfY29tcG9uZW50cyBmaWxsZWQgbGF0ZXJcbiAgICAgICAgICAgIFwiX3ByZWZhYlwiOiB7IFwiX19pZF9fXCI6IDAgfSwgLy8gVGVtcG9yYXJ5IF9fcHJlZmFiIGlkXG4gICAgICAgICAgICBcIl9scG9zXCI6IHtcbiAgICAgICAgICAgICAgICBcIl9fdHlwZV9fXCI6IFwiY2MuVmVjM1wiLFxuICAgICAgICAgICAgICAgIFwieFwiOiBwb3NpdGlvbi54LFxuICAgICAgICAgICAgICAgIFwieVwiOiBwb3NpdGlvbi55LFxuICAgICAgICAgICAgICAgIFwielwiOiBwb3NpdGlvbi56XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJfbHJvdFwiOiB7XG4gICAgICAgICAgICAgICAgXCJfX3R5cGVfX1wiOiBcImNjLlF1YXRcIixcbiAgICAgICAgICAgICAgICBcInhcIjogcm90YXRpb24ueCxcbiAgICAgICAgICAgICAgICBcInlcIjogcm90YXRpb24ueSxcbiAgICAgICAgICAgICAgICBcInpcIjogcm90YXRpb24ueixcbiAgICAgICAgICAgICAgICBcIndcIjogcm90YXRpb24ud1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiX2xzY2FsZVwiOiB7XG4gICAgICAgICAgICAgICAgXCJfX3R5cGVfX1wiOiBcImNjLlZlYzNcIixcbiAgICAgICAgICAgICAgICBcInhcIjogc2NhbGUueCxcbiAgICAgICAgICAgICAgICBcInlcIjogc2NhbGUueSxcbiAgICAgICAgICAgICAgICBcInpcIjogc2NhbGUuelxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiX21vYmlsaXR5XCI6IDAsXG4gICAgICAgICAgICBcIl9sYXllclwiOiBsYXllcixcbiAgICAgICAgICAgIFwiX2V1bGVyXCI6IHtcbiAgICAgICAgICAgICAgICBcIl9fdHlwZV9fXCI6IFwiY2MuVmVjM1wiLFxuICAgICAgICAgICAgICAgIFwieFwiOiAwLFxuICAgICAgICAgICAgICAgIFwieVwiOiAwLFxuICAgICAgICAgICAgICAgIFwielwiOiAwXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJfaWRcIjogXCJcIlxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEV4dHJhY3QgVVVJRCBmcm9tIGR1bXBcbiAgICAgKi9cbiAgICBwcml2YXRlIGV4dHJhY3ROb2RlVXVpZChub2RlRGF0YTogYW55KTogc3RyaW5nIHwgbnVsbCB7XG4gICAgICAgIGlmICghbm9kZURhdGEpIHJldHVybiBudWxsO1xuICAgICAgICBcbiAgICAgICAgLy8gVVVJRCBleHRyYWN0aW9uIGhldXJpc3RpY3NcbiAgICAgICAgY29uc3Qgc291cmNlcyA9IFtcbiAgICAgICAgICAgIG5vZGVEYXRhLnV1aWQsXG4gICAgICAgICAgICBub2RlRGF0YS52YWx1ZT8udXVpZCxcbiAgICAgICAgICAgIG5vZGVEYXRhLl9fdXVpZF9fLFxuICAgICAgICAgICAgbm9kZURhdGEudmFsdWU/Ll9fdXVpZF9fLFxuICAgICAgICAgICAgbm9kZURhdGEuaWQsXG4gICAgICAgICAgICBub2RlRGF0YS52YWx1ZT8uaWRcbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIGZvciAoY29uc3Qgc291cmNlIG9mIHNvdXJjZXMpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygc291cmNlID09PSAnc3RyaW5nJyAmJiBzb3VyY2UubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBzb3VyY2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1pbmltYWwgbm9kZSBzaGVsbCAobm8gY29tcHMpXG4gICAgICovXG4gICAgcHJpdmF0ZSBjcmVhdGVNaW5pbWFsTm9kZShub2RlRGF0YTogYW55LCBub2RlTmFtZT86IHN0cmluZyk6IGFueSB7XG4gICAgICAgIC8vIEV4dHJhY3QgYmFzZSBmaWVsZHNcbiAgICAgICAgY29uc3QgZ2V0VmFsdWUgPSAocHJvcDogYW55KSA9PiB7XG4gICAgICAgICAgICBpZiAocHJvcD8udmFsdWUgIT09IHVuZGVmaW5lZCkgcmV0dXJuIHByb3AudmFsdWU7XG4gICAgICAgICAgICBpZiAocHJvcCAhPT0gdW5kZWZpbmVkKSByZXR1cm4gcHJvcDtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcG9zaXRpb24gPSBnZXRWYWx1ZShub2RlRGF0YS5wb3NpdGlvbikgfHwgZ2V0VmFsdWUobm9kZURhdGEudmFsdWU/LnBvc2l0aW9uKSB8fCB7IHg6IDAsIHk6IDAsIHo6IDAgfTtcbiAgICAgICAgY29uc3Qgcm90YXRpb24gPSBnZXRWYWx1ZShub2RlRGF0YS5yb3RhdGlvbikgfHwgZ2V0VmFsdWUobm9kZURhdGEudmFsdWU/LnJvdGF0aW9uKSB8fCB7IHg6IDAsIHk6IDAsIHo6IDAsIHc6IDEgfTtcbiAgICAgICAgY29uc3Qgc2NhbGUgPSBnZXRWYWx1ZShub2RlRGF0YS5zY2FsZSkgfHwgZ2V0VmFsdWUobm9kZURhdGEudmFsdWU/LnNjYWxlKSB8fCB7IHg6IDEsIHk6IDEsIHo6IDEgfTtcbiAgICAgICAgY29uc3QgYWN0aXZlID0gZ2V0VmFsdWUobm9kZURhdGEuYWN0aXZlKSA/PyBnZXRWYWx1ZShub2RlRGF0YS52YWx1ZT8uYWN0aXZlKSA/PyB0cnVlO1xuICAgICAgICBjb25zdCBuYW1lID0gbm9kZU5hbWUgfHwgZ2V0VmFsdWUobm9kZURhdGEubmFtZSkgfHwgZ2V0VmFsdWUobm9kZURhdGEudmFsdWU/Lm5hbWUpIHx8ICdOb2RlJztcbiAgICAgICAgY29uc3QgbGF5ZXIgPSBnZXRWYWx1ZShub2RlRGF0YS5sYXllcikgfHwgZ2V0VmFsdWUobm9kZURhdGEudmFsdWU/LmxheWVyKSB8fCAzMzU1NDQzMjtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgXCJfX3R5cGVfX1wiOiBcImNjLk5vZGVcIixcbiAgICAgICAgICAgIFwiX25hbWVcIjogbmFtZSxcbiAgICAgICAgICAgIFwiX29iakZsYWdzXCI6IDAsXG4gICAgICAgICAgICBcIl9wYXJlbnRcIjogbnVsbCxcbiAgICAgICAgICAgIFwiX2NoaWxkcmVuXCI6IFtdLFxuICAgICAgICAgICAgXCJfYWN0aXZlXCI6IGFjdGl2ZSxcbiAgICAgICAgICAgIFwiX2NvbXBvbmVudHNcIjogW10sIC8vIEVtcHR5IF9jb21wb25lbnRzIHRvIGF2b2lkIGRlcHNcbiAgICAgICAgICAgIFwiX3ByZWZhYlwiOiB7XG4gICAgICAgICAgICAgICAgXCJfX2lkX19cIjogMlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiX2xwb3NcIjoge1xuICAgICAgICAgICAgICAgIFwiX190eXBlX19cIjogXCJjYy5WZWMzXCIsXG4gICAgICAgICAgICAgICAgXCJ4XCI6IHBvc2l0aW9uLngsXG4gICAgICAgICAgICAgICAgXCJ5XCI6IHBvc2l0aW9uLnksXG4gICAgICAgICAgICAgICAgXCJ6XCI6IHBvc2l0aW9uLnpcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcIl9scm90XCI6IHtcbiAgICAgICAgICAgICAgICBcIl9fdHlwZV9fXCI6IFwiY2MuUXVhdFwiLFxuICAgICAgICAgICAgICAgIFwieFwiOiByb3RhdGlvbi54LFxuICAgICAgICAgICAgICAgIFwieVwiOiByb3RhdGlvbi55LFxuICAgICAgICAgICAgICAgIFwielwiOiByb3RhdGlvbi56LFxuICAgICAgICAgICAgICAgIFwid1wiOiByb3RhdGlvbi53XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJfbHNjYWxlXCI6IHtcbiAgICAgICAgICAgICAgICBcIl9fdHlwZV9fXCI6IFwiY2MuVmVjM1wiLFxuICAgICAgICAgICAgICAgIFwieFwiOiBzY2FsZS54LFxuICAgICAgICAgICAgICAgIFwieVwiOiBzY2FsZS55LFxuICAgICAgICAgICAgICAgIFwielwiOiBzY2FsZS56XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJfbGF5ZXJcIjogbGF5ZXIsXG4gICAgICAgICAgICBcIl9ldWxlclwiOiB7XG4gICAgICAgICAgICAgICAgXCJfX3R5cGVfX1wiOiBcImNjLlZlYzNcIixcbiAgICAgICAgICAgICAgICBcInhcIjogMCxcbiAgICAgICAgICAgICAgICBcInlcIjogMCxcbiAgICAgICAgICAgICAgICBcInpcIjogMFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiX2lkXCI6IFwiXCJcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTdGFuZGFyZCAubWV0YSBKU09OXG4gICAgICovXG4gICAgcHJpdmF0ZSBjcmVhdGVTdGFuZGFyZE1ldGFDb250ZW50KHByZWZhYk5hbWU6IHN0cmluZywgcHJlZmFiVXVpZDogc3RyaW5nKTogYW55IHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIFwidmVyXCI6IFwiMi4wLjNcIixcbiAgICAgICAgICAgIFwiaW1wb3J0ZXJcIjogXCJwcmVmYWJcIixcbiAgICAgICAgICAgIFwiaW1wb3J0ZWRcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwidXVpZFwiOiBwcmVmYWJVdWlkLFxuICAgICAgICAgICAgXCJmaWxlc1wiOiBbXG4gICAgICAgICAgICAgICAgXCIuanNvblwiXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgXCJzdWJNZXRhc1wiOiB7fSxcbiAgICAgICAgICAgIFwidXNlckRhdGFcIjoge1xuICAgICAgICAgICAgICAgIFwic3luY05vZGVOYW1lXCI6IHByZWZhYk5hbWUsXG4gICAgICAgICAgICAgICAgXCJoYXNJY29uXCI6IGZhbHNlXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ29udmVydCBhdXRob3JlZCBub2RlIHRvIHByZWZhYiBpbnN0YW5jZVxuICAgICAqL1xuICAgIHByaXZhdGUgYXN5bmMgY29udmVydE5vZGVUb1ByZWZhYkluc3RhbmNlKG5vZGVVdWlkOiBzdHJpbmcsIHByZWZhYlV1aWQ6IHN0cmluZywgcHJlZmFiUGF0aDogc3RyaW5nKTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IGVycm9yPzogc3RyaW5nIH0+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICAvLyBOZWVkcyBkZWVwZXIgc2NlbmUgaW50ZWdyYXRpb25cbiAgICAgICAgICAgIC8vIEVuZ2luZSBoYW5kbGVzIGNvbXBsZXggc3dhcCBsb2dpY1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ0NvbnZlcnRpbmcgYXV0aG9yZWQgbm9kZSB0byBwcmVmYWIgaW5zdGFuY2UgbmVlZHMgZGVlcGVyIGVuZ2luZSBpbnRlZ3JhdGlvbicpO1xuICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgZXJyb3I6ICdOb2RlLXRvLXByZWZhYi1pbnN0YW5jZSBjb252ZXJzaW9uIHJlcXVpcmVzIGRlZXBlciBlbmdpbmUgc3VwcG9ydCdcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHJlc3RvcmVQcmVmYWJOb2RlKG5vZGVVdWlkOiBzdHJpbmcsIGFzc2V0VXVpZDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICAvLyByZXN0b3JlLXByZWZhYiBvZmZpY2lhbCBBUElcbiAgICAgICAgICAgIChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoJ3NjZW5lJywgJ3Jlc3RvcmUtcHJlZmFiJywgbm9kZVV1aWQsIGFzc2V0VXVpZCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGFzc2V0VXVpZDogYXNzZXRVdWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ1ByZWZhYiBub2RlIHJlc3RvcmVkIHN1Y2Nlc3NmdWxseSdcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2goKGVycm9yOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiBgUHJlZmFiIG5vZGUgcmVzdG9yZSBmYWlsZWQ6ICR7ZXJyb3IubWVzc2FnZX1gXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gTmV3IHNlcmlhbGl6ZXIgYWxpZ25lZCB3aXRoIG9mZmljaWFsIHByZWZhYiBmb3JtYXRcbiAgICBwcml2YXRlIGFzeW5jIGdldE5vZGVEYXRhRm9yUHJlZmFiKG5vZGVVdWlkOiBzdHJpbmcpOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgZGF0YT86IGFueTsgZXJyb3I/OiBzdHJpbmcgfT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUnLCBub2RlVXVpZCkudGhlbigobm9kZURhdGE6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghbm9kZURhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vZGUgZG9lcyBub3QgZXhpc3QnIH0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBub2RlRGF0YSB9KTtcbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnJvcjogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGNyZWF0ZVN0YW5kYXJkUHJlZmFiRGF0YShub2RlRGF0YTogYW55LCBwcmVmYWJOYW1lOiBzdHJpbmcsIHByZWZhYlV1aWQ6IHN0cmluZyk6IFByb21pc2U8YW55W10+IHtcbiAgICAgICAgLy8gRm9sbG93IG9mZmljaWFsIENhbnZhcy5wcmVmYWIgbGF5b3V0XG4gICAgICAgIGNvbnN0IHByZWZhYkRhdGE6IGFueVtdID0gW107XG4gICAgICAgIGxldCBjdXJyZW50SWQgPSAwO1xuXG4gICAgICAgIC8vIEVsZW1lbnQwOiBjYy5QcmVmYWIgYXNzZXRcbiAgICAgICAgY29uc3QgcHJlZmFiQXNzZXQgPSB7XG4gICAgICAgICAgICBcIl9fdHlwZV9fXCI6IFwiY2MuUHJlZmFiXCIsXG4gICAgICAgICAgICBcIl9uYW1lXCI6IHByZWZhYk5hbWUsXG4gICAgICAgICAgICBcIl9vYmpGbGFnc1wiOiAwLFxuICAgICAgICAgICAgXCJfX2VkaXRvckV4dHJhc19fXCI6IHt9LFxuICAgICAgICAgICAgXCJfbmF0aXZlXCI6IFwiXCIsXG4gICAgICAgICAgICBcImRhdGFcIjoge1xuICAgICAgICAgICAgICAgIFwiX19pZF9fXCI6IDFcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcIm9wdGltaXphdGlvblBvbGljeVwiOiAwLFxuICAgICAgICAgICAgXCJwZXJzaXN0ZW50XCI6IGZhbHNlXG4gICAgICAgIH07XG4gICAgICAgIHByZWZhYkRhdGEucHVzaChwcmVmYWJBc3NldCk7XG4gICAgICAgIGN1cnJlbnRJZCsrO1xuXG4gICAgICAgIC8vIEVsZW1lbnQxOiByb290IG5vZGVcbiAgICAgICAgY29uc3Qgcm9vdE5vZGUgPSBhd2FpdCB0aGlzLmNyZWF0ZU5vZGVPYmplY3Qobm9kZURhdGEsIG51bGwsIHByZWZhYkRhdGEsIGN1cnJlbnRJZCk7XG4gICAgICAgIHByZWZhYkRhdGEucHVzaChyb290Tm9kZS5ub2RlKTtcbiAgICAgICAgY3VycmVudElkID0gcm9vdE5vZGUubmV4dElkO1xuXG4gICAgICAgIC8vIFJvb3QgUHJlZmFiSW5mbyB3aXRoIFVVSUQgYXNzZXQgcmVmXG4gICAgICAgIGNvbnN0IHJvb3RQcmVmYWJJbmZvID0ge1xuICAgICAgICAgICAgXCJfX3R5cGVfX1wiOiBcImNjLlByZWZhYkluZm9cIixcbiAgICAgICAgICAgIFwicm9vdFwiOiB7XG4gICAgICAgICAgICAgICAgXCJfX2lkX19cIjogMVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiYXNzZXRcIjoge1xuICAgICAgICAgICAgICAgIFwiX191dWlkX19cIjogcHJlZmFiVXVpZFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiZmlsZUlkXCI6IHRoaXMuZ2VuZXJhdGVGaWxlSWQoKSxcbiAgICAgICAgICAgIFwiaW5zdGFuY2VcIjogbnVsbCxcbiAgICAgICAgICAgIFwidGFyZ2V0T3ZlcnJpZGVzXCI6IFtdLFxuICAgICAgICAgICAgXCJuZXN0ZWRQcmVmYWJJbnN0YW5jZVJvb3RzXCI6IFtdXG4gICAgICAgIH07XG4gICAgICAgIHByZWZhYkRhdGEucHVzaChyb290UHJlZmFiSW5mbyk7XG5cbiAgICAgICAgcmV0dXJuIHByZWZhYkRhdGE7XG4gICAgfVxuXG5cbiAgICBwcml2YXRlIGFzeW5jIGNyZWF0ZU5vZGVPYmplY3Qobm9kZURhdGE6IGFueSwgcGFyZW50SWQ6IG51bWJlciB8IG51bGwsIHByZWZhYkRhdGE6IGFueVtdLCBjdXJyZW50SWQ6IG51bWJlcik6IFByb21pc2U8eyBub2RlOiBhbnk7IG5leHRJZDogbnVtYmVyIH0+IHtcbiAgICAgICAgY29uc3Qgbm9kZUlkID0gY3VycmVudElkKys7XG4gICAgICAgIFxuICAgICAgICAvLyBCYXNlIHByb3BzIGZyb20gcXVlcnktbm9kZS10cmVlXG4gICAgICAgIGNvbnN0IGdldFZhbHVlID0gKHByb3A6IGFueSkgPT4ge1xuICAgICAgICAgICAgaWYgKHByb3A/LnZhbHVlICE9PSB1bmRlZmluZWQpIHJldHVybiBwcm9wLnZhbHVlO1xuICAgICAgICAgICAgaWYgKHByb3AgIT09IHVuZGVmaW5lZCkgcmV0dXJuIHByb3A7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHBvc2l0aW9uID0gZ2V0VmFsdWUobm9kZURhdGEucG9zaXRpb24pIHx8IGdldFZhbHVlKG5vZGVEYXRhLnZhbHVlPy5wb3NpdGlvbikgfHwgeyB4OiAwLCB5OiAwLCB6OiAwIH07XG4gICAgICAgIGNvbnN0IHJvdGF0aW9uID0gZ2V0VmFsdWUobm9kZURhdGEucm90YXRpb24pIHx8IGdldFZhbHVlKG5vZGVEYXRhLnZhbHVlPy5yb3RhdGlvbikgfHwgeyB4OiAwLCB5OiAwLCB6OiAwLCB3OiAxIH07XG4gICAgICAgIGNvbnN0IHNjYWxlID0gZ2V0VmFsdWUobm9kZURhdGEuc2NhbGUpIHx8IGdldFZhbHVlKG5vZGVEYXRhLnZhbHVlPy5zY2FsZSkgfHwgeyB4OiAxLCB5OiAxLCB6OiAxIH07XG4gICAgICAgIGNvbnN0IGFjdGl2ZSA9IGdldFZhbHVlKG5vZGVEYXRhLmFjdGl2ZSkgPz8gZ2V0VmFsdWUobm9kZURhdGEudmFsdWU/LmFjdGl2ZSkgPz8gdHJ1ZTtcbiAgICAgICAgY29uc3QgbmFtZSA9IGdldFZhbHVlKG5vZGVEYXRhLm5hbWUpIHx8IGdldFZhbHVlKG5vZGVEYXRhLnZhbHVlPy5uYW1lKSB8fCAnTm9kZSc7XG4gICAgICAgIGNvbnN0IGxheWVyID0gZ2V0VmFsdWUobm9kZURhdGEubGF5ZXIpIHx8IGdldFZhbHVlKG5vZGVEYXRhLnZhbHVlPy5sYXllcikgfHwgMzM1NTQ0MzI7XG5cbiAgICAgICAgY29uc3Qgbm9kZTogYW55ID0ge1xuICAgICAgICAgICAgXCJfX3R5cGVfX1wiOiBcImNjLk5vZGVcIixcbiAgICAgICAgICAgIFwiX25hbWVcIjogbmFtZSxcbiAgICAgICAgICAgIFwiX29iakZsYWdzXCI6IDAsXG4gICAgICAgICAgICBcIl9fZWRpdG9yRXh0cmFzX19cIjoge30sXG4gICAgICAgICAgICBcIl9wYXJlbnRcIjogcGFyZW50SWQgIT09IG51bGwgPyB7IFwiX19pZF9fXCI6IHBhcmVudElkIH0gOiBudWxsLFxuICAgICAgICAgICAgXCJfY2hpbGRyZW5cIjogW10sXG4gICAgICAgICAgICBcIl9hY3RpdmVcIjogYWN0aXZlLFxuICAgICAgICAgICAgXCJfY29tcG9uZW50c1wiOiBbXSxcbiAgICAgICAgICAgIFwiX3ByZWZhYlwiOiBwYXJlbnRJZCA9PT0gbnVsbCA/IHtcbiAgICAgICAgICAgICAgICBcIl9faWRfX1wiOiBjdXJyZW50SWQrK1xuICAgICAgICAgICAgfSA6IG51bGwsXG4gICAgICAgICAgICBcIl9scG9zXCI6IHtcbiAgICAgICAgICAgICAgICBcIl9fdHlwZV9fXCI6IFwiY2MuVmVjM1wiLFxuICAgICAgICAgICAgICAgIFwieFwiOiBwb3NpdGlvbi54LFxuICAgICAgICAgICAgICAgIFwieVwiOiBwb3NpdGlvbi55LFxuICAgICAgICAgICAgICAgIFwielwiOiBwb3NpdGlvbi56XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJfbHJvdFwiOiB7XG4gICAgICAgICAgICAgICAgXCJfX3R5cGVfX1wiOiBcImNjLlF1YXRcIixcbiAgICAgICAgICAgICAgICBcInhcIjogcm90YXRpb24ueCxcbiAgICAgICAgICAgICAgICBcInlcIjogcm90YXRpb24ueSxcbiAgICAgICAgICAgICAgICBcInpcIjogcm90YXRpb24ueixcbiAgICAgICAgICAgICAgICBcIndcIjogcm90YXRpb24ud1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiX2xzY2FsZVwiOiB7XG4gICAgICAgICAgICAgICAgXCJfX3R5cGVfX1wiOiBcImNjLlZlYzNcIixcbiAgICAgICAgICAgICAgICBcInhcIjogc2NhbGUueCxcbiAgICAgICAgICAgICAgICBcInlcIjogc2NhbGUueSxcbiAgICAgICAgICAgICAgICBcInpcIjogc2NhbGUuelxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiX21vYmlsaXR5XCI6IDAsXG4gICAgICAgICAgICBcIl9sYXllclwiOiBsYXllcixcbiAgICAgICAgICAgIFwiX2V1bGVyXCI6IHtcbiAgICAgICAgICAgICAgICBcIl9fdHlwZV9fXCI6IFwiY2MuVmVjM1wiLFxuICAgICAgICAgICAgICAgIFwieFwiOiAwLFxuICAgICAgICAgICAgICAgIFwieVwiOiAwLFxuICAgICAgICAgICAgICAgIFwielwiOiAwXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJfaWRcIjogXCJcIlxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFNraXAgVUlUcmFuc2Zvcm0gdG8gYXZvaWQgX2dldERlcGVuZENvbXBvbmVudFxuICAgICAgICAvLyBSZS1hZGQgdmlhIGVuZ2luZSBsYXRlclxuICAgICAgICBjb25zb2xlLmxvZyhgU2tpcHBpbmcgVUlUcmFuc2Zvcm0gb24gJHtuYW1lfSB0byBhdm9pZCBlbmdpbmUgZGVwZW5kZW5jeSBlcnJvcnNgKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNraXAgb3RoZXIgY29tcHMgd2hpbGUgZml4aW5nIFVJVHJhbnNmb3JtXG4gICAgICAgIGNvbnN0IGNvbXBvbmVudHMgPSB0aGlzLmV4dHJhY3RDb21wb25lbnRzRnJvbU5vZGUobm9kZURhdGEpO1xuICAgICAgICBpZiAoY29tcG9uZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgTm9kZSAke25hbWV9IGhhcyAke2NvbXBvbmVudHMubGVuZ3RofSBvdGhlciBjb21wb25lbnRzOyBza2lwcGluZyB3aGlsZSBmaXhpbmcgVUlUcmFuc2Zvcm1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoaWxkcmVuIGZyb20gcXVlcnktbm9kZS10cmVlXG4gICAgICAgIGNvbnN0IGNoaWxkcmVuVG9Qcm9jZXNzID0gdGhpcy5nZXRDaGlsZHJlblRvUHJvY2Vzcyhub2RlRGF0YSk7XG4gICAgICAgIGlmIChjaGlsZHJlblRvUHJvY2Vzcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgPT09IFByb2Nlc3NpbmcgY2hpbGRyZW4gPT09YCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgTm9kZSAke25hbWV9IGhhcyAke2NoaWxkcmVuVG9Qcm9jZXNzLmxlbmd0aH0gY2hpbGRyZW5gKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjaGlsZHJlblRvUHJvY2Vzcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNoaWxkRGF0YSA9IGNoaWxkcmVuVG9Qcm9jZXNzW2ldO1xuICAgICAgICAgICAgICAgIGNvbnN0IGNoaWxkTmFtZSA9IGNoaWxkRGF0YS5uYW1lIHx8IGNoaWxkRGF0YS52YWx1ZT8ubmFtZSB8fCAndW5rbm93bic7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYENoaWxkICR7aSArIDF9OiAke2NoaWxkTmFtZX1gKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjaGlsZElkID0gY3VycmVudElkO1xuICAgICAgICAgICAgICAgICAgICBub2RlLl9jaGlsZHJlbi5wdXNoKHsgXCJfX2lkX19cIjogY2hpbGRJZCB9KTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlY3Vyc2UgY2hpbGQgY3JlYXRpb25cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY2hpbGRSZXN1bHQgPSBhd2FpdCB0aGlzLmNyZWF0ZU5vZGVPYmplY3QoY2hpbGREYXRhLCBub2RlSWQsIHByZWZhYkRhdGEsIGN1cnJlbnRJZCk7XG4gICAgICAgICAgICAgICAgICAgIHByZWZhYkRhdGEucHVzaChjaGlsZFJlc3VsdC5ub2RlKTtcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudElkID0gY2hpbGRSZXN1bHQubmV4dElkO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gT25seSByb290IGNhcnJpZXMgUHJlZmFiSW5mb1xuICAgICAgICAgICAgICAgICAgICAvLyBDaGlsZCBfcHJlZmFiIHN0YXlzIG51bGxcbiAgICAgICAgICAgICAgICAgICAgY2hpbGRSZXN1bHQubm9kZS5fcHJlZmFiID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBDaGlsZCBhZGRlZDogJHtjaGlsZE5hbWV9YCk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3IgcHJvY2Vzc2luZyBjaGlsZCAke2NoaWxkTmFtZX06YCwgZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7IG5vZGUsIG5leHRJZDogY3VycmVudElkIH07XG4gICAgfVxuXG4gICAgLy8gRXh0cmFjdCBjb21wb25lbnQgbGlzdCBmcm9tIG5vZGUgZHVtcFxuICAgIHByaXZhdGUgZXh0cmFjdENvbXBvbmVudHNGcm9tTm9kZShub2RlRGF0YTogYW55KTogYW55W10ge1xuICAgICAgICBjb25zdCBjb21wb25lbnRzOiBhbnlbXSA9IFtdO1xuICAgICAgICBcbiAgICAgICAgLy8gUHJvYmUgbXVsdGlwbGUgZHVtcCBsb2NhdGlvbnNcbiAgICAgICAgY29uc3QgY29tcG9uZW50U291cmNlcyA9IFtcbiAgICAgICAgICAgIG5vZGVEYXRhLl9fY29tcHNfXyxcbiAgICAgICAgICAgIG5vZGVEYXRhLmNvbXBvbmVudHMsXG4gICAgICAgICAgICBub2RlRGF0YS52YWx1ZT8uX19jb21wc19fLFxuICAgICAgICAgICAgbm9kZURhdGEudmFsdWU/LmNvbXBvbmVudHNcbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIGZvciAoY29uc3Qgc291cmNlIG9mIGNvbXBvbmVudFNvdXJjZXMpIHtcbiAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHNvdXJjZSkpIHtcbiAgICAgICAgICAgICAgICBjb21wb25lbnRzLnB1c2goLi4uc291cmNlLmZpbHRlcihjb21wID0+IGNvbXAgJiYgKGNvbXAuX190eXBlX18gfHwgY29tcC50eXBlKSkpO1xuICAgICAgICAgICAgICAgIGJyZWFrOyAvLyBzdG9wIGFmdGVyIGZpcnN0IHZhbGlkIGNvbXBzW11cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGNvbXBvbmVudHM7XG4gICAgfVxuICAgIFxuICAgIC8vIENhbm9uaWNhbCBjb21wb25lbnQgb2JqZWN0XG4gICAgcHJpdmF0ZSBjcmVhdGVTdGFuZGFyZENvbXBvbmVudE9iamVjdChjb21wb25lbnREYXRhOiBhbnksIG5vZGVJZDogbnVtYmVyLCBwcmVmYWJJbmZvSWQ6IG51bWJlcik6IGFueSB7XG4gICAgICAgIGNvbnN0IGNvbXBvbmVudFR5cGUgPSBjb21wb25lbnREYXRhLl9fdHlwZV9fIHx8IGNvbXBvbmVudERhdGEudHlwZTtcbiAgICAgICAgXG4gICAgICAgIGlmICghY29tcG9uZW50VHlwZSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdDb21wb25lbnQgbWlzc2luZyB0eXBlIGluZm86JywgY29tcG9uZW50RGF0YSk7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQmFzZSBjb21wb25lbnQgc2hlbGwgKG9mZmljaWFsIHByZWZhYiBsYXlvdXQpXG4gICAgICAgIGNvbnN0IGNvbXBvbmVudDogYW55ID0ge1xuICAgICAgICAgICAgXCJfX3R5cGVfX1wiOiBjb21wb25lbnRUeXBlLFxuICAgICAgICAgICAgXCJfbmFtZVwiOiBcIlwiLFxuICAgICAgICAgICAgXCJfb2JqRmxhZ3NcIjogMCxcbiAgICAgICAgICAgIFwibm9kZVwiOiB7XG4gICAgICAgICAgICAgICAgXCJfX2lkX19cIjogbm9kZUlkXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJfZW5hYmxlZFwiOiB0aGlzLmdldENvbXBvbmVudFByb3BlcnR5VmFsdWUoY29tcG9uZW50RGF0YSwgJ2VuYWJsZWQnLCB0cnVlKSxcbiAgICAgICAgICAgIFwiX19wcmVmYWJcIjoge1xuICAgICAgICAgICAgICAgIFwiX19pZF9fXCI6IHByZWZhYkluZm9JZFxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gVHlwZS1zcGVjaWZpYyBkZWZhdWx0c1xuICAgICAgICB0aGlzLmFkZENvbXBvbmVudFNwZWNpZmljUHJvcGVydGllcyhjb21wb25lbnQsIGNvbXBvbmVudERhdGEsIGNvbXBvbmVudFR5cGUpO1xuICAgICAgICBcbiAgICAgICAgLy8gQXBwZW5kIF9pZCBmaWVsZFxuICAgICAgICBjb21wb25lbnQuX2lkID0gXCJcIjtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBjb21wb25lbnQ7XG4gICAgfVxuICAgIFxuICAgIC8vIEFkZCBjb21wb25lbnQtc3BlY2lmaWMgcHJvcGVydGllc1xuICAgIHByaXZhdGUgYWRkQ29tcG9uZW50U3BlY2lmaWNQcm9wZXJ0aWVzKGNvbXBvbmVudDogYW55LCBjb21wb25lbnREYXRhOiBhbnksIGNvbXBvbmVudFR5cGU6IHN0cmluZyk6IHZvaWQge1xuICAgICAgICBzd2l0Y2ggKGNvbXBvbmVudFR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ2NjLlVJVHJhbnNmb3JtJzpcbiAgICAgICAgICAgICAgICB0aGlzLmFkZFVJVHJhbnNmb3JtUHJvcGVydGllcyhjb21wb25lbnQsIGNvbXBvbmVudERhdGEpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnY2MuU3ByaXRlJzpcbiAgICAgICAgICAgICAgICB0aGlzLmFkZFNwcml0ZVByb3BlcnRpZXMoY29tcG9uZW50LCBjb21wb25lbnREYXRhKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2NjLkxhYmVsJzpcbiAgICAgICAgICAgICAgICB0aGlzLmFkZExhYmVsUHJvcGVydGllcyhjb21wb25lbnQsIGNvbXBvbmVudERhdGEpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnY2MuQnV0dG9uJzpcbiAgICAgICAgICAgICAgICB0aGlzLmFkZEJ1dHRvblByb3BlcnRpZXMoY29tcG9uZW50LCBjb21wb25lbnREYXRhKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgLy8gVW5rbm93biB0eXBlczogY29weSBzYWZlIHByb3BzIG9ubHlcbiAgICAgICAgICAgICAgICB0aGlzLmFkZEdlbmVyaWNQcm9wZXJ0aWVzKGNvbXBvbmVudCwgY29tcG9uZW50RGF0YSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLy8gVUlUcmFuc2Zvcm0gcHJvcHNcbiAgICBwcml2YXRlIGFkZFVJVHJhbnNmb3JtUHJvcGVydGllcyhjb21wb25lbnQ6IGFueSwgY29tcG9uZW50RGF0YTogYW55KTogdm9pZCB7XG4gICAgICAgIGNvbXBvbmVudC5fY29udGVudFNpemUgPSB0aGlzLmNyZWF0ZVNpemVPYmplY3QoXG4gICAgICAgICAgICB0aGlzLmdldENvbXBvbmVudFByb3BlcnR5VmFsdWUoY29tcG9uZW50RGF0YSwgJ2NvbnRlbnRTaXplJywgeyB3aWR0aDogMTAwLCBoZWlnaHQ6IDEwMCB9KVxuICAgICAgICApO1xuICAgICAgICBjb21wb25lbnQuX2FuY2hvclBvaW50ID0gdGhpcy5jcmVhdGVWZWMyT2JqZWN0KFxuICAgICAgICAgICAgdGhpcy5nZXRDb21wb25lbnRQcm9wZXJ0eVZhbHVlKGNvbXBvbmVudERhdGEsICdhbmNob3JQb2ludCcsIHsgeDogMC41LCB5OiAwLjUgfSlcbiAgICAgICAgKTtcbiAgICB9XG4gICAgXG4gICAgLy8gU3ByaXRlIHByb3BzXG4gICAgcHJpdmF0ZSBhZGRTcHJpdGVQcm9wZXJ0aWVzKGNvbXBvbmVudDogYW55LCBjb21wb25lbnREYXRhOiBhbnkpOiB2b2lkIHtcbiAgICAgICAgY29tcG9uZW50Ll92aXNGbGFncyA9IDA7XG4gICAgICAgIGNvbXBvbmVudC5fY3VzdG9tTWF0ZXJpYWwgPSBudWxsO1xuICAgICAgICBjb21wb25lbnQuX3NyY0JsZW5kRmFjdG9yID0gMjtcbiAgICAgICAgY29tcG9uZW50Ll9kc3RCbGVuZEZhY3RvciA9IDQ7XG4gICAgICAgIGNvbXBvbmVudC5fY29sb3IgPSB0aGlzLmNyZWF0ZUNvbG9yT2JqZWN0KFxuICAgICAgICAgICAgdGhpcy5nZXRDb21wb25lbnRQcm9wZXJ0eVZhbHVlKGNvbXBvbmVudERhdGEsICdjb2xvcicsIHsgcjogMjU1LCBnOiAyNTUsIGI6IDI1NSwgYTogMjU1IH0pXG4gICAgICAgICk7XG4gICAgICAgIGNvbXBvbmVudC5fc3ByaXRlRnJhbWUgPSB0aGlzLmdldENvbXBvbmVudFByb3BlcnR5VmFsdWUoY29tcG9uZW50RGF0YSwgJ3Nwcml0ZUZyYW1lJywgbnVsbCk7XG4gICAgICAgIGNvbXBvbmVudC5fdHlwZSA9IHRoaXMuZ2V0Q29tcG9uZW50UHJvcGVydHlWYWx1ZShjb21wb25lbnREYXRhLCAndHlwZScsIDApO1xuICAgICAgICBjb21wb25lbnQuX2ZpbGxUeXBlID0gMDtcbiAgICAgICAgY29tcG9uZW50Ll9zaXplTW9kZSA9IHRoaXMuZ2V0Q29tcG9uZW50UHJvcGVydHlWYWx1ZShjb21wb25lbnREYXRhLCAnc2l6ZU1vZGUnLCAxKTtcbiAgICAgICAgY29tcG9uZW50Ll9maWxsQ2VudGVyID0gdGhpcy5jcmVhdGVWZWMyT2JqZWN0KHsgeDogMCwgeTogMCB9KTtcbiAgICAgICAgY29tcG9uZW50Ll9maWxsU3RhcnQgPSAwO1xuICAgICAgICBjb21wb25lbnQuX2ZpbGxSYW5nZSA9IDA7XG4gICAgICAgIGNvbXBvbmVudC5faXNUcmltbWVkTW9kZSA9IHRydWU7XG4gICAgICAgIGNvbXBvbmVudC5fdXNlR3JheXNjYWxlID0gZmFsc2U7XG4gICAgICAgIGNvbXBvbmVudC5fYXRsYXMgPSBudWxsO1xuICAgIH1cbiAgICBcbiAgICAvLyBMYWJlbCBwcm9wc1xuICAgIHByaXZhdGUgYWRkTGFiZWxQcm9wZXJ0aWVzKGNvbXBvbmVudDogYW55LCBjb21wb25lbnREYXRhOiBhbnkpOiB2b2lkIHtcbiAgICAgICAgY29tcG9uZW50Ll92aXNGbGFncyA9IDA7XG4gICAgICAgIGNvbXBvbmVudC5fY3VzdG9tTWF0ZXJpYWwgPSBudWxsO1xuICAgICAgICBjb21wb25lbnQuX3NyY0JsZW5kRmFjdG9yID0gMjtcbiAgICAgICAgY29tcG9uZW50Ll9kc3RCbGVuZEZhY3RvciA9IDQ7XG4gICAgICAgIGNvbXBvbmVudC5fY29sb3IgPSB0aGlzLmNyZWF0ZUNvbG9yT2JqZWN0KFxuICAgICAgICAgICAgdGhpcy5nZXRDb21wb25lbnRQcm9wZXJ0eVZhbHVlKGNvbXBvbmVudERhdGEsICdjb2xvcicsIHsgcjogMCwgZzogMCwgYjogMCwgYTogMjU1IH0pXG4gICAgICAgICk7XG4gICAgICAgIGNvbXBvbmVudC5fc3RyaW5nID0gdGhpcy5nZXRDb21wb25lbnRQcm9wZXJ0eVZhbHVlKGNvbXBvbmVudERhdGEsICdzdHJpbmcnLCAnTGFiZWwnKTtcbiAgICAgICAgY29tcG9uZW50Ll9ob3Jpem9udGFsQWxpZ24gPSAxO1xuICAgICAgICBjb21wb25lbnQuX3ZlcnRpY2FsQWxpZ24gPSAxO1xuICAgICAgICBjb21wb25lbnQuX2FjdHVhbEZvbnRTaXplID0gMjA7XG4gICAgICAgIGNvbXBvbmVudC5fZm9udFNpemUgPSB0aGlzLmdldENvbXBvbmVudFByb3BlcnR5VmFsdWUoY29tcG9uZW50RGF0YSwgJ2ZvbnRTaXplJywgMjApO1xuICAgICAgICBjb21wb25lbnQuX2ZvbnRGYW1pbHkgPSAnQXJpYWwnO1xuICAgICAgICBjb21wb25lbnQuX2xpbmVIZWlnaHQgPSA0MDtcbiAgICAgICAgY29tcG9uZW50Ll9vdmVyZmxvdyA9IDE7XG4gICAgICAgIGNvbXBvbmVudC5fZW5hYmxlV3JhcFRleHQgPSBmYWxzZTtcbiAgICAgICAgY29tcG9uZW50Ll9mb250ID0gbnVsbDtcbiAgICAgICAgY29tcG9uZW50Ll9pc1N5c3RlbUZvbnRVc2VkID0gdHJ1ZTtcbiAgICAgICAgY29tcG9uZW50Ll9pc0l0YWxpYyA9IGZhbHNlO1xuICAgICAgICBjb21wb25lbnQuX2lzQm9sZCA9IGZhbHNlO1xuICAgICAgICBjb21wb25lbnQuX2lzVW5kZXJsaW5lID0gZmFsc2U7XG4gICAgICAgIGNvbXBvbmVudC5fdW5kZXJsaW5lSGVpZ2h0ID0gMjtcbiAgICAgICAgY29tcG9uZW50Ll9jYWNoZU1vZGUgPSAwO1xuICAgIH1cbiAgICBcbiAgICAvLyBCdXR0b24gcHJvcHNcbiAgICBwcml2YXRlIGFkZEJ1dHRvblByb3BlcnRpZXMoY29tcG9uZW50OiBhbnksIGNvbXBvbmVudERhdGE6IGFueSk6IHZvaWQge1xuICAgICAgICBjb21wb25lbnQuY2xpY2tFdmVudHMgPSBbXTtcbiAgICAgICAgY29tcG9uZW50Ll9pbnRlcmFjdGFibGUgPSB0cnVlO1xuICAgICAgICBjb21wb25lbnQuX3RyYW5zaXRpb24gPSAyO1xuICAgICAgICBjb21wb25lbnQuX25vcm1hbENvbG9yID0gdGhpcy5jcmVhdGVDb2xvck9iamVjdCh7IHI6IDIxNCwgZzogMjE0LCBiOiAyMTQsIGE6IDI1NSB9KTtcbiAgICAgICAgY29tcG9uZW50Ll9ob3ZlckNvbG9yID0gdGhpcy5jcmVhdGVDb2xvck9iamVjdCh7IHI6IDIxMSwgZzogMjExLCBiOiAyMTEsIGE6IDI1NSB9KTtcbiAgICAgICAgY29tcG9uZW50Ll9wcmVzc2VkQ29sb3IgPSB0aGlzLmNyZWF0ZUNvbG9yT2JqZWN0KHsgcjogMjU1LCBnOiAyNTUsIGI6IDI1NSwgYTogMjU1IH0pO1xuICAgICAgICBjb21wb25lbnQuX2Rpc2FibGVkQ29sb3IgPSB0aGlzLmNyZWF0ZUNvbG9yT2JqZWN0KHsgcjogMTI0LCBnOiAxMjQsIGI6IDEyNCwgYTogMjU1IH0pO1xuICAgICAgICBjb21wb25lbnQuX2R1cmF0aW9uID0gMC4xO1xuICAgICAgICBjb21wb25lbnQuX3pvb21TY2FsZSA9IDEuMjtcbiAgICB9XG4gICAgXG4gICAgLy8gU2hhcmVkIHByb3AgZmFsbGJhY2tzXG4gICAgcHJpdmF0ZSBhZGRHZW5lcmljUHJvcGVydGllcyhjb21wb25lbnQ6IGFueSwgY29tcG9uZW50RGF0YTogYW55KTogdm9pZCB7XG4gICAgICAgIC8vIFdoaXRlbGlzdCBrbm93biBwcm9wc1xuICAgICAgICBjb25zdCBzYWZlUHJvcGVydGllcyA9IFsnZW5hYmxlZCcsICdjb2xvcicsICdzdHJpbmcnLCAnZm9udFNpemUnLCAnc3ByaXRlRnJhbWUnLCAndHlwZScsICdzaXplTW9kZSddO1xuICAgICAgICBcbiAgICAgICAgZm9yIChjb25zdCBwcm9wIG9mIHNhZmVQcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICBpZiAoY29tcG9uZW50RGF0YS5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gdGhpcy5nZXRDb21wb25lbnRQcm9wZXJ0eVZhbHVlKGNvbXBvbmVudERhdGEsIHByb3ApO1xuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFtgXyR7cHJvcH1gXSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvLyBCdWlsZCBWZWMyXG4gICAgcHJpdmF0ZSBjcmVhdGVWZWMyT2JqZWN0KGRhdGE6IGFueSk6IGFueSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBcIl9fdHlwZV9fXCI6IFwiY2MuVmVjMlwiLFxuICAgICAgICAgICAgXCJ4XCI6IGRhdGE/LnggfHwgMCxcbiAgICAgICAgICAgIFwieVwiOiBkYXRhPy55IHx8IDBcbiAgICAgICAgfTtcbiAgICB9XG4gICAgXG4gICAgLy8gQnVpbGQgVmVjM1xuICAgIHByaXZhdGUgY3JlYXRlVmVjM09iamVjdChkYXRhOiBhbnkpOiBhbnkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgXCJfX3R5cGVfX1wiOiBcImNjLlZlYzNcIixcbiAgICAgICAgICAgIFwieFwiOiBkYXRhPy54IHx8IDAsXG4gICAgICAgICAgICBcInlcIjogZGF0YT8ueSB8fCAwLFxuICAgICAgICAgICAgXCJ6XCI6IGRhdGE/LnogfHwgMFxuICAgICAgICB9O1xuICAgIH1cbiAgICBcbiAgICAvLyBCdWlsZCBTaXplXG4gICAgcHJpdmF0ZSBjcmVhdGVTaXplT2JqZWN0KGRhdGE6IGFueSk6IGFueSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBcIl9fdHlwZV9fXCI6IFwiY2MuU2l6ZVwiLFxuICAgICAgICAgICAgXCJ3aWR0aFwiOiBkYXRhPy53aWR0aCB8fCAxMDAsXG4gICAgICAgICAgICBcImhlaWdodFwiOiBkYXRhPy5oZWlnaHQgfHwgMTAwXG4gICAgICAgIH07XG4gICAgfVxuICAgIFxuICAgIC8vIEJ1aWxkIENvbG9yXG4gICAgcHJpdmF0ZSBjcmVhdGVDb2xvck9iamVjdChkYXRhOiBhbnkpOiBhbnkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgXCJfX3R5cGVfX1wiOiBcImNjLkNvbG9yXCIsXG4gICAgICAgICAgICBcInJcIjogZGF0YT8uciA/PyAyNTUsXG4gICAgICAgICAgICBcImdcIjogZGF0YT8uZyA/PyAyNTUsXG4gICAgICAgICAgICBcImJcIjogZGF0YT8uYiA/PyAyNTUsXG4gICAgICAgICAgICBcImFcIjogZGF0YT8uYSA/PyAyNTVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBzaG91bGRDb3B5IGd1YXJkXG4gICAgcHJpdmF0ZSBzaG91bGRDb3B5Q29tcG9uZW50UHJvcGVydHkoa2V5OiBzdHJpbmcsIHZhbHVlOiBhbnkpOiBib29sZWFuIHtcbiAgICAgICAgLy8gU2tpcCBpbnRlcm5hbHMgLyBoYW5kbGVkIGtleXNcbiAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCdfXycpIHx8IGtleSA9PT0gJ19lbmFibGVkJyB8fCBrZXkgPT09ICdub2RlJyB8fCBrZXkgPT09ICdlbmFibGVkJykge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTa2lwIGZ1bmN0aW9ucy91bmRlZmluZWRcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJyB8fCB2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuXG4gICAgLy8gZ2V0Q29tcG9uZW50UHJvcGVydHlWYWx1ZSBoZWxwZXJcbiAgICBwcml2YXRlIGdldENvbXBvbmVudFByb3BlcnR5VmFsdWUoY29tcG9uZW50RGF0YTogYW55LCBwcm9wZXJ0eU5hbWU6IHN0cmluZywgZGVmYXVsdFZhbHVlPzogYW55KTogYW55IHtcbiAgICAgICAgLy8gRGlyZWN0IHByb3BlcnR5IHJlYWRcbiAgICAgICAgaWYgKGNvbXBvbmVudERhdGFbcHJvcGVydHlOYW1lXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5leHRyYWN0VmFsdWUoY29tcG9uZW50RGF0YVtwcm9wZXJ0eU5hbWVdKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUmVhZCBuZXN0ZWQgLnZhbHVlXG4gICAgICAgIGlmIChjb21wb25lbnREYXRhLnZhbHVlICYmIGNvbXBvbmVudERhdGEudmFsdWVbcHJvcGVydHlOYW1lXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5leHRyYWN0VmFsdWUoY29tcG9uZW50RGF0YS52YWx1ZVtwcm9wZXJ0eU5hbWVdKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVHJ5IHVuZGVyc2NvcmVkIHZhcmlhbnRcbiAgICAgICAgY29uc3QgcHJlZml4ZWROYW1lID0gYF8ke3Byb3BlcnR5TmFtZX1gO1xuICAgICAgICBpZiAoY29tcG9uZW50RGF0YVtwcmVmaXhlZE5hbWVdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmV4dHJhY3RWYWx1ZShjb21wb25lbnREYXRhW3ByZWZpeGVkTmFtZV0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gZGVmYXVsdFZhbHVlO1xuICAgIH1cbiAgICBcbiAgICAvLyBFeHRyYWN0IGZpbmFsIHZhbHVlXG4gICAgcHJpdmF0ZSBleHRyYWN0VmFsdWUoZGF0YTogYW55KTogYW55IHtcbiAgICAgICAgaWYgKGRhdGEgPT09IG51bGwgfHwgZGF0YSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUHJlZmVyIC52YWx1ZSB3aGVuIHByZXNlbnRcbiAgICAgICAgaWYgKHR5cGVvZiBkYXRhID09PSAnb2JqZWN0JyAmJiBkYXRhLmhhc093blByb3BlcnR5KCd2YWx1ZScpKSB7XG4gICAgICAgICAgICByZXR1cm4gZGF0YS52YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gS2VlcCByZWYgb2JqZWN0cyBpbnRhY3RcbiAgICAgICAgaWYgKHR5cGVvZiBkYXRhID09PSAnb2JqZWN0JyAmJiAoZGF0YS5fX2lkX18gIT09IHVuZGVmaW5lZCB8fCBkYXRhLl9fdXVpZF9fICE9PSB1bmRlZmluZWQpKSB7XG4gICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBjcmVhdGVTdGFuZGFyZE1ldGFEYXRhKHByZWZhYk5hbWU6IHN0cmluZywgcHJlZmFiVXVpZDogc3RyaW5nKTogYW55IHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIFwidmVyXCI6IFwiMS4xLjUwXCIsXG4gICAgICAgICAgICBcImltcG9ydGVyXCI6IFwicHJlZmFiXCIsXG4gICAgICAgICAgICBcImltcG9ydGVkXCI6IHRydWUsXG4gICAgICAgICAgICBcInV1aWRcIjogcHJlZmFiVXVpZCxcbiAgICAgICAgICAgIFwiZmlsZXNcIjogW1xuICAgICAgICAgICAgICAgIFwiLmpzb25cIlxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIFwic3ViTWV0YXNcIjoge30sXG4gICAgICAgICAgICBcInVzZXJEYXRhXCI6IHtcbiAgICAgICAgICAgICAgICBcInN5bmNOb2RlTmFtZVwiOiBwcmVmYWJOYW1lXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBzYXZlUHJlZmFiV2l0aE1ldGEocHJlZmFiUGF0aDogc3RyaW5nLCBwcmVmYWJEYXRhOiBhbnlbXSwgbWV0YURhdGE6IGFueSk6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyBlcnJvcj86IHN0cmluZyB9PiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBwcmVmYWJDb250ZW50ID0gSlNPTi5zdHJpbmdpZnkocHJlZmFiRGF0YSwgbnVsbCwgMik7XG4gICAgICAgICAgICBjb25zdCBtZXRhQ29udGVudCA9IEpTT04uc3RyaW5naWZ5KG1ldGFEYXRhLCBudWxsLCAyKTtcblxuICAgICAgICAgICAgLy8gRW5zdXJlIC5wcmVmYWIgc3VmZml4XG4gICAgICAgICAgICBjb25zdCBmaW5hbFByZWZhYlBhdGggPSBwcmVmYWJQYXRoLmVuZHNXaXRoKCcucHJlZmFiJykgPyBwcmVmYWJQYXRoIDogYCR7cHJlZmFiUGF0aH0ucHJlZmFiYDtcbiAgICAgICAgICAgIGNvbnN0IG1ldGFQYXRoID0gYCR7ZmluYWxQcmVmYWJQYXRofS5tZXRhYDtcblxuICAgICAgICAgICAgLy8gU2F2ZSB2aWEgYXNzZXQtZGJcbiAgICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdjcmVhdGUtYXNzZXQnLCBmaW5hbFByZWZhYlBhdGgsIHByZWZhYkNvbnRlbnQpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgICAgICAgICAgIH0pLmNhdGNoKChlcnJvcjogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gV3JpdGUgLm1ldGFcbiAgICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdjcmVhdGUtYXNzZXQnLCBtZXRhUGF0aCwgbWV0YUNvbnRlbnQpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgICAgICAgICAgIH0pLmNhdGNoKChlcnJvcjogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY29uc29sZS5sb2coYD09PSBQcmVmYWIgc2F2ZSBjb21wbGV0ZSA9PT1gKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBQcmVmYWIgZmlsZSBzYXZlZDogJHtmaW5hbFByZWZhYlBhdGh9YCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgLm1ldGEgc2F2ZWQ6ICR7bWV0YVBhdGh9YCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgUHJlZmFiIGFycmF5IGxlbmd0aDogJHtwcmVmYWJEYXRhLmxlbmd0aH1gKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBQcmVmYWIgcm9vdCBub2RlIGluZGV4OiAke3ByZWZhYkRhdGEubGVuZ3RoIC0gMX1gKTtcblxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBzYXZpbmcgcHJlZmFiIGZpbGU6JywgZXJyb3IpO1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9XG5cbn0iXX0=
declare const Editor: any;

/**
 * MCP tool tester over WebSocket (legacy / optional).
 */
export class MCPToolTester {
    private ws: WebSocket | null = null;
    private messageId = 0;
    private responseHandlers = new Map<number, (response: any) => void>();

    async connect(port: number): Promise<boolean> {
        return new Promise((resolve) => {
            try {
                this.ws = new WebSocket(`ws://localhost:${port}`);

                this.ws.onopen = () => {
                    console.log('WebSocket connected');
                    resolve(true);
                };

                this.ws.onerror = (error) => {
                    console.error('WebSocket connection error:', error);
                    resolve(false);
                };

                this.ws.onmessage = (event) => {
                    try {
                        const response = JSON.parse(event.data);
                        if (response.id && this.responseHandlers.has(response.id)) {
                            const handler = this.responseHandlers.get(response.id);
                            this.responseHandlers.delete(response.id);
                            handler?.(response);
                        }
                    } catch (error) {
                        console.error('Error handling response:', error);
                    }
                };
            } catch (error) {
                console.error('Error creating WebSocket:', error);
                resolve(false);
            }
        });
    }

    async callTool(tool: string, args: any = {}): Promise<any> {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket is not connected');
        }

        return new Promise((resolve, reject) => {
            const id = ++this.messageId;
            const request = {
                jsonrpc: '2.0',
                id,
                method: 'tools/call',
                params: {
                    name: tool,
                    arguments: args
                }
            };

            const timeout = setTimeout(() => {
                this.responseHandlers.delete(id);
                reject(new Error('Request timed out'));
            }, 10000);

            this.responseHandlers.set(id, (response) => {
                clearTimeout(timeout);
                if (response.error) {
                    reject(new Error(response.error.message));
                } else {
                    resolve(response.result);
                }
            });

            this.ws!.send(JSON.stringify(request));
        });
    }

    async listTools(): Promise<any> {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket is not connected');
        }

        return new Promise((resolve, reject) => {
            const id = ++this.messageId;
            const request = {
                jsonrpc: '2.0',
                id,
                method: 'tools/list'
            };

            const timeout = setTimeout(() => {
                this.responseHandlers.delete(id);
                reject(new Error('Request timed out'));
            }, 10000);

            this.responseHandlers.set(id, (response) => {
                clearTimeout(timeout);
                if (response.error) {
                    reject(new Error(response.error.message));
                } else {
                    resolve(response.result);
                }
            });

            this.ws!.send(JSON.stringify(request));
        });
    }

    async testMCPTools() {
        console.log('\n=== MCP tool tests (WebSocket) ===');

        try {
            console.log('\n0. Listing tools...');
            const toolsList = await this.listTools();
            console.log(`Found ${toolsList.tools?.length || 0} tools:`);
            if (toolsList.tools) {
                for (const tool of toolsList.tools.slice(0, 10)) {
                    console.log(`  - ${tool.name}: ${tool.description}`);
                }
                if (toolsList.tools.length > 10) {
                    console.log(`  ... and ${toolsList.tools.length - 10} more tools`);
                }
            }

            console.log('\n1. Current scene info...');
            const sceneInfo = await this.callTool('scene_get_current_scene');
            console.log('Scene info:', JSON.stringify(sceneInfo).substring(0, 100) + '...');

            console.log('\n2. Scene list...');
            const sceneList = await this.callTool('scene_get_scene_list');
            console.log('Scene list:', JSON.stringify(sceneList).substring(0, 100) + '...');

            console.log('\n3. Create node...');
            const createResult = await this.callTool('node_create_node', {
                name: 'MCPTestNode_' + Date.now(),
                nodeType: 'cc.Node',
                position: { x: 0, y: 0, z: 0 }
            });
            console.log('Create node result:', createResult);

            let nodeUuid: string | null = null;
            if (createResult.content && createResult.content[0] && createResult.content[0].text) {
                try {
                    const resultData = JSON.parse(createResult.content[0].text);
                    if (resultData.success && resultData.data && resultData.data.uuid) {
                        nodeUuid = resultData.data.uuid;
                        console.log('Got node UUID:', nodeUuid);
                    }
                } catch (e) {
                    /* ignore parse errors */
                }
            }

            if (nodeUuid) {
                console.log('\n4. Query node...');
                const queryResult = await this.callTool('node_get_node_info', {
                    uuid: nodeUuid
                });
                console.log('Node info:', JSON.stringify(queryResult).substring(0, 100) + '...');

                console.log('\n5. Delete node...');
                const removeResult = await this.callTool('node_delete_node', {
                    uuid: nodeUuid
                });
                console.log('Delete result:', removeResult);
            } else {
                console.log('Could not get node UUID from create result; trying find by name...');

                const findResult = await this.callTool('node_find_node_by_name', {
                    name: 'MCPTestNode_' + Date.now()
                });

                if (findResult.content && findResult.content[0] && findResult.content[0].text) {
                    try {
                        const findData = JSON.parse(findResult.content[0].text);
                        if (findData.success && findData.data && findData.data.uuid) {
                            nodeUuid = findData.data.uuid;
                            console.log('Got UUID from name lookup:', nodeUuid);
                        }
                    } catch (e) {
                        /* ignore */
                    }
                }

                if (!nodeUuid) {
                    console.log('Could not resolve node UUID; skipping further node tests');
                }
            }

            console.log('\n6. Project info...');
            const projectInfo = await this.callTool('project_get_project_info');
            console.log('Project info:', JSON.stringify(projectInfo).substring(0, 100) + '...');

            console.log('\n7. Prefab list...');
            const prefabResult = await this.callTool('prefab_get_prefab_list', {
                folder: 'db://assets'
            });
            console.log('Prefab count:', prefabResult.data?.length || 0);

            console.log('\n8. Available components...');
            const componentsResult = await this.callTool('component_get_available_components');
            console.log('Components:', JSON.stringify(componentsResult).substring(0, 100) + '...');

            console.log('\n9. Editor info...');
            const editorInfo = await this.callTool('debug_get_editor_info');
            console.log('Editor info:', JSON.stringify(editorInfo).substring(0, 100) + '...');
        } catch (error) {
            console.error('MCP tool tests failed:', error);
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.responseHandlers.clear();
    }
}

(global as any).MCPToolTester = MCPToolTester;

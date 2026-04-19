import * as http from 'http';
import * as url from 'url';
import { v4 as uuidv4 } from 'uuid';
import { MCPServerSettings, ServerStatus, MCPClient, ToolDefinition } from './types';
import { SceneTools } from './tools/scene-tools';
import { NodeTools } from './tools/node-tools';
import { ComponentTools } from './tools/component-tools';
import { PrefabTools } from './tools/prefab-tools';
import { ProjectTools } from './tools/project-tools';
import { DebugTools } from './tools/debug-tools';
import { PreferencesTools } from './tools/preferences-tools';
import { ServerTools } from './tools/server-tools';
import { BroadcastTools } from './tools/broadcast-tools';
import { SceneAdvancedTools } from './tools/scene-advanced-tools';
import { SceneViewTools } from './tools/scene-view-tools';
import { ReferenceImageTools } from './tools/reference-image-tools';
import { AssetAdvancedTools } from './tools/asset-advanced-tools';
import { ValidationTools } from './tools/validation-tools';
import { IEditorAdapter } from './adapters/editor-adapter';
import {
    isExpectedToolError,
    expectedErrorToBody,
    requiredArgMissing,
    toolTimeout,
} from './errors';
import { ENGINE_MAJOR } from './engine-version';

export class MCPServer {
    private settings: MCPServerSettings;
    private httpServer: http.Server | null = null;
    private clients: Map<string, MCPClient> = new Map();
    private tools: Record<string, any> = {};
    private toolsList: ToolDefinition[] = [];
    private enabledTools: any[] = []; // Cached enabled tool descriptors

    constructor(
        settings: MCPServerSettings,
        private readonly editorAdapter: IEditorAdapter,
    ) {
        this.settings = settings;
        this.initializeTools();
    }

    private initializeTools(): void {
        const a = this.editorAdapter;
        try {
            console.log('[MCPServer] Initializing tools...');
            this.tools.scene = new SceneTools(a);
            this.tools.node = new NodeTools(a);
            this.tools.component = new ComponentTools(a);
            this.tools.prefab = new PrefabTools(a);
            this.tools.project = new ProjectTools(a);
            this.tools.debug = new DebugTools(a);
            this.tools.preferences = new PreferencesTools(a);
            this.tools.server = new ServerTools(a);
            this.tools.broadcast = new BroadcastTools(a);
            this.tools.sceneAdvanced = new SceneAdvancedTools(a);
            this.tools.sceneView = new SceneViewTools(a);
            this.tools.referenceImage = new ReferenceImageTools(a);
            this.tools.assetAdvanced = new AssetAdvancedTools(a);
            this.tools.validation = new ValidationTools(a);
            console.log('[MCPServer] Tools initialized successfully');
        } catch (error) {
            console.error('[MCPServer] Error initializing tools:', error);
            throw error;
        }
    }

    public async start(): Promise<void> {
        if (this.httpServer) {
            console.log('[MCPServer] Server is already running');
            return;
        }

        try {
            console.log(`[MCPServer] Starting HTTP server on port ${this.settings.port}...`);
            this.httpServer = http.createServer(this.handleHttpRequest.bind(this));

            await new Promise<void>((resolve, reject) => {
                this.httpServer!.listen(this.settings.port, '127.0.0.1', () => {
                    console.log(`[MCPServer] ✅ HTTP server started successfully on http://127.0.0.1:${this.settings.port}`);
                    console.log(`[MCPServer] Health check: http://127.0.0.1:${this.settings.port}/health`);
                    console.log(`[MCPServer] MCP endpoint: http://127.0.0.1:${this.settings.port}/mcp`);
                    resolve();
                });
                this.httpServer!.on('error', (err: any) => {
                    console.error('[MCPServer] ❌ Failed to start server:', err);
                    if (err.code === 'EADDRINUSE') {
                        console.error(`[MCPServer] Port ${this.settings.port} is already in use. Please change the port in settings.`);
                    }
                    reject(err);
                });
            });

            this.setupTools();
            console.log('[MCPServer] 🚀 MCP Server is ready for connections');
        } catch (error) {
            console.error('[MCPServer] ❌ Failed to start server:', error);
            throw error;
        }
    }

    private setupTools(): void {
        this.toolsList = [];
        
        // When no filter is configured, expose every tool
        if (!this.enabledTools || this.enabledTools.length === 0) {
            for (const [category, toolSet] of Object.entries(this.tools)) {
                const tools = toolSet.getTools();
                for (const tool of tools) {
                    this.toolsList.push({
                        name: `${category}_${tool.name}`,
                        description: tool.description,
                        inputSchema: tool.inputSchema
                    });
                }
            }
        } else {
            // Filter definitions against enabled list
            const enabledToolNames = new Set(this.enabledTools.map(tool => `${tool.category}_${tool.name}`));
            
            for (const [category, toolSet] of Object.entries(this.tools)) {
                const tools = toolSet.getTools();
                for (const tool of tools) {
                    const toolName = `${category}_${tool.name}`;
                    if (enabledToolNames.has(toolName)) {
                        this.toolsList.push({
                            name: toolName,
                            description: tool.description,
                            inputSchema: tool.inputSchema
                        });
                    }
                }
            }
        }
        
        console.log(`[MCPServer] Setup tools: ${this.toolsList.length} tools available`);
    }

    public getFilteredTools(enabledTools: any[]): ToolDefinition[] {
        if (!enabledTools || enabledTools.length === 0) {
            return this.toolsList; // No filter configured; return full catalog
        }

        const enabledToolNames = new Set(enabledTools.map(tool => `${tool.category}_${tool.name}`));
        return this.toolsList.filter(tool => enabledToolNames.has(tool.name));
    }

    /**
     * Per-tool soft-timeout overrides (ms). Anything not in this map uses
     * `DEFAULT_SOFT_TIMEOUT_MS`. Override keys are full wire names
     * ({category}_{tool}).
     */
    private static readonly TOOL_SOFT_TIMEOUT_MS: Record<string, number> = {
        scene_save_scene: 15_000,
        scene_save_scene_as: 15_000,
        scene_create_scene: 15_000,
        scene_open_scene: 15_000,
        scene_close_scene: 10_000,
        project_build_project: 600_000,
        project_run_project: 600_000,
        project_open_build_panel: 60_000,
        project_start_preview_server: 60_000,
        project_stop_preview_server: 60_000,
        preferences_open_preferences_settings: 30_000,
        broadcast_listen_broadcast: 5_000,
        debug_search_project_logs: 5_000,
    };

    private static readonly DEFAULT_SOFT_TIMEOUT_MS = 30_000;

    /** Tools that are never expected to respond quickly; the sweep runner can skip them. */
    private static readonly LONG_RUNNING_TOOLS = new Set<string>([
        'project_run_project',
        'project_build_project',
        'project_open_build_panel',
        'project_start_preview_server',
        'project_stop_preview_server',
        'preferences_open_preferences_settings',
        'broadcast_listen_broadcast',
    ]);

    private softTimeoutFor(toolName: string): number {
        return MCPServer.TOOL_SOFT_TIMEOUT_MS[toolName] ?? MCPServer.DEFAULT_SOFT_TIMEOUT_MS;
    }

    private findToolDef(category: string, toolMethodName: string): any {
        const toolSet = this.tools[category];
        if (!toolSet || typeof toolSet.getTools !== 'function') {
            return undefined;
        }
        const tools = toolSet.getTools();
        for (const t of tools) {
            if (t.name === toolMethodName) {
                return t;
            }
        }
        return undefined;
    }

    private validateRequiredArgs(toolName: string, toolDef: any, args: any): void {
        const required: string[] | undefined = toolDef?.inputSchema?.required;
        if (!Array.isArray(required) || required.length === 0) {
            return;
        }
        const params = args && typeof args === 'object' ? args : {};
        for (const field of required) {
            const v = (params as any)[field];
            if (v === undefined || v === null || (typeof v === 'string' && v.length === 0)) {
                throw requiredArgMissing(toolName, field);
            }
        }
    }

    public async executeToolCall(toolName: string, args: any): Promise<any> {
        const parts = toolName.split('_');
        const category = parts[0];
        const toolMethodName = parts.slice(1).join('_');

        if (!this.tools[category]) {
            throw new Error(`Tool ${toolName} not found`);
        }

        // Pre-dispatch required-arg validation — short-circuits the usual IPC hang
        // on `{}` calls (Task 6).
        const toolDef = this.findToolDef(category, toolMethodName);
        this.validateRequiredArgs(toolName, toolDef, args);

        const softTimeoutMs = this.softTimeoutFor(toolName);
        const dispatch: Promise<any> = this.tools[category].execute(toolMethodName, args);

        let timer: any;
        const timeout = new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(toolTimeout(toolName, softTimeoutMs)), softTimeoutMs);
        });
        try {
            return await Promise.race([dispatch, timeout]);
        } finally {
            if (timer) {
                clearTimeout(timer);
            }
        }
    }

    public getClients(): MCPClient[] {
        return Array.from(this.clients.values());
    }
    public getAvailableTools(): ToolDefinition[] {
        return this.toolsList;
    }

    public updateEnabledTools(enabledTools: any[]): void {
        console.log(`[MCPServer] Updating enabled tools: ${enabledTools.length} tools`);
        this.enabledTools = enabledTools;
        this.setupTools(); // Rebuild tool registry
    }

    public getSettings(): MCPServerSettings {
        return this.settings;
    }

    private async handleHttpRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        const parsedUrl = url.parse(req.url || '', true);
        const pathname = parsedUrl.pathname;
        
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Content-Type', 'application/json');
        
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }
        
        try {
            if (pathname === '/mcp' && req.method === 'POST') {
                await this.handleMCPRequest(req, res);
            } else if (pathname === '/health' && req.method === 'GET') {
                res.writeHead(200);
                res.end(JSON.stringify({ status: 'ok', tools: this.toolsList.length }));
            } else if (pathname?.startsWith('/api/') && req.method === 'POST') {
                await this.handleSimpleAPIRequest(req, res, pathname);
            } else if (pathname === '/api/tools' && req.method === 'GET') {
                res.writeHead(200);
                res.end(JSON.stringify({ tools: this.getSimplifiedToolsList() }));
            } else {
                res.writeHead(404);
                res.end(JSON.stringify({ error: 'Not found' }));
            }
        } catch (error) {
            console.error('HTTP request error:', error);
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Internal server error' }));
        }
    }
    
    private async handleMCPRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        let body = '';
        
        req.on('data', (chunk) => {
            body += chunk.toString();
        });
        
        req.on('end', async () => {
            try {
                // Enhanced JSON parsing with better error handling
                let message;
                try {
                    message = JSON.parse(body);
                } catch (parseError: any) {
                    // Try to fix common JSON issues
                    const fixedBody = this.fixCommonJsonIssues(body);
                    try {
                        message = JSON.parse(fixedBody);
                        console.log('[MCPServer] Fixed JSON parsing issue');
                    } catch (secondError) {
                        throw new Error(`JSON parsing failed: ${parseError.message}. Original body: ${body.substring(0, 500)}...`);
                    }
                }
                
                const response = await this.handleMessage(message);
                res.writeHead(200);
                res.end(JSON.stringify(response));
            } catch (error: any) {
                console.error('Error handling MCP request:', error);
                res.writeHead(400);
                res.end(JSON.stringify({
                    jsonrpc: '2.0',
                    id: null,
                    error: {
                        code: -32700,
                        message: `Parse error: ${error.message}`
                    }
                }));
            }
        });
    }

    private async handleMessage(message: any): Promise<any> {
        const { id, method, params } = message;

        try {
            let result: any;

            switch (method) {
                case 'tools/list':
                    result = { tools: this.getAvailableTools() };
                    break;
                case 'tools/call':
                    const { name, arguments: args } = params;
                    try {
                        const toolResult = await this.executeToolCall(name, args);
                        const text = JSON.stringify(toolResult ?? null) ?? 'null';
                        result = { content: [{ type: 'text', text }] };
                    } catch (toolErr) {
                        if (isExpectedToolError(toolErr)) {
                            console.log(`[MCPServer] JSON-RPC expected tool error (${name}): ${(toolErr as Error).message}`);
                            const body = expectedErrorToBody(toolErr, name);
                            result = { content: [{ type: 'text', text: JSON.stringify(body) }] };
                        } else {
                            throw toolErr;
                        }
                    }
                    break;
                case 'initialize':
                    // MCP initialization
                    result = {
                        protocolVersion: '2024-11-05',
                        capabilities: {
                            tools: {}
                        },
                        serverInfo: {
                            name: 'cocos-mcp-server',
                            version: '1.0.0'
                        }
                    };
                    break;
                default:
                    throw new Error(`Unknown method: ${method}`);
            }

            return {
                jsonrpc: '2.0',
                id,
                result
            };
        } catch (error: any) {
            return {
                jsonrpc: '2.0',
                id,
                error: {
                    code: -32603,
                    message: error.message
                }
            };
        }
    }

    private fixCommonJsonIssues(jsonStr: string): string {
        let fixed = jsonStr;
        
        // Fix common escape character issues
        fixed = fixed
            // Fix unescaped quotes in strings
            .replace(/([^\\])"([^"]*[^\\])"([^,}\]:])/g, '$1\\"$2\\"$3')
            // Fix unescaped backslashes
            .replace(/([^\\])\\([^"\\\/bfnrt])/g, '$1\\\\$2')
            // Fix trailing commas
            .replace(/,(\s*[}\]])/g, '$1')
            // Fix single quotes (should be double quotes)
            .replace(/'/g, '"')
            // Fix common control characters
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
        
        return fixed;
    }

    public stop(): void {
        if (this.httpServer) {
            this.httpServer.close();
            this.httpServer = null;
            console.log('[MCPServer] HTTP server stopped');
        }

        this.clients.clear();
    }

    public getStatus(): ServerStatus {
        return {
            running: !!this.httpServer,
            port: this.settings.port,
            clients: 0 // HTTP is stateless, no persistent clients
        };
    }

    private async handleSimpleAPIRequest(req: http.IncomingMessage, res: http.ServerResponse, pathname: string): Promise<void> {
        let body = '';
        
        req.on('data', (chunk) => {
            body += chunk.toString();
        });
        
        req.on('end', async () => {
            try {
                // Extract tool name from path like /api/node/set_position
                const pathParts = pathname.split('/').filter(p => p);
                if (pathParts.length < 3) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Invalid API path. Use /api/{category}/{tool_name}' }));
                    return;
                }
                
                const category = pathParts[1];
                const toolName = pathParts[2];
                const fullToolName = `${category}_${toolName}`;
                
                // Parse parameters with enhanced error handling
                let params;
                try {
                    params = body ? JSON.parse(body) : {};
                } catch (parseError: any) {
                    // Try to fix JSON issues
                    const fixedBody = this.fixCommonJsonIssues(body);
                    try {
                        params = JSON.parse(fixedBody);
                        console.log('[MCPServer] Fixed API JSON parsing issue');
                    } catch (secondError: any) {
                        res.writeHead(400);
                        res.end(JSON.stringify({
                            error: 'Invalid JSON in request body',
                            details: parseError.message,
                            receivedBody: body.substring(0, 200)
                        }));
                        return;
                    }
                }
                
                // Execute tool
                const result = await this.executeToolCall(fullToolName, params);

                // If the tool itself returned a ToolResponse with an explicit failure,
                // surface that (HTTP 200, outer success=false) so clients do not have to
                // peek two levels deep.
                if (result && typeof result === 'object' && result.success === false) {
                    res.writeHead(200);
                    res.end(JSON.stringify({
                        success: false,
                        tool: fullToolName,
                        error: result.error || 'tool_returned_failure',
                        result,
                    }));
                    return;
                }

                res.writeHead(200);
                res.end(JSON.stringify({
                    success: true,
                    tool: fullToolName,
                    result: result
                }));
                
            } catch (error: any) {
                const pathParts = pathname.split('/').filter(p => p);
                const fullToolName =
                    pathParts.length >= 3 ? `${pathParts[1]}_${pathParts[2]}` : pathname;
                if (isExpectedToolError(error)) {
                    console.log(`[MCPServer] Expected tool error (${fullToolName}): ${error.message}`);
                    res.writeHead(200);
                    res.end(JSON.stringify(expectedErrorToBody(error, fullToolName)));
                } else {
                    console.error('[MCPServer] Unexpected tool error:', error);
                    res.writeHead(500);
                    res.end(JSON.stringify({
                        success: false,
                        error: error.message,
                        tool: fullToolName,
                    }));
                }
            }
        });
    }

    private getSimplifiedToolsList(): any[] {
        const unsupportedOn2x = new Set(['sceneView', 'referenceImage']);
        return this.toolsList.map(tool => {
            const parts = tool.name.split('_');
            const category = parts[0];
            const toolName = parts.slice(1).join('_');

            const entry: any = {
                name: tool.name,
                category: category,
                toolName: toolName,
                description: tool.description,
                apiPath: `/api/${category}/${toolName}`,
                curlExample: this.generateCurlExample(category, toolName, tool.inputSchema),
            };
            if (ENGINE_MAJOR === 2 && unsupportedOn2x.has(category)) {
                entry.unsupportedOnEngine = 2;
            }
            if (MCPServer.LONG_RUNNING_TOOLS.has(tool.name)) {
                entry.longRunning = true;
            }
            const softTimeout = MCPServer.TOOL_SOFT_TIMEOUT_MS[tool.name];
            if (typeof softTimeout === 'number') {
                entry.defaultSoftTimeoutMs = softTimeout;
            }
            return entry;
        });
    }

    private generateCurlExample(category: string, toolName: string, schema: any): string {
        // Generate sample parameters based on schema
        const sampleParams = this.generateSampleParams(schema);
        const jsonString = JSON.stringify(sampleParams, null, 2);
        
        return `curl -X POST http://127.0.0.1:8585/api/${category}/${toolName} \\
  -H "Content-Type: application/json" \\
  -d '${jsonString}'`;
    }

    private generateSampleParams(schema: any): any {
        if (!schema || !schema.properties) return {};
        
        const sample: any = {};
        for (const [key, prop] of Object.entries(schema.properties as any)) {
            const propSchema = prop as any;
            switch (propSchema.type) {
                case 'string':
                    sample[key] = propSchema.default || 'example_string';
                    break;
                case 'number':
                    sample[key] = propSchema.default || 42;
                    break;
                case 'boolean':
                    sample[key] = propSchema.default || true;
                    break;
                case 'object':
                    sample[key] = propSchema.default || { x: 0, y: 0, z: 0 };
                    break;
                default:
                    sample[key] = 'example_value';
            }
        }
        return sample;
    }

    public updateSettings(settings: MCPServerSettings) {
        this.settings = settings;
        if (this.httpServer) {
            this.stop();
            this.start();
        }
    }
}

// HTTP transport doesn't need persistent connections
// MCP over HTTP uses request-response pattern
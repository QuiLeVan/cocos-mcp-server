import { MCPServer } from './mcp-server';
import { readSettings, saveSettings } from './settings';
import { MCPServerSettings } from './types';
import { ToolManager } from './tools/tool-manager';
import { IEditorAdapter } from './adapters/editor-adapter';
import { EditorAdapter3x } from './adapters/editor-adapter-3x';
import { detectEngineMajor } from './engine-version';

let mcpServer: MCPServer | null = null;
let toolManager: ToolManager;
let editorAdapter: IEditorAdapter;

function createEditorAdapter(): IEditorAdapter {
    if (detectEngineMajor() === 2) {
        // Emitted only in the 2.x build (`dist-2x/`). The 3.x bundle never executes this branch.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require('./adapters/editor-adapter-2x');
        return new mod.EditorAdapter2x() as IEditorAdapter;
    }
    return new EditorAdapter3x();
}

/**
 * @en Registration method for the main process of Extension
 * @zh Registration method for the extension main process
 */
export const methods: { [key: string]: (...any: any) => any } = {
    /**
     * @en Open the MCP server panel
     * @zh Open the MCP server panel
     */
    openPanel() {
        Editor.Panel.open('cocos-mcp-server');
    },



    /**
     * @en Start the MCP server
     * @zh Start the MCP server
     */
    async startServer() {
        if (mcpServer) {
            // Ensure MCP server uses latest enabled tool list
            const enabledTools = toolManager.getEnabledTools();
            mcpServer.updateEnabledTools(enabledTools);
            await mcpServer.start();
        } else {
            console.warn('[MCP] mcpServer is not initialized');
        }
    },

    /**
     * @en Stop the MCP server
     * @zh Stop the MCP server
     */
    async stopServer() {
        if (mcpServer) {
            mcpServer.stop();
        } else {
            console.warn('[MCP] mcpServer is not initialized');
        }
    },

    /**
     * @en Get server status
     * @zh Get server status
     */
    getServerStatus() {
        const status = mcpServer ? mcpServer.getStatus() : { running: false, port: 0, clients: 0 };
        const settings = mcpServer ? mcpServer.getSettings() : readSettings();
        return {
            ...status,
            settings: settings
        };
    },

    /**
     * @en Update server settings
     * @zh Update server settings
     */
    updateSettings(settings: MCPServerSettings) {
        saveSettings(settings);
        if (mcpServer) {
            mcpServer.stop();
            mcpServer = new MCPServer(settings, editorAdapter);
            mcpServer.start();
        } else {
            mcpServer = new MCPServer(settings, editorAdapter);
            mcpServer.start();
        }
    },

    /**
     * @en Get tools list
     * @zh Get tools list
     */
    getToolsList() {
        return mcpServer ? mcpServer.getAvailableTools() : [];
    },

    getFilteredToolsList() {
        if (!mcpServer) return [];
        
        // Get currently enabled tools
        const enabledTools = toolManager.getEnabledTools();
        
        // Push enabled tools to MCP server
        mcpServer.updateEnabledTools(enabledTools);
        
        return mcpServer.getFilteredTools(enabledTools);
    },
    /**
     * @en Get server settings
     * @zh Get server settings
     */
    async getServerSettings() {
        return mcpServer ? mcpServer.getSettings() : readSettings();
    },

    /**
     * @en Get server settings (alternative method)
     * @zh Get server settings (alias)
     */
    async getSettings() {
        return mcpServer ? mcpServer.getSettings() : readSettings();
    },

    // Tool manager API
    async getToolManagerState() {
        return toolManager.getToolManagerState();
    },

    async createToolConfiguration(name: string, description?: string) {
        try {
            const config = toolManager.createConfiguration(name, description);
            return { success: true, id: config.id, config };
        } catch (error: any) {
            throw new Error(`Failed to create configuration: ${error.message}`);
        }
    },

    async updateToolConfiguration(configId: string, updates: any) {
        try {
            return toolManager.updateConfiguration(configId, updates);
        } catch (error: any) {
            throw new Error(`Failed to update configuration: ${error.message}`);
        }
    },

    async deleteToolConfiguration(configId: string) {
        try {
            toolManager.deleteConfiguration(configId);
            return { success: true };
        } catch (error: any) {
            throw new Error(`Failed to delete configuration: ${error.message}`);
        }
    },

    async setCurrentToolConfiguration(configId: string) {
        try {
            toolManager.setCurrentConfiguration(configId);
            return { success: true };
        } catch (error: any) {
            throw new Error(`Failed to set current configuration: ${error.message}`);
        }
    },

    async updateToolStatus(category: string, toolName: string, enabled: boolean) {
        try {
            const currentConfig = toolManager.getCurrentConfiguration();
            if (!currentConfig) {
                throw new Error('No active configuration');
            }
            
            toolManager.updateToolStatus(currentConfig.id, category, toolName, enabled);
            
            // Sync enabled tools to MCP server
            if (mcpServer) {
                const enabledTools = toolManager.getEnabledTools();
                mcpServer.updateEnabledTools(enabledTools);
            }
            
            return { success: true };
        } catch (error: any) {
            throw new Error(`Failed to update tool status: ${error.message}`);
        }
    },

    async updateToolStatusBatch(updates: any[]) {
        try {
            console.log(`[Main] updateToolStatusBatch called with updates count:`, updates ? updates.length : 0);
            
            const currentConfig = toolManager.getCurrentConfiguration();
            if (!currentConfig) {
                throw new Error('No active configuration');
            }
            
            toolManager.updateToolStatusBatch(currentConfig.id, updates);
            
            // Sync enabled tools to MCP server
            if (mcpServer) {
                const enabledTools = toolManager.getEnabledTools();
                mcpServer.updateEnabledTools(enabledTools);
            }
            
            return { success: true };
        } catch (error: any) {
            throw new Error(`Failed to batch-update tool status: ${error.message}`);
        }
    },

    async exportToolConfiguration(configId: string) {
        try {
            return { configJson: toolManager.exportConfiguration(configId) };
        } catch (error: any) {
            throw new Error(`Failed to export configuration: ${error.message}`);
        }
    },

    async importToolConfiguration(configJson: string) {
        try {
            return toolManager.importConfiguration(configJson);
        } catch (error: any) {
            throw new Error(`Failed to import configuration: ${error.message}`);
        }
    },

    async getEnabledTools() {
        return toolManager.getEnabledTools();
    }
};

/**
 * @en Method Triggered on Extension Startup
 * @zh Invoked when the extension loads
 */
export function load() {
    console.log('Cocos MCP Server extension loaded');

    editorAdapter = createEditorAdapter();

    // Initialize tool manager
    toolManager = new ToolManager(editorAdapter);

    // Load persisted settings
    const settings = readSettings();
    mcpServer = new MCPServer(settings, editorAdapter);
    
    // Seed MCP server with enabled tools
    const enabledTools = toolManager.getEnabledTools();
    mcpServer.updateEnabledTools(enabledTools);
    
    // Auto-start HTTP server when configured
    if (settings.autoStart) {
        mcpServer.start().catch(err => {
            console.error('Failed to auto-start MCP server:', err);
        });
    }
}

/**
 * @en Method triggered when uninstalling the extension
 * @zh Invoked when the extension unloads
 */
export function unload() {
    if (mcpServer) {
        mcpServer.stop();
        mcpServer = null;
    }
}
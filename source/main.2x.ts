import { MCPServer } from './mcp-server';
import { readSettings, saveSettings } from './settings';
import { MCPServerSettings } from './types';
import { ToolManager } from './tools/tool-manager';
import { EditorAdapter2x } from './adapters/editor-adapter-2x';
import { detectEngineMajor } from './engine-version';

const PKG = 'cocos-mcp-server';

let mcpServer: MCPServer | null = null;
let toolManager: ToolManager | null = null;
let editorAdapter: EditorAdapter2x | null = null;

function serverStatusPayload() {
    const status = mcpServer ? mcpServer.getStatus() : { running: false, port: 0, clients: 0 };
    const settings = mcpServer ? mcpServer.getSettings() : readSettings();
    return {
        running: status.running,
        port: status.port,
        connections: status.clients,
        settings,
    };
}

function notifyServerStatusChanged(): void {
    const payload = serverStatusPayload();
    try {
        Editor.Ipc.sendToWins(`${PKG}:server-status-changed`, payload);
    } catch (e) {
        console.warn('[MCP 2.x] sendToWins server-status-changed failed:', e);
    }
}

function reply(event: any, err: Error | null, result?: unknown): void {
    if (typeof event?.reply === 'function') {
        event.reply(err, result);
    }
}

async function handleStartServer(event: any): Promise<void> {
    try {
        if (!mcpServer || !toolManager) {
            reply(event, new Error('MCP server not initialized'));
            return;
        }
        const enabledTools = toolManager.getEnabledTools();
        mcpServer.updateEnabledTools(enabledTools);
        await mcpServer.start();
        notifyServerStatusChanged();
        reply(event, null, { success: true });
    } catch (e: any) {
        reply(event, e instanceof Error ? e : new Error(String(e)));
    }
}

function handleStopServer(event: any): void {
    try {
        if (mcpServer) {
            mcpServer.stop();
        }
        notifyServerStatusChanged();
        reply(event, null, { success: true });
    } catch (e: any) {
        reply(event, e instanceof Error ? e : new Error(String(e)));
    }
}

function handleGetServerStatus(event: any): void {
    try {
        reply(event, null, serverStatusPayload());
    } catch (e: any) {
        reply(event, e instanceof Error ? e : new Error(String(e)));
    }
}

function handleUpdateSettings(event: any, settings: MCPServerSettings): void {
    try {
        saveSettings(settings);
        if (!editorAdapter) {
            reply(event, new Error('Editor adapter not initialized'));
            return;
        }
        const wasRunning = !!(mcpServer && mcpServer.getStatus().running);
        if (mcpServer) {
            mcpServer.stop();
        }
        mcpServer = new MCPServer(settings, editorAdapter);
        if (toolManager) {
            mcpServer.updateEnabledTools(toolManager.getEnabledTools());
        }
        if (wasRunning) {
            mcpServer
                .start()
                .then(() => notifyServerStatusChanged())
                .catch((err) => console.error('[MCP 2.x] restart after settings failed:', err));
        }
        notifyServerStatusChanged();
        reply(event, null, { success: true });
    } catch (e: any) {
        reply(event, e instanceof Error ? e : new Error(String(e)));
    }
}

function handleGetToolsList(event: any): void {
    try {
        const list = mcpServer ? mcpServer.getAvailableTools() : [];
        reply(event, null, list);
    } catch (e: any) {
        reply(event, e instanceof Error ? e : new Error(String(e)));
    }
}

function handleGetToolManagerState(event: any): void {
    try {
        if (!toolManager) {
            reply(event, new Error('Tool manager not initialized'));
            return;
        }
        reply(event, null, toolManager.getToolManagerState());
    } catch (e: any) {
        reply(event, e instanceof Error ? e : new Error(String(e)));
    }
}

function handleUpdateToolStatus(event: any, category: string, toolName: string, enabled: boolean): void {
    try {
        if (!toolManager || !mcpServer) {
            reply(event, new Error('Not initialized'));
            return;
        }
        const currentConfig = toolManager.getCurrentConfiguration();
        if (!currentConfig) {
            reply(event, new Error('No active configuration'));
            return;
        }
        toolManager.updateToolStatus(currentConfig.id, category, toolName, enabled);
        mcpServer.updateEnabledTools(toolManager.getEnabledTools());
        reply(event, null, { success: true });
    } catch (e: any) {
        reply(event, e instanceof Error ? e : new Error(String(e)));
    }
}

function handleToggleTool(
    event: any,
    category: string,
    toolName: string,
    enabled?: boolean,
): void {
    try {
        if (!toolManager || !mcpServer) {
            reply(event, new Error('Not initialized'));
            return;
        }
        const currentConfig = toolManager.getCurrentConfiguration();
        if (!currentConfig) {
            reply(event, new Error('No active configuration'));
            return;
        }
        const tools = currentConfig.tools;
        const row = tools.find((t) => t.category === category && t.name === toolName);
        const next = typeof enabled === 'boolean' ? enabled : !(row?.enabled !== false);
        toolManager.updateToolStatus(currentConfig.id, category, toolName, next);
        mcpServer.updateEnabledTools(toolManager.getEnabledTools());
        reply(event, null, { success: true, enabled: next });
    } catch (e: any) {
        reply(event, e instanceof Error ? e : new Error(String(e)));
    }
}

function handleExportToolConfiguration(event: any, configId: string): void {
    try {
        if (!toolManager) {
            reply(event, new Error('Tool manager not initialized'));
            return;
        }
        reply(event, null, { configJson: toolManager.exportConfiguration(configId) });
    } catch (e: any) {
        reply(event, e instanceof Error ? e : new Error(String(e)));
    }
}

function handleImportToolConfiguration(event: any, configJson: string): void {
    try {
        if (!toolManager || !mcpServer) {
            reply(event, new Error('Not initialized'));
            return;
        }
        const res = toolManager.importConfiguration(configJson);
        mcpServer.updateEnabledTools(toolManager.getEnabledTools());
        reply(event, null, res);
    } catch (e: any) {
        reply(event, e instanceof Error ? e : new Error(String(e)));
    }
}

function load(): void {
    if (detectEngineMajor() !== 2) {
        console.error('[MCP] main.2x loaded but detectEngineMajor() !== 2 — check manifest / install-manifest.');
    }
    console.log('[MCP] Cocos MCP Server extension loaded (Creator 2.x main)');

    editorAdapter = new EditorAdapter2x();
    toolManager = new ToolManager(editorAdapter);

    const settings = readSettings();
    mcpServer = new MCPServer(settings, editorAdapter);
    mcpServer.updateEnabledTools(toolManager.getEnabledTools());

    if (settings.autoStart) {
        mcpServer
            .start()
            .then(() => notifyServerStatusChanged())
            .catch((err) => console.error('[MCP 2.x] auto-start failed:', err));
    }
}

function unload(): void {
    if (mcpServer) {
        mcpServer.stop();
        mcpServer = null;
    }
    toolManager = null;
    editorAdapter = null;
}

const messages: Record<string, (event: any, ...args: any[]) => void> = {
    'open-panel'(event) {
        try {
            Editor.Panel.open(PKG);
            reply(event, null, true);
        } catch (e: any) {
            reply(event, e instanceof Error ? e : new Error(String(e)));
        }
    },

    'start-server'(event) {
        void handleStartServer(event);
    },

    'stop-server'(event) {
        handleStopServer(event);
    },

    'get-server-status'(event) {
        handleGetServerStatus(event);
    },

    'update-settings'(event, settings: MCPServerSettings) {
        handleUpdateSettings(event, settings);
    },

    'getToolsList'(event) {
        handleGetToolsList(event);
    },

    'getToolManagerState'(event) {
        handleGetToolManagerState(event);
    },

    'toggleTool'(event, category: string, toolName: string, enabled?: boolean) {
        handleToggleTool(event, category, toolName, enabled);
    },

    'updateToolStatus'(event, category: string, toolName: string, enabled: boolean) {
        handleUpdateToolStatus(event, category, toolName, enabled);
    },

    'exportToolConfiguration'(event, configId: string) {
        handleExportToolConfiguration(event, configId);
    },

    'importToolConfiguration'(event, configJson: string) {
        handleImportToolConfiguration(event, configJson);
    },
};

export = { load, unload, messages };

import { v4 as uuidv4 } from 'uuid';
import { ToolConfig, ToolConfiguration, ToolManagerSettings, ToolDefinition } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import { IEditorAdapter } from '../adapters/editor-adapter';

export class ToolManager {
    private settings: ToolManagerSettings;
    private availableTools: ToolConfig[] = [];

    constructor(private readonly adapter: IEditorAdapter) {
        this.settings = this.readToolManagerSettings();
        this.initializeAvailableTools();
        
        // Create a default configuration when none exist
        if (this.settings.configurations.length === 0) {
            console.log('[ToolManager] No configurations found, creating default configuration...');
            this.createConfiguration('Default', 'Auto-created default tool configuration');
        }
    }

    private getToolManagerSettingsPath(): string {
        return path.join(this.adapter.projectPath, 'settings', 'tool-manager.json');
    }

    private ensureSettingsDir(): void {
        const settingsDir = path.dirname(this.getToolManagerSettingsPath());
        if (!fs.existsSync(settingsDir)) {
            fs.mkdirSync(settingsDir, { recursive: true });
        }
    }

    private readToolManagerSettings(): ToolManagerSettings {
        const DEFAULT_TOOL_MANAGER_SETTINGS: ToolManagerSettings = {
            configurations: [],
            currentConfigId: '',
            maxConfigSlots: 5
        };

        try {
            this.ensureSettingsDir();
            const settingsFile = this.getToolManagerSettingsPath();
            if (fs.existsSync(settingsFile)) {
                const content = fs.readFileSync(settingsFile, 'utf8');
                return { ...DEFAULT_TOOL_MANAGER_SETTINGS, ...JSON.parse(content) };
            }
        } catch (e) {
            console.error('Failed to read tool manager settings:', e);
        }
        return DEFAULT_TOOL_MANAGER_SETTINGS;
    }

    private saveToolManagerSettings(settings: ToolManagerSettings): void {
        try {
            this.ensureSettingsDir();
            const settingsFile = this.getToolManagerSettingsPath();
            fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
        } catch (e) {
            console.error('Failed to save tool manager settings:', e);
            throw e;
        }
    }

    private exportToolConfiguration(config: ToolConfiguration): string {
        return JSON.stringify(config, null, 2);
    }

    private importToolConfiguration(configJson: string): ToolConfiguration {
        try {
            const config = JSON.parse(configJson);
            // Validate configuration shape
            if (!config.id || !config.name || !Array.isArray(config.tools)) {
                throw new Error('Invalid configuration format');
            }
            return config;
        } catch (e) {
            console.error('Failed to parse tool configuration:', e);
            throw new Error('Invalid JSON format or configuration structure');
        }
    }

    private initializeAvailableTools(): void {
        // Discover tools from registered tool classes
        try {
            // Dynamically require tool implementations
            const { SceneTools } = require('./scene-tools');
            const { NodeTools } = require('./node-tools');
            const { ComponentTools } = require('./component-tools');
            const { PrefabTools } = require('./prefab-tools');
            const { ProjectTools } = require('./project-tools');
            const { DebugTools } = require('./debug-tools');
            const { PreferencesTools } = require('./preferences-tools');
            const { ServerTools } = require('./server-tools');
            const { BroadcastTools } = require('./broadcast-tools');
            const { SceneAdvancedTools } = require('./scene-advanced-tools');
            const { SceneViewTools } = require('./scene-view-tools');
            const { ReferenceImageTools } = require('./reference-image-tools');
            const { AssetAdvancedTools } = require('./asset-advanced-tools');
            const { ValidationTools } = require('./validation-tools');

            const a = this.adapter;
            // Instantiate tool classes
            const tools = {
                scene: new SceneTools(a),
                node: new NodeTools(a),
                component: new ComponentTools(a),
                prefab: new PrefabTools(a),
                project: new ProjectTools(a),
                debug: new DebugTools(a),
                preferences: new PreferencesTools(a),
                server: new ServerTools(a),
                broadcast: new BroadcastTools(a),
                sceneAdvanced: new SceneAdvancedTools(a),
                sceneView: new SceneViewTools(a),
                referenceImage: new ReferenceImageTools(a),
                assetAdvanced: new AssetAdvancedTools(a),
                validation: new ValidationTools(a)
            };

            // Collect ToolDefinitions from each class
            this.availableTools = [];
            for (const [category, toolSet] of Object.entries(tools)) {
                const toolDefinitions = toolSet.getTools();
                toolDefinitions.forEach((tool: any) => {
                    this.availableTools.push({
                        category: category,
                        name: tool.name,
                        enabled: true, // enabled by default
                        description: tool.description
                    });
                });
            }

            console.log(`[ToolManager] Initialized ${this.availableTools.length} tools from MCP server`);
        } catch (error) {
            console.error('[ToolManager] Failed to initialize tools from MCP server:', error);
            // Fall back to static catalog when discovery fails
            this.initializeDefaultTools();
        }
    }

    private initializeDefaultTools(): void {
        // Static fallback catalog when live discovery fails
        const toolCategories = [
            { category: 'scene', name: 'Scene tools', tools: [
                { name: 'getCurrentSceneInfo', description: 'Get current scene information' },
                { name: 'getSceneHierarchy', description: 'Get scene hierarchy' },
                { name: 'createNewScene', description: 'Create a new scene' },
                { name: 'saveScene', description: 'Save the active scene' },
                { name: 'loadScene', description: 'Load a scene asset' }
            ]},
            { category: 'node', name: 'Node tools', tools: [
                { name: 'getAllNodes', description: 'List all nodes' },
                { name: 'findNodeByName', description: 'Find node by name' },
                { name: 'createNode', description: 'Create a node' },
                { name: 'deleteNode', description: 'Delete a node' },
                { name: 'setNodeProperty', description: 'Set node property' },
                { name: 'getNodeInfo', description: 'Get node information' }
            ]},
            { category: 'component', name: 'Component tools', tools: [
                { name: 'addComponentToNode', description: 'Add component to node' },
                { name: 'removeComponentFromNode', description: 'Remove component from node' },
                { name: 'setComponentProperty', description: 'Set component property' },
                { name: 'getComponentInfo', description: 'Get component information' }
            ]},
            { category: 'prefab', name: 'Prefab tools', tools: [
                { name: 'createPrefabFromNode', description: 'Create prefab from node' },
                { name: 'instantiatePrefab', description: 'Instantiate prefab' },
                { name: 'getPrefabInfo', description: 'Get prefab information' },
                { name: 'savePrefab', description: 'Save prefab asset' }
            ]},
            { category: 'project', name: 'Project tools', tools: [
                { name: 'getProjectInfo', description: 'Get project information' },
                { name: 'getAssetList', description: 'List assets' },
                { name: 'createAsset', description: 'Create asset' },
                { name: 'deleteAsset', description: 'Delete asset' }
            ]},
            { category: 'debug', name: 'Debug tools', tools: [
                { name: 'getConsoleLogs', description: 'Get console logs' },
                { name: 'getPerformanceStats', description: 'Get performance statistics' },
                { name: 'validateScene', description: 'Validate scene' },
                { name: 'getErrorLogs', description: 'Get error logs' }
            ]},
            { category: 'preferences', name: 'Preferences tools', tools: [
                { name: 'getPreferences', description: 'Get editor preferences' },
                { name: 'setPreferences', description: 'Set editor preferences' },
                { name: 'resetPreferences', description: 'Reset preferences' }
            ]},
            { category: 'server', name: 'Server tools', tools: [
                { name: 'getServerStatus', description: 'Get MCP server status' },
                { name: 'getConnectedClients', description: 'List connected clients' },
                { name: 'getServerLogs', description: 'Get server logs' }
            ]},
            { category: 'broadcast', name: 'Broadcast tools', tools: [
                { name: 'broadcastMessage', description: 'Broadcast editor message' },
                { name: 'getBroadcastHistory', description: 'Get broadcast history' }
            ]},
            { category: 'sceneAdvanced', name: 'Advanced scene tools', tools: [
                { name: 'optimizeScene', description: 'Optimize scene' },
                { name: 'analyzeScene', description: 'Analyze scene' },
                { name: 'batchOperation', description: 'Batch operations' }
            ]},
            { category: 'sceneView', name: 'Scene view tools', tools: [
                { name: 'getViewportInfo', description: 'Get viewport information' },
                { name: 'setViewportCamera', description: 'Set viewport camera' },
                { name: 'focusOnNode', description: 'Focus scene view on node' }
            ]},
            { category: 'referenceImage', name: 'Reference image tools', tools: [
                { name: 'addReferenceImage', description: 'Add reference image' },
                { name: 'removeReferenceImage', description: 'Remove reference image' },
                { name: 'getReferenceImages', description: 'List reference images' }
            ]},
            { category: 'assetAdvanced', name: 'Advanced asset tools', tools: [
                { name: 'importAsset', description: 'Import asset' },
                { name: 'exportAsset', description: 'Export asset' },
                { name: 'processAsset', description: 'Process asset' }
            ]},
            { category: 'validation', name: 'Validation tools', tools: [
                { name: 'validateProject', description: 'Validate project' },
                { name: 'validateAssets', description: 'Validate assets' },
                { name: 'generateReport', description: 'Generate validation report' }
            ]}
        ];

        this.availableTools = [];
        toolCategories.forEach(category => {
            category.tools.forEach(tool => {
                this.availableTools.push({
                    category: category.category,
                    name: tool.name,
                    enabled: true, // enabled by default
                    description: tool.description
                });
            });
        });

        console.log(`[ToolManager] Initialized ${this.availableTools.length} default tools`);
    }

    public getAvailableTools(): ToolConfig[] {
        return [...this.availableTools];
    }

    public getConfigurations(): ToolConfiguration[] {
        return [...this.settings.configurations];
    }

    public getCurrentConfiguration(): ToolConfiguration | null {
        if (!this.settings.currentConfigId) {
            return null;
        }
        return this.settings.configurations.find(config => config.id === this.settings.currentConfigId) || null;
    }

    public createConfiguration(name: string, description?: string): ToolConfiguration {
        if (this.settings.configurations.length >= this.settings.maxConfigSlots) {
            throw new Error(`Maximum number of configuration slots reached (${this.settings.maxConfigSlots})`);
        }

        const config: ToolConfiguration = {
            id: uuidv4(),
            name,
            description,
            tools: this.availableTools.map(tool => ({ ...tool })),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.settings.configurations.push(config);
        this.settings.currentConfigId = config.id;
        this.saveSettings();

        return config;
    }

    public updateConfiguration(configId: string, updates: Partial<ToolConfiguration>): ToolConfiguration {
        const configIndex = this.settings.configurations.findIndex(config => config.id === configId);
        if (configIndex === -1) {
            throw new Error('Configuration does not exist');
        }

        const config = this.settings.configurations[configIndex];
        const updatedConfig: ToolConfiguration = {
            ...config,
            ...updates,
            updatedAt: new Date().toISOString()
        };

        this.settings.configurations[configIndex] = updatedConfig;
        this.saveSettings();

        return updatedConfig;
    }

    public deleteConfiguration(configId: string): void {
        const configIndex = this.settings.configurations.findIndex(config => config.id === configId);
        if (configIndex === -1) {
            throw new Error('Configuration does not exist');
        }

        this.settings.configurations.splice(configIndex, 1);
        
        // Reset current configuration when deleted
        if (this.settings.currentConfigId === configId) {
            this.settings.currentConfigId = this.settings.configurations.length > 0 
                ? this.settings.configurations[0].id 
                : '';
        }

        this.saveSettings();
    }

    public setCurrentConfiguration(configId: string): void {
        const config = this.settings.configurations.find(config => config.id === configId);
        if (!config) {
            throw new Error('Configuration does not exist');
        }

        this.settings.currentConfigId = configId;
        this.saveSettings();
    }

    public updateToolStatus(configId: string, category: string, toolName: string, enabled: boolean): void {
        console.log(`Backend: Updating tool status - configId: ${configId}, category: ${category}, toolName: ${toolName}, enabled: ${enabled}`);
        
        const config = this.settings.configurations.find(config => config.id === configId);
        if (!config) {
            console.error(`Backend: Config not found with ID: ${configId}`);
            throw new Error('Configuration does not exist');
        }

        console.log(`Backend: Found config: ${config.name}`);

        const tool = config.tools.find(t => t.category === category && t.name === toolName);
        if (!tool) {
            console.error(`Backend: Tool not found - category: ${category}, name: ${toolName}`);
            throw new Error('Tool does not exist');
        }

        console.log(`Backend: Found tool: ${tool.name}, current enabled: ${tool.enabled}, new enabled: ${enabled}`);
        
        tool.enabled = enabled;
        config.updatedAt = new Date().toISOString();
        
        console.log(`Backend: Tool updated, saving settings...`);
        this.saveSettings();
        console.log(`Backend: Settings saved successfully`);
    }

    public updateToolStatusBatch(configId: string, updates: { category: string; name: string; enabled: boolean }[]): void {
        console.log(`Backend: updateToolStatusBatch called with configId: ${configId}`);
        console.log(`Backend: Current configurations count: ${this.settings.configurations.length}`);
        console.log(`Backend: Current config IDs:`, this.settings.configurations.map(c => c.id));
        
        const config = this.settings.configurations.find(config => config.id === configId);
        if (!config) {
            console.error(`Backend: Config not found with ID: ${configId}`);
            console.error(`Backend: Available config IDs:`, this.settings.configurations.map(c => c.id));
            throw new Error('Configuration does not exist');
        }

        console.log(`Backend: Found config: ${config.name}, updating ${updates.length} tools`);

        updates.forEach(update => {
            const tool = config.tools.find(t => t.category === update.category && t.name === update.name);
            if (tool) {
                tool.enabled = update.enabled;
            }
        });

        config.updatedAt = new Date().toISOString();
        this.saveSettings();
        console.log(`Backend: Batch update completed successfully`);
    }

    public exportConfiguration(configId: string): string {
        const config = this.settings.configurations.find(config => config.id === configId);
        if (!config) {
            throw new Error('Configuration does not exist');
        }

        return this.exportToolConfiguration(config);
    }

    public importConfiguration(configJson: string): ToolConfiguration {
        const config = this.importToolConfiguration(configJson);
        
        // Regenerate identifiers and timestamps
        config.id = uuidv4();
        config.createdAt = new Date().toISOString();
        config.updatedAt = new Date().toISOString();

        if (this.settings.configurations.length >= this.settings.maxConfigSlots) {
            throw new Error(`Maximum number of configuration slots reached (${this.settings.maxConfigSlots})`);
        }

        this.settings.configurations.push(config);
        this.saveSettings();

        return config;
    }

    public getEnabledTools(): ToolConfig[] {
        const currentConfig = this.getCurrentConfiguration();
        if (!currentConfig) {
            return this.availableTools.filter(tool => tool.enabled);
        }
        return currentConfig.tools.filter(tool => tool.enabled);
    }

    public getToolManagerState() {
        const currentConfig = this.getCurrentConfiguration();
        return {
            success: true,
            availableTools: currentConfig ? currentConfig.tools : this.getAvailableTools(),
            selectedConfigId: this.settings.currentConfigId,
            configurations: this.getConfigurations(),
            maxConfigSlots: this.settings.maxConfigSlots
        };
    }

    private saveSettings(): void {
        console.log(`Backend: Saving settings, current configs count: ${this.settings.configurations.length}`);
        this.saveToolManagerSettings(this.settings);
        console.log(`Backend: Settings saved to file`);
    }
} 
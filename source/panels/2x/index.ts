import * as fs from 'fs';

const PKG = 'cocos-mcp-server';

function readUtf8OrThrow(relPackagesUrl: string): string {
    const href = `packages://${PKG}/${relPackagesUrl}`;
    const filePath = Editor.url(href);
    return fs.readFileSync(filePath, 'utf8');
}

function sendMain<T = unknown>(method: string, ...args: unknown[]): Promise<T> {
    const channel = `${PKG}:${method}`;
    return new Promise<T>((resolve, reject) => {
        Editor.Ipc.sendToMain(channel, ...args, (err: Error | null, result?: T) => {
            if (err) {
                reject(err);
            } else {
                resolve(result as T);
            }
        });
    });
}

type ServerStatusPayload = {
    running: boolean;
    port: number;
    connections: number;
    settings: { port: number; autoStart: boolean };
};

type ToolRow = { category: string; name: string; enabled: boolean; description?: string };

type ToolManagerState = {
    selectedConfigId: string;
    availableTools: ToolRow[];
};

const style = readUtf8OrThrow('static/style/2x/panel.css');
const template = readUtf8OrThrow('static/template/2x/panel.html');

Editor.Panel.extend({
    style,
    template,

    $: {
        statusDot: '#status-dot',
        statusText: '#status-text',
        portInput: '#port-input',
        autostartInput: '#autostart-input',
        btnStart: '#btn-start',
        btnStop: '#btn-stop',
        btnApply: '#btn-apply',
        toolList: '#tool-list',
        btnExport: '#btn-export',
        btnImport: '#btn-import',
        importText: '#import-text',
    },

    ready(this: any) {
        this.$btnStart.addEventListener('click', () => this.onStart());
        this.$btnStop.addEventListener('click', () => this.onStop());
        this.$btnApply.addEventListener('click', () => this.onSaveSettings());
        this.$btnExport.addEventListener('click', () => this.onExport());
        this.$btnImport.addEventListener('click', () => this.onImport());

        void this.refreshAll();
    },

    close(this: any) {},

    // 2.x panels receive main-process broadcasts via `messages`, not
    // `Editor.Ipc.on` (which does not exist in the renderer). The key is
    // the full IPC channel name (pkg-scoped).
    messages: {
        [`${PKG}:server-status-changed`](this: any, _evt: unknown, payload: ServerStatusPayload) {
            this.applyStatus(payload);
        },
    } as Record<string, (this: any, _evt: unknown, ...args: any[]) => void>,

    applyStatus(this: any, payload: ServerStatusPayload) {
        const running = !!payload?.running;
        const port = payload?.settings?.port ?? payload?.port ?? 0;
        const auto = !!payload?.settings?.autoStart;
        this.$statusText.innerText = running
            ? `Running on 127.0.0.1:${port} (${payload.connections} connections)`
            : 'Stopped';
        this.$statusDot.classList.remove('mcp-dot--on', 'mcp-dot--off', 'mcp-dot--unknown');
        this.$statusDot.classList.add(running ? 'mcp-dot--on' : 'mcp-dot--off');
        this.$portInput.value = String(port);
        this.$autostartInput.checked = auto;
        this.$btnStart.disabled = running;
        this.$btnStop.disabled = !running;
    },

    async refreshAll(this: any) {
        try {
            const st = await sendMain<ServerStatusPayload>('get-server-status');
            this.applyStatus(st);
        } catch (e) {
            Editor.warn(`[MCP panel] get-server-status failed: ${e}`);
        }
        try {
            const tm = await sendMain<ToolManagerState>('getToolManagerState');
            this.renderTools(tm);
        } catch (e) {
            Editor.warn(`[MCP panel] getToolManagerState failed: ${e}`);
        }
    },

    renderTools(this: any, state: ToolManagerState) {
        this._selectedConfigId = state?.selectedConfigId;
        const tools = state?.availableTools || [];
        const byCat = new Map<string, ToolRow[]>();
        for (const t of tools) {
            const list = byCat.get(t.category) || [];
            list.push(t);
            byCat.set(t.category, list);
        }
        const frag = document.createDocumentFragment();
        for (const [cat, rows] of byCat) {
            const wrap = document.createElement('div');
            wrap.className = 'mcp-cat';
            const title = document.createElement('div');
            title.className = 'mcp-cat-title';
            title.innerText = cat;
            wrap.appendChild(title);
            for (const row of rows) {
                const line = document.createElement('div');
                line.className = 'mcp-tool-row';
                const id = `tool-${cat}__${row.name}`.replace(/[^a-zA-Z0-9_-]/g, '_');
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.id = id;
                cb.checked = row.enabled !== false;
                cb.addEventListener('change', () => {
                    void this.onToggleTool(cat, row.name, cb.checked);
                });
                const lab = document.createElement('label');
                lab.htmlFor = id;
                const strong = document.createElement('strong');
                strong.innerText = row.name;
                lab.appendChild(strong);
                if (row.description) {
                    const span = document.createElement('span');
                    span.className = 'mcp-tool-desc';
                    span.innerText = row.description;
                    lab.appendChild(span);
                }
                line.appendChild(cb);
                line.appendChild(lab);
                wrap.appendChild(line);
            }
            frag.appendChild(wrap);
        }
        this.$toolList.innerHTML = '';
        this.$toolList.appendChild(frag);
    },

    async onStart(this: any) {
        try {
            // Sync UI values before starting so the typed port takes effect
            // even when the user hasn't clicked "Save settings" first.
            const cur = await sendMain<ServerStatusPayload>('get-server-status');
            const port = Math.floor(Number(this.$portInput.value)) || cur.settings.port;
            const autoStart = !!this.$autostartInput.checked;
            if (port !== cur.settings.port || autoStart !== cur.settings.autoStart) {
                await sendMain('update-settings', { ...cur.settings, port, autoStart });
            }
            await sendMain('start-server');
            const st = await sendMain<ServerStatusPayload>('get-server-status');
            this.applyStatus(st);
        } catch (e) {
            Editor.error(`[MCP panel] start-server failed: ${e}`);
        }
    },

    async onStop(this: any) {
        try {
            await sendMain('stop-server');
            const st = await sendMain<ServerStatusPayload>('get-server-status');
            this.applyStatus(st);
        } catch (e) {
            Editor.error(`[MCP panel] stop-server failed: ${e}`);
        }
    },

    async onSaveSettings(this: any) {
        try {
            const cur = await sendMain<ServerStatusPayload>('get-server-status');
            const port = Math.floor(Number(this.$portInput.value)) || cur.settings.port;
            const next = {
                ...cur.settings,
                port,
                autoStart: !!this.$autostartInput.checked,
            };
            await sendMain('update-settings', next);
            const st = await sendMain<ServerStatusPayload>('get-server-status');
            this.applyStatus(st);
        } catch (e) {
            Editor.error(`[MCP panel] update-settings failed: ${e}`);
        }
    },

    async onToggleTool(this: any, category: string, name: string, enabled: boolean) {
        try {
            await sendMain('updateToolStatus', category, name, enabled);
        } catch (e) {
            Editor.error(`[MCP panel] updateToolStatus failed: ${e}`);
            void this.refreshAll();
        }
    },

    async onExport(this: any) {
        try {
            const id = this._selectedConfigId;
            if (!id) {
                Editor.warn('[MCP panel] No active configuration to export');
                return;
            }
            const res = await sendMain<{ configJson: string }>('exportToolConfiguration', id);
            this.$importText.value = res.configJson || '';
            Editor.success('[MCP panel] Configuration exported to the text area');
        } catch (e) {
            Editor.error(`[MCP panel] export failed: ${e}`);
        }
    },

    async onImport(this: any) {
        const raw = (this.$importText.value || '').trim();
        if (!raw) {
            Editor.warn('[MCP panel] Paste JSON before importing');
            return;
        }
        try {
            await sendMain('importToolConfiguration', raw);
            Editor.success('[MCP panel] Configuration imported');
            void this.refreshAll();
        } catch (e) {
            Editor.error(`[MCP panel] import failed: ${e}`);
        }
    },
});

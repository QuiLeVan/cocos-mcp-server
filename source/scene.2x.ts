/**
 * Cocos Creator 2.4.x engine scene script — runs in the preview/runtime process.
 * Registered via package.json `scene-script` (2.x manifest) → `dist-2x/scene.2x.js`.
 *
 * Methods are invoked as: `Editor.Scene.callSceneScript('<pkg>', '<name>', [arg1, …])`
 * → `methods.<name>(event, arg1, …)` where `event` is the IPC event object.
 *
 * @see .ai-docs/tasks/cocos-2x-support/task4-2x-scene-script.md
 */

/* global Editor, cc */

/**
 * Engine global. In the 2.x scene context `cc` is a runtime global, not a
 * requireable Node module — `require('cc')` fails at load time with
 * `Cannot find module 'cc'`. Use a Proxy so every property access resolves
 * `cc` lazily the first time a method is invoked.
 */
const engine: any = new Proxy(
    {},
    {
        get(_target, prop) {
            const g: any = (typeof globalThis !== 'undefined' ? globalThis : undefined) as any;
            const ccRef = (g && g.cc) || (typeof cc !== 'undefined' ? cc : undefined);
            if (!ccRef) {
                throw new Error('Cocos engine global `cc` not available in scene context');
            }
            return (ccRef as any)[prop as any];
        },
    },
);

const uuidMap = new Map<string, any>();
let mapDirty = true;

function invalidateIndex(): void {
    mapDirty = true;
}

function walk(node: any, visit: (n: any) => void): void {
    visit(node);
    const children: any[] = node.children || [];
    for (let i = 0; i < children.length; i++) {
        walk(children[i], visit);
    }
}

function rebuildUuidIndex(): void {
    uuidMap.clear();
    const scene = engine.director.getScene();
    if (!scene) {
        mapDirty = false;
        return;
    }
    walk(scene, (n: any) => {
        if (n && n.uuid) {
            uuidMap.set(n.uuid, n);
        }
    });
    mapDirty = false;
}

function getNodeByUuid(uuid: string): any | undefined {
    if (mapDirty) {
        rebuildUuidIndex();
    }
    return uuidMap.get(uuid);
}

function getActiveScene(): any | null {
    return engine.director.getScene();
}

function resolveComponentClass(componentType: string): any | null {
    if (!componentType) {
        return null;
    }
    const byJs = engine.js && engine.js.getClassByName ? engine.js.getClassByName(componentType) : null;
    if (byJs) {
        return byJs;
    }
    if (componentType.startsWith('cc.')) {
        const shortName = componentType.slice(3);
        if (engine[shortName]) {
            return engine[shortName];
        }
    }
    return null;
}

function getComponentOnNode(node: any, componentType: string): any | null {
    const cls = resolveComponentClass(componentType);
    if (!cls) {
        return null;
    }
    return node.getComponent(cls) || node.getComponent(componentType);
}

function readVec2(value: any): { x: number; y: number } | null {
    if (value == null) {
        return null;
    }
    if (typeof value === 'object') {
        const x = Number(value.x);
        const y = Number(value.y);
        if (Number.isFinite(x) && Number.isFinite(y)) {
            return { x, y };
        }
    }
    return null;
}

function readColor(value: any): any | null {
    if (value == null) {
        return null;
    }
    if (typeof value === 'string') {
        return null;
    }
    if (typeof value === 'object') {
        const r = Number(value.r);
        const g = Number(value.g);
        const b = Number(value.b);
        const a = value.a !== undefined ? Number(value.a) : 255;
        if ([r, g, b, a].every((n) => Number.isFinite(n))) {
            return new engine.Color(r, g, b, a);
        }
    }
    return null;
}

function serializeValue(v: any, depth: number): any {
    if (depth > 4) {
        return '[MaxDepth]';
    }
    if (v == null) {
        return null;
    }
    const t = typeof v;
    if (t === 'number' || t === 'boolean' || t === 'string') {
        return v;
    }
    if (v instanceof engine.Color) {
        return { r: v.r, g: v.g, b: v.b, a: v.a };
    }
    if (v instanceof engine.Vec2) {
        return { x: v.x, y: v.y };
    }
    if (v instanceof engine.Vec3) {
        return { x: v.x, y: v.y, z: v.z };
    }
    if (v instanceof engine.Size) {
        return { width: v.width, height: v.height };
    }
    if (v.uuid && (v.name !== undefined || v.constructor)) {
        return {
            __type: 'object_ref',
            uuid: v.uuid,
            name: v.name,
            ctor: v.constructor && v.constructor.name,
        };
    }
    if (Array.isArray(v)) {
        return v.map((item) => serializeValue(item, depth + 1));
    }
    if (t === 'object') {
        const out: Record<string, any> = {};
        for (const k of Object.keys(v)) {
            if (k.startsWith('_')) {
                continue;
            }
            try {
                out[k] = serializeValue(v[k], depth + 1);
            } catch {
                out[k] = '[Unreadable]';
            }
        }
        return out;
    }
    return String(v);
}

function describeComponent(comp: any): { type: string; enabled: boolean; name?: string; uuid?: string } {
    const ctor = comp && comp.constructor;
    return {
        type: ctor && ctor.name ? ctor.name : 'Component',
        enabled: !!comp.enabled,
        name: comp.name,
        uuid: comp.uuid,
    };
}

function collectNodeTree(node: any, includeComponents: boolean): any {
    const entry: any = {
        uuid: node.uuid,
        name: node.name,
        active: node.active,
        children: [],
    };
    if (includeComponents) {
        const comps: any[] = node._components || node.components || [];
        entry.components = comps.map((c) => ({
            type: c && c.constructor ? c.constructor.name : 'Unknown',
            enabled: !!c.enabled,
        }));
    }
    const children: any[] = node.children || [];
    for (let i = 0; i < children.length; i++) {
        entry.children.push(collectNodeTree(children[i], includeComponents));
    }
    return entry;
}

function buildNodeInfoPayload(node: any): any {
    const comps: any[] = node._components || node.components || [];
    return {
        uuid: node.uuid,
        name: node.name,
        active: node.active,
        x: node.x,
        y: node.y,
        scaleX: node.scaleX,
        scaleY: node.scaleY,
        rotation: node.rotation,
        width: node.width,
        height: node.height,
        anchorX: node.anchorX,
        anchorY: node.anchorY,
        opacity: node.opacity,
        zIndex: node.zIndex,
        parent: node.parent ? node.parent.uuid : null,
        color: node.color
            ? { r: node.color.r, g: node.color.g, b: node.color.b, a: node.color.a }
            : undefined,
        components: comps.map((c) => ({
            ...describeComponent(c),
            properties: getComponentPropertiesPayload(c),
        })),
    };
}

function getComponentPropertiesPayload(comp: any): Record<string, any> {
    const out: Record<string, any> = {};
    if (!comp) {
        return out;
    }
    const keys = Object.getOwnPropertyNames(comp);
    for (const prop of keys) {
        if (!prop || prop.startsWith('_')) {
            continue;
        }
        try {
            const descriptor = Object.getOwnPropertyDescriptor(comp.constructor.prototype, prop);
            if (descriptor && typeof descriptor.get === 'function' && descriptor.set === undefined) {
                continue;
            }
        } catch {
            // ignore descriptor probe failures
        }
        try {
            out[prop] = serializeValue(comp[prop], 0);
        } catch {
            out[prop] = '[Unreadable]';
        }
    }
    return out;
}

const methods: Record<string, (...args: any[]) => any> = {
    queryNodeTree(_event: any, args?: { includeComponents?: boolean }) {
        try {
            const scene = getActiveScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }
            const includeComponents = !!(args && args.includeComponents);
            const roots: any[] = scene.children || [];
            const data = roots.map((c) => collectNodeTree(c, includeComponents));
            return { success: true, data };
        } catch (error: any) {
            return { success: false, error: error.message || String(error) };
        }
    },

    getNodeInfo(_event: any, args?: { uuid?: string } | string) {
        try {
            const uuid = typeof args === 'string' ? args : args && args.uuid;
            if (!uuid) {
                return { success: false, error: 'uuid is required' };
            }
            const node = getNodeByUuid(uuid);
            if (!node) {
                return { success: false, error: `Node with UUID ${uuid} not found` };
            }
            return { success: true, data: buildNodeInfoPayload(node) };
        } catch (error: any) {
            return { success: false, error: error.message || String(error) };
        }
    },

    queryCurrentSceneInfo(_event?: any) {
        try {
            const scene = getActiveScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }
            const roots = scene.children || [];
            return {
                success: true,
                data: {
                    name: scene.name,
                    uuid: scene.uuid,
                    rootNodeCount: roots.length,
                },
            };
        } catch (error: any) {
            return { success: false, error: error.message || String(error) };
        }
    },

    createNode(_event: any, args?: { name?: string; parentUuid?: string; position?: { x?: number; y?: number; z?: number } }) {
        try {
            const scene = getActiveScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }
            const name = (args && args.name) || 'New Node';
            const node = new engine.Node(name);
            let parent: any = scene;
            if (args && args.parentUuid) {
                const p = getNodeByUuid(args.parentUuid);
                if (p) {
                    parent = p;
                }
            }
            if (args && args.position) {
                const x = Number(args.position.x) || 0;
                const y = Number(args.position.y) || 0;
                if (args.position.z !== undefined) {
                    // 2.x is 2D-first; ignore z (task note)
                }
                node.setPosition(x, y);
            }
            parent.addChild(node);
            invalidateIndex();
            return {
                success: true,
                message: `Node '${name}' created`,
                data: { uuid: node.uuid, name: node.name },
            };
        } catch (error: any) {
            return { success: false, error: error.message || String(error) };
        }
    },

    setNodeProperty(
        _event: any,
        args?: { uuid?: string; property?: string; value?: any } | string,
        maybeProperty?: string,
        maybeValue?: any,
    ) {
        try {
            let uuid: string | undefined;
            let property: string | undefined;
            let value: any;
            if (typeof args === 'string') {
                uuid = args;
                property = maybeProperty;
                value = maybeValue;
            } else if (args && typeof args === 'object') {
                uuid = args.uuid;
                property = args.property;
                value = args.value;
            }
            if (!uuid || !property) {
                return { success: false, error: 'uuid and property are required' };
            }
            const node = getNodeByUuid(uuid);
            if (!node) {
                return { success: false, error: `Node with UUID ${uuid} not found` };
            }
            let parentChanged = false;
            let zIgnored = false;

            switch (property) {
                case 'x':
                    node.x = Number(value) || 0;
                    break;
                case 'y':
                    node.y = Number(value) || 0;
                    break;
                case 'position': {
                    const v2 = readVec2(value);
                    if (v2) {
                        node.setPosition(v2.x, v2.y);
                    }
                    if (value && typeof value === 'object' && value.z !== undefined) {
                        zIgnored = true;
                    }
                    break;
                }
                case 'scaleX':
                    node.scaleX = Number(value) || 0;
                    break;
                case 'scaleY':
                    node.scaleY = Number(value) || 0;
                    break;
                case 'rotation':
                    node.rotation = Number(value) || 0;
                    break;
                case 'width':
                    node.width = Number(value) || 0;
                    break;
                case 'height':
                    node.height = Number(value) || 0;
                    break;
                case 'opacity':
                    node.opacity = Number(value) || 0;
                    break;
                case 'active':
                    node.active = !!value;
                    break;
                case 'name':
                    node.name = String(value);
                    break;
                case 'anchorX':
                    node.anchorX = Number(value) || 0;
                    break;
                case 'anchorY':
                    node.anchorY = Number(value) || 0;
                    break;
                case 'zIndex':
                    node.zIndex = Number(value) || 0;
                    break;
                case 'color': {
                    const col = readColor(value);
                    if (col) {
                        node.color = col;
                    }
                    break;
                }
                case 'parent': {
                    const parentUuid = String(value);
                    const parent = getNodeByUuid(parentUuid);
                    if (!parent) {
                        return { success: false, error: `Parent ${parentUuid} not found` };
                    }
                    node.removeFromParent();
                    parent.addChild(node);
                    parentChanged = true;
                    break;
                }
                default:
                    (node as any)[property] = value;
            }

            if (parentChanged) {
                invalidateIndex();
            } else {
                uuidMap.set(node.uuid, node);
            }

            const msg = zIgnored ? "Property updated (ignored 'z' on position in 2.x)" : `Property '${property}' updated`;
            return { success: true, message: msg };
        } catch (error: any) {
            return { success: false, error: error.message || String(error) };
        }
    },

    deleteNode(_event: any, args?: { uuid?: string } | string) {
        try {
            const uuid = typeof args === 'string' ? args : args && args.uuid;
            if (!uuid) {
                return { success: false, error: 'uuid is required' };
            }
            const node = getNodeByUuid(uuid);
            if (!node) {
                return { success: false, error: `Node with UUID ${uuid} not found` };
            }
            const scene = getActiveScene();
            if (scene && node === scene) {
                return { success: false, error: 'Cannot delete scene root' };
            }
            node.removeFromParent();
            node.destroy();
            invalidateIndex();
            return { success: true, message: 'Node deleted' };
        } catch (error: any) {
            return { success: false, error: error.message || String(error) };
        }
    },

    reparent(_event: any, args?: { nodeUuid?: string; newParentUuid?: string; keepWorldTransform?: boolean }) {
        try {
            if (!args || !args.nodeUuid || !args.newParentUuid) {
                return { success: false, error: 'nodeUuid and newParentUuid are required' };
            }
            const node = getNodeByUuid(args.nodeUuid);
            const parent = getNodeByUuid(args.newParentUuid);
            if (!node || !parent) {
                return { success: false, error: 'node or newParent not found' };
            }
            let wx = node.x;
            let wy = node.y;
            if (args.keepWorldTransform && node.parent && node.parent.convertToWorldSpaceAR) {
                const wp = node.parent.convertToWorldSpaceAR(engine.v2(node.x, node.y));
                wx = wp.x;
                wy = wp.y;
            }
            node.removeFromParent();
            parent.addChild(node);
            if (args.keepWorldTransform && parent.convertToNodeSpaceAR) {
                const lp = parent.convertToNodeSpaceAR(engine.v2(wx, wy));
                node.setPosition(lp.x, lp.y);
            }
            invalidateIndex();
            return { success: true, message: 'Node reparented' };
        } catch (error: any) {
            return { success: false, error: error.message || String(error) };
        }
    },

    addComponent(_event: any, args?: { nodeUuid?: string; componentType?: string }) {
        try {
            if (!args || !args.nodeUuid || !args.componentType) {
                return { success: false, error: 'nodeUuid and componentType are required' };
            }
            const node = getNodeByUuid(args.nodeUuid);
            if (!node) {
                return { success: false, error: `Node ${args.nodeUuid} not found` };
            }
            const cls = resolveComponentClass(args.componentType);
            if (!cls) {
                return { success: false, error: `Component type ${args.componentType} not found` };
            }
            const comp = node.addComponent(cls);
            invalidateIndex();
            return {
                success: true,
                message: `Component ${args.componentType} added`,
                data: describeComponent(comp),
            };
        } catch (error: any) {
            return { success: false, error: error.message || String(error) };
        }
    },

    removeComponent(_event: any, args?: { nodeUuid?: string; componentType?: string }) {
        try {
            if (!args || !args.nodeUuid || !args.componentType) {
                return { success: false, error: 'nodeUuid and componentType are required' };
            }
            const node = getNodeByUuid(args.nodeUuid);
            if (!node) {
                return { success: false, error: `Node ${args.nodeUuid} not found` };
            }
            const comp = getComponentOnNode(node, args.componentType);
            if (!comp) {
                return { success: false, error: `Component ${args.componentType} not on node` };
            }
            node.removeComponent(comp);
            invalidateIndex();
            return { success: true, message: 'Component removed' };
        } catch (error: any) {
            return { success: false, error: error.message || String(error) };
        }
    },

    setComponentProperty(
        _event: any,
        args?: { nodeUuid?: string; componentType?: string; property?: string; value?: any },
    ) {
        try {
            if (!args || !args.nodeUuid || !args.componentType || !args.property) {
                return { success: false, error: 'nodeUuid, componentType, and property are required' };
            }
            const node = getNodeByUuid(args.nodeUuid);
            if (!node) {
                return { success: false, error: `Node ${args.nodeUuid} not found` };
            }
            const comp = getComponentOnNode(node, args.componentType);
            if (!comp) {
                return { success: false, error: `Component ${args.componentType} not on node` };
            }
            const prop = args.property;
            let value = args.value;

            if (prop === 'spriteFrame' && comp.constructor && comp.constructor.name === 'Sprite') {
                if (typeof value === 'string') {
                    (comp as any)[prop] = value;
                } else {
                    (comp as any)[prop] = value;
                }
            } else if (prop === 'string' && (args.componentType.indexOf('Label') >= 0 || args.componentType.indexOf('RichText') >= 0)) {
                (comp as any).string = value;
            } else {
                const t = typeof value;
                if (t === 'object' && value !== null) {
                    const col = readColor(value);
                    if (col && prop.toLowerCase().indexOf('color') >= 0) {
                        value = col;
                    } else {
                        const v2 = readVec2(value);
                        if (v2 && (prop.toLowerCase().indexOf('offset') >= 0 || prop === 'position')) {
                            value = engine.v2(v2.x, v2.y);
                        }
                    }
                }
                (comp as any)[prop] = value;
            }

            uuidMap.set(node.uuid, node);
            return { success: true, message: `Property '${prop}' updated` };
        } catch (error: any) {
            return { success: false, error: error.message || String(error) };
        }
    },

    instantiatePrefab(
        _event: any,
        args?: { prefabUrl?: string; parentUuid?: string; position?: { x?: number; y?: number; z?: number } },
    ) {
        try {
            const scene = getActiveScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }
            const url = args && args.prefabUrl;
            if (!url || typeof url !== 'string') {
                return { success: false, error: 'prefabUrl is required (db://… to the .prefab asset)' };
            }
            const Prefab = engine.Prefab;
            let prefabAsset: any = null;
            if (engine.loader && typeof engine.loader.getRes === 'function') {
                prefabAsset = engine.loader.getRes(url, Prefab);
            }
            if (!prefabAsset) {
                return {
                    success: false,
                    error:
                        'Prefab is not in loader cache — open the scene in editor preview or ensure the asset URL is loadable (db://…)',
                };
            }
            const node = engine.instantiate(prefabAsset);
            let parent: any = scene;
            if (args && args.parentUuid) {
                const p = getNodeByUuid(args.parentUuid);
                if (p) {
                    parent = p;
                }
            }
            parent.addChild(node);
            if (args && args.position) {
                const x = Number(args.position.x) || 0;
                const y = Number(args.position.y) || 0;
                node.setPosition(x, y);
            }
            invalidateIndex();
            return {
                success: true,
                message: 'Prefab instantiated',
                data: { uuid: node.uuid, name: node.name },
            };
        } catch (error: any) {
            return { success: false, error: error.message || String(error) };
        }
    },

    getComponentProperties(_event: any, args?: { nodeUuid?: string; componentType?: string }) {
        try {
            if (!args || !args.nodeUuid || !args.componentType) {
                return { success: false, error: 'nodeUuid and componentType are required' };
            }
            const node = getNodeByUuid(args.nodeUuid);
            if (!node) {
                return { success: false, error: `Node ${args.nodeUuid} not found` };
            }
            const comp = getComponentOnNode(node, args.componentType);
            if (!comp) {
                return { success: false, error: `Component ${args.componentType} not on node` };
            }
            return { success: true, data: getComponentPropertiesPayload(comp) };
        } catch (error: any) {
            return { success: false, error: error.message || String(error) };
        }
    },

    snapshot(_event?: any) {
        return { success: false, error: 'undo_not_available_2x' };
    },

    undo(_event?: any) {
        return { success: false, error: 'undo_not_available_2x' };
    },

    redo(_event?: any) {
        return { success: false, error: 'undo_not_available_2x' };
    },

    saveScene(_event?: any) {
        try {
            const EditorGlobal = typeof Editor !== 'undefined' ? (Editor as any) : null;
            if (EditorGlobal && EditorGlobal.Ipc && EditorGlobal.Ipc.sendToMain) {
                EditorGlobal.Ipc.sendToMain('scene:stash-and-save');
                return { success: true, message: 'saveScene IPC sent (async in editor)' };
            }
            return {
                success: false,
                error: 'Editor.Ipc.sendToMain not available from scene context — invoke save from main process',
            };
        } catch (error: any) {
            return { success: false, error: error.message || String(error) };
        }
    },
};

module.exports = { methods };

/**
 * Prefab format bridge (Cocos Creator 2.4.x ↔ MCP / limited 3.x serialized array).
 *
 * ## 6.1 — 2.x on-disk JSON (summary)
 * - Root is a **JSON array** of serialized “cells”.
 * - Cross-cell references are **only** plain `{ "__id__": <integer index> }` objects (single key).
 * - Each cell has `"__type__"` (e.g. `cc.Prefab`, `cc.Node`, `cc.Sprite`, `cc.PrefabInfo`).
 * - Inline value types embed full objects: `{ "__type__": "cc.Vec2", "x", "y" }`, `cc.Color`, `cc.Size`, etc.
 * - **Cycles**: `cc.Node` uses `_parent` / `_children` back-references; expansion must guard recursion.
 *
 * ## 6.1 — 3.x serialized prefab JSON (Creator 3.6+ typical `.prefab` asset)
 * - Still commonly a **JSON array** of cells with `__type__` + `__id__` graph (similar deserializer to 2.x).
 * - Cells often carry numeric **`__version__`** (deserializer migration version) — **2.4.x generally does not**
 *   expect these on every object; we strip them when targeting 2.x (lossy but usually required).
 * - **`cc.Node`** frequently stores local transform as **`_lpos` / `_lrot` / `_lscale`** (`cc.Vec3` / `Quat` style)
 *   instead of 2.x **`_position` (`cc.Vec2`)**, **`_rotationX` / `_rotationY`**, **`_scaleX` / `_scaleY`**.
 * - Nested prefabs / external refs use `__uuid__` on sub-assets; behaviour matches engine rules (not re-written here).
 *
 * ## 6.1 — Lossy / unsafe areas (warnings, never silent for stripped z / blocked types)
 * - Dropping **Z** from `_lpos` when mapping to `_position` (2D 2.x plane).
 * - Removing **`__version__`** and other 3-only fields the converter does not map.
 * - **Animation, physics, particles, spine, dragonBones**, etc. — blocked for MVP `3x → 2x` (return failure).
 * - Custom `ccclass` components, shaders, clips, and unknown `__type__` — passed through with warnings where possible.
 *
 * This module is **experimental**: invalid writes can corrupt projects — callers should use dry-run first.
 */

export const PREFAB_BRIDGE_VERSION = 1 as const;

export type PrefabFormatResult<T> = {
    /** Normalized payload for MCP clients */
    data: T;
    warnings: string[];
    /** When {@link from3xShape} runs with `dryRun: true`, populated with records that would be written */
    dryRunRecords?: unknown[];
};

export type From3xOptions = {
    /** When true, compute conversion + warnings but do not rely on caller to write (adapter uses this). */
    dryRun?: boolean;
};

const MCP_SOURCE_INDEX = '__mcpSourceIndex';

/** Component types we refuse to auto-downgrade into a 2.4.x prefab (MVP safety). */
export const UNSUPPORTED_PREFAB_COMPONENT_TYPES_FOR_2X = new Set<string>([
    'cc.Animation',
    'cc.AnimationComponent',
    'cc.SkeletalAnimation',
    'cc.RigidBody',
    'cc.RigidBody2D',
    'cc.BoxCollider3D',
    'cc.SphereCollider3D',
    'cc.CapsuleCollider3D',
    'cc.MeshCollider',
    'cc.PhysicsMaterial',
    'cc.PhysicsBoxCollider',
    'cc.PhysicsCircleCollider',
    'cc.PhysicsPolygonCollider',
    'cc.PhysicsChainCollider',
    'cc.PhysicsLineCollider',
    'cc.PhysicsCollider',
    'cc.ParticleSystem',
    'cc.ParticleSystem2D',
    'sp.Skeleton',
    'dragonBones.ArmatureDisplay',
]);

function isPlainObject(v: unknown): v is Record<string, unknown> {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** True for `{ "__id__": n }` record cross-references (2.x serialized graph). */
export function isSerializedIdRef(o: unknown): o is { __id__: number } {
    if (!isPlainObject(o)) {
        return false;
    }
    const keys = Object.keys(o);
    return keys.length === 1 && keys[0] === '__id__' && typeof o.__id__ === 'number';
}

/** Heuristic: 2.x prefab files are a non-empty JSON array; first cell is usually `cc.Prefab`. */
export function isCocos2xPrefabSerializedArray(value: unknown): value is unknown[] {
    if (!Array.isArray(value) || value.length === 0) {
        return false;
    }
    const head = value[0];
    return isPlainObject(head) && head.__type__ === 'cc.Prefab';
}

/**
 * True when the serialized array looks like **Creator 3.x** prefab JSON (not only MCP bridge).
 * Uses conservative signals: `__version__` on cells and/or `cc.Node._lpos` without legacy `_position`.
 */
export function isLikelyNative3xSerializedPrefabArray(value: unknown[]): boolean {
    if (!isCocos2xPrefabSerializedArray(value)) {
        return false;
    }
    const hasVersion = value.some((c) => isPlainObject(c) && '__version__' in c);
    const hasLposNode = value.some(
        (c) =>
            isPlainObject(c) &&
            c.__type__ === 'cc.Node' &&
            '_lpos' in c &&
            !('_position' in c),
    );
    return hasVersion || hasLposNode;
}

function cloneAttachIndex(record: unknown, index: number): any {
    const o = JSON.parse(JSON.stringify(record));
    Object.defineProperty(o, MCP_SOURCE_INDEX, { value: index, enumerable: false, configurable: true });
    return o;
}

/**
 * Expand 2.x `{ __id__ }` pointers into nested object clones. Each original
 * array record is tagged with a non-enumerable `__mcpSourceIndex` for flattening.
 */
export function expand2xSerializedArray(records: unknown[]): { root: unknown; warnings: string[] } {
    const warnings: string[] = [];
    const maxDepth = 512;
    /** Prevents runaway recursion on cyclic graphs (`_parent` ↔ `_children`, etc.). */
    const expanding = new Set<number>();

    const getRecord = (id: number): any => {
        if (!Number.isInteger(id) || id < 0 || id >= records.length) {
            warnings.push(`invalid __id__ reference: ${id}`);
            return { __id__: id, __invalidRef: true };
        }
        return cloneAttachIndex(records[id], id);
    };

    const walk = (node: unknown, depth: number): unknown => {
        if (depth > maxDepth) {
            warnings.push('expand depth cap hit; subtree truncated marker may appear');
            return null;
        }
        if (node === null || typeof node !== 'object') {
            return node;
        }
        if (isSerializedIdRef(node)) {
            const id = node.__id__;
            if (expanding.has(id)) {
                return { __id__: id };
            }
            expanding.add(id);
            const expanded = walk(getRecord(id), depth + 1);
            expanding.delete(id);
            return expanded;
        }
        if (Array.isArray(node)) {
            return node.map((x) => walk(x, depth + 1));
        }
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(node)) {
            out[k] = walk(v, depth + 1);
        }
        return out;
    };

    const root = walk(getRecord(0), 0);
    return { root, warnings };
}

/** Adds `_mcpLposPreview` next to 2.x `_position` (`cc.Vec2`) for MCP clients expecting Vec3-style hints. */
export function addVec3PositionHintsOnExpanded(expanded: unknown): unknown {
    const walk = (node: unknown): unknown => {
        if (node === null || typeof node !== 'object') {
            return node;
        }
        if (Array.isArray(node)) {
            return node.map(walk);
        }
        const o = node as Record<string, unknown>;
        const copy: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(o)) {
            copy[k] = walk(v);
        }
        if (o.__type__ === 'cc.Node' && isPlainObject(o._position) && (o._position as any).__type__ === 'cc.Vec2') {
            const p = o._position as Record<string, unknown>;
            const x = Number(p.x) || 0;
            const y = Number(p.y) || 0;
            copy._mcpLposPreview = { __type__: 'cc.Vec3', x, y, z: 0 };
        }
        return copy;
    };
    return walk(expanded);
}

type IndexedObject = { [MCP_SOURCE_INDEX]?: number; [key: string]: unknown };

/**
 * Flatten an expanded graph back into a 2.x-style serialized array. Objects that
 * participated in expansion must carry hidden `__mcpSourceIndex` matching the
 * original slot order.
 */
export function flattenTo2xSerializedArray(expandedRoot: unknown): { records: unknown[]; warnings: string[] } {
    const warnings: string[] = [];
    const seen = new Set<unknown>();
    const indexed = new Map<number, IndexedObject>();

    const collect = (node: unknown): void => {
        if (node === null || typeof node !== 'object') {
            return;
        }
        if (seen.has(node)) {
            return;
        }
        seen.add(node);
        if (isPlainObject(node) && typeof (node as IndexedObject)[MCP_SOURCE_INDEX] === 'number') {
            const idx = (node as IndexedObject)[MCP_SOURCE_INDEX]!;
            if (indexed.has(idx)) {
                warnings.push(`duplicate __mcpSourceIndex ${idx}; last wins`);
            }
            indexed.set(idx, node as IndexedObject);
        }
        if (Array.isArray(node)) {
            for (const x of node) {
                collect(x);
            }
            return;
        }
        for (const v of Object.values(node)) {
            collect(v);
        }
    };

    collect(expandedRoot);

    if (indexed.size === 0) {
        warnings.push('flatten: no __mcpSourceIndex markers found; cannot rebuild 2.x array');
        return { records: [], warnings };
    }

    const maxIdx = Math.max(...indexed.keys());
    const records: unknown[] = new Array(maxIdx + 1).fill(null);

    const serializeValue = (node: unknown, depth: number): unknown => {
        if (depth > 512) {
            warnings.push('flatten depth cap hit');
            return null;
        }
        if (node === null || typeof node !== 'object') {
            return node;
        }
        if (isPlainObject(node) && typeof (node as IndexedObject)[MCP_SOURCE_INDEX] === 'number') {
            return { __id__: (node as IndexedObject)[MCP_SOURCE_INDEX]! };
        }
        if (Array.isArray(node)) {
            return node.map((x) => serializeValue(x, depth + 1));
        }
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
            if (k === MCP_SOURCE_INDEX) {
                continue;
            }
            out[k] = serializeValue(v, depth + 1);
        }
        return out;
    };

    const serializeRecordSlot = (obj: IndexedObject): unknown => {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(obj)) {
            if (k === MCP_SOURCE_INDEX) {
                continue;
            }
            out[k] = serializeValue(v, 0);
        }
        return out;
    };

    for (let i = 0; i <= maxIdx; i++) {
        const obj = indexed.get(i);
        if (!obj) {
            warnings.push(`missing record for index ${i}; filled with null`);
            records[i] = null;
            continue;
        }
        records[i] = serializeRecordSlot(obj);
    }

    return { records, warnings };
}

function deepCloneJson<T>(v: T): T {
    return JSON.parse(JSON.stringify(v)) as T;
}

function scanPrefabArrayForUnsupportedComponents(records: unknown[]): string[] {
    const found: string[] = [];
    for (const cell of records) {
        if (!isPlainObject(cell)) {
            continue;
        }
        const t = cell.__type__;
        if (typeof t === 'string' && UNSUPPORTED_PREFAB_COMPONENT_TYPES_FOR_2X.has(t)) {
            found.push(t);
        }
    }
    return found;
}

function stripVersionsDeep(value: unknown, strippedCount: { n: number }): void {
    if (!isPlainObject(value) && !Array.isArray(value)) {
        return;
    }
    if (isPlainObject(value)) {
        if ('__version__' in value) {
            delete value.__version__;
            strippedCount.n += 1;
        }
        for (const v of Object.values(value)) {
            stripVersionsDeep(v, strippedCount);
        }
        return;
    }
    (value as unknown[]).forEach((item) => stripVersionsDeep(item, strippedCount));
}

function readVec3Like(v: unknown): { x: number; y: number; z: number } | null {
    if (!isPlainObject(v)) {
        return null;
    }
    if (v.__type__ === 'cc.Vec3' || v.__type__ === 'cc.Vec4') {
        return { x: Number(v.x) || 0, y: Number(v.y) || 0, z: Number(v.z) || 0 };
    }
    if (typeof v.x === 'number' || typeof v.x === 'string') {
        return { x: Number(v.x) || 0, y: Number(v.y) || 0, z: Number(v.z) || 0 };
    }
    return null;
}

/**
 * Best-effort conversion of a **native Creator 3.x** serialized prefab array into
 * something closer to **2.4.x** expectations. Always review `warnings`.
 */
export function native3xSerializedArrayTo2xApprox(records: unknown[]): PrefabFormatResult<unknown[]> {
    const warnings: string[] = [];
    const blocked = scanPrefabArrayForUnsupportedComponents(records);
    if (blocked.length) {
        warnings.push(`blocked_unsupported_component_types: ${[...new Set(blocked)].join(', ')}`);
        return { data: [], warnings };
    }

    const out = deepCloneJson(records);
    const verCount = { n: 0 };
    stripVersionsDeep(out, verCount);
    if (verCount.n > 0) {
        warnings.push(`stripped __version__ from ${verCount.n} object(s) (3.x deserializer metadata)`);
    }

    let lposMapped = 0;
    let lscaleMapped = 0;
    let lrotDropped = 0;
    let eulerDropped = 0;
    for (let i = 0; i < out.length; i++) {
        const cell = out[i];
        if (!isPlainObject(cell)) {
            continue;
        }
        if (cell.__type__ !== 'cc.Node') {
            continue;
        }
        if (cell._lpos !== undefined) {
            const v = readVec3Like(cell._lpos);
            if (v && Math.abs(v.z) > 1e-5) {
                warnings.push(`lossy_position_z: node index ${i} had _lpos.z=${v.z} (mapped to cc.Vec2, z dropped)`);
            }
            if (v) {
                cell._position = { __type__: 'cc.Vec2', x: v.x, y: v.y };
            }
            delete cell._lpos;
            lposMapped += 1;
        }
        if (cell._lscale !== undefined) {
            const s = readVec3Like(cell._lscale);
            if (s) {
                cell._scaleX = s.x;
                cell._scaleY = s.y;
                if (Math.abs(s.z - 1) > 1e-5) {
                    warnings.push(`lossy_scale_z: node index ${i} _lscale.z=${s.z} (2.x uses _scaleX/_scaleY only)`);
                }
                lscaleMapped += 1;
            }
            delete cell._lscale;
        }
        if (cell._lrot !== undefined) {
            lrotDropped += 1;
            delete cell._lrot;
        }
        if (cell._euler !== undefined) {
            eulerDropped += 1;
            delete cell._euler;
        }
    }
    if (lposMapped) {
        warnings.push(`mapped _lpos → _position on ${lposMapped} cc.Node(s)`);
    }
    if (lscaleMapped) {
        warnings.push(`mapped _lscale → _scaleX/_scaleY on ${lscaleMapped} cc.Node(s)`);
    }
    if (lrotDropped) {
        warnings.push(`dropped _lrot on ${lrotDropped} cc.Node(s) (not mapped to 2.x rotation)`);
    }
    if (eulerDropped) {
        warnings.push(`dropped _euler on ${eulerDropped} cc.Node(s) (not mapped to 2.x rotation)`);
    }

    return { data: out, warnings };
}

/**
 * Wrap a 2.x on-disk prefab array into a stable MCP-facing envelope (nested
 * preview + raw cells). Adds {@link addVec3PositionHintsOnExpanded} as `expandedVec3Hints`
 * for clients that want Vec3-style positions (z = 0).
 */
export function to3xShape(prefab2x: unknown): PrefabFormatResult<Record<string, unknown>> {
    const warnings: string[] = [];
    if (!isCocos2xPrefabSerializedArray(prefab2x)) {
        warnings.push('input is not a 2.x serialized prefab array; returning opaque wrapper');
        return {
            data: {
                __cocosMcpPrefabBridge: PREFAB_BRIDGE_VERSION,
                experimental: true,
                engineSource: 2,
                raw: prefab2x,
            },
            warnings,
        };
    }
    const { root, warnings: w2 } = expand2xSerializedArray(prefab2x);
    warnings.push(...w2);
    let vecHints: unknown;
    try {
        vecHints = addVec3PositionHintsOnExpanded(root);
    } catch (e) {
        warnings.push(`vec3_hint_failed: ${String(e)}`);
        vecHints = undefined;
    }
    return {
        data: {
            __cocosMcpPrefabBridge: PREFAB_BRIDGE_VERSION,
            experimental: true,
            engineSource: 2,
            serializedRecordCount: prefab2x.length,
            expanded: root,
            expandedVec3Hints: vecHints,
            /** Original flat array (lossless) for tools that need native 2.x */
            records2x: prefab2x,
        },
        warnings,
    };
}

/**
 * Build a 2.x flat-array prefab JSON from:
 * - MCP bridge object from {@link to3xShape} (`records2x` or `expanded` + markers), or
 * - A **native serialized** `[cc.Prefab, …]` array (pass-through if no 3.x markers), or
 * - A **native Creator 3.x** serialized array (see {@link isLikelyNative3xSerializedPrefabArray}).
 */
export function from3xShape(prefab3x: unknown, opts?: From3xOptions): PrefabFormatResult<unknown[]> {
    const warnings: string[] = [];

    if (Array.isArray(prefab3x) && prefab3x.length > 0 && isPlainObject(prefab3x[0]) && prefab3x[0].__type__ === 'cc.Prefab') {
        const arr = prefab3x as unknown[];
        if (isLikelyNative3xSerializedPrefabArray(arr)) {
            const conv = native3xSerializedArrayTo2xApprox(arr);
            const result: PrefabFormatResult<unknown[]> = {
                data: conv.data,
                warnings: [...warnings, ...conv.warnings],
            };
            if (opts?.dryRun) {
                result.dryRunRecords = conv.data.length ? deepCloneJson(conv.data) : [];
            }
            return result;
        }
        warnings.push('from3xShape: native cc.Prefab[] without 3.x markers; deep-cloned as-is');
        const passthrough = deepCloneJson(arr);
        const result: PrefabFormatResult<unknown[]> = { data: passthrough, warnings };
        if (opts?.dryRun) {
            result.dryRunRecords = passthrough;
        }
        return result;
    }

    if (!isPlainObject(prefab3x)) {
        warnings.push('from3xShape: expected object envelope or cc.Prefab[] array');
        return { data: [], warnings };
    }
    if (Array.isArray((prefab3x as any).records2x)) {
        const data = deepCloneJson((prefab3x as any).records2x) as unknown[];
        const result: PrefabFormatResult<unknown[]> = { data, warnings };
        if (opts?.dryRun) {
            result.dryRunRecords = data;
        }
        return result;
    }
    const expanded = (prefab3x as any).expanded;
    if (!expanded) {
        warnings.push('from3xShape: missing expanded graph and records2x; nothing to write');
        return { data: [], warnings };
    }
    const { records, warnings: w2 } = flattenTo2xSerializedArray(expanded);
    warnings.push(...w2);
    if (records.length === 0) {
        warnings.push('from3xShape: flatten produced empty array');
    }
    const result: PrefabFormatResult<unknown[]> = { data: records, warnings };
    if (opts?.dryRun) {
        result.dryRunRecords = records.length ? deepCloneJson(records) : [];
    }
    return result;
}

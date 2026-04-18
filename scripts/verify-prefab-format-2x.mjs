#!/usr/bin/env node
/**
 * Smoke test for dist-2x prefab bridge (run after `npm run build:2x`).
 */
import { createRequire } from 'module';
import { execSync } from 'child_process';

const require = createRequire(import.meta.url);
const {
    to3xShape,
    from3xShape,
    isCocos2xPrefabSerializedArray,
    isLikelyNative3xSerializedPrefabArray,
    native3xSerializedArrayTo2xApprox,
} = require('../dist-2x/adapters/prefab-format-2x.js');

const minimal = [
    { __type__: 'cc.Prefab', _name: '', _objFlags: 0, _rawFiles: null, data: { __id__: 1 } },
    {
        __type__: 'cc.Node',
        _name: 'R',
        _objFlags: 0,
        _parent: null,
        _children: [],
        _components: [],
        _prefab: { __id__: 2 },
        _opacity: 255,
        _color: { __type__: 'cc.Color', r: 255, g: 255, b: 255, a: 255 },
        _contentSize: { __type__: 'cc.Size', width: 0, height: 0 },
        _anchorPoint: { __type__: 'cc.Vec2', x: 0.5, y: 0.5 },
        _position: { __type__: 'cc.Vec2', x: 0, y: 0 },
    },
    {
        __type__: 'cc.PrefabInfo',
        root: { __id__: 1 },
        asset: { __uuid__: '00000000-0000-0000-0000-000000000000' },
        fileId: 'abc',
    },
];

/** Minimal Creator-3-style serialized prefab array (array + __version__ + _lpos). */
const native3xMinimal = [
    { __type__: 'cc.Prefab', __version__: 1, data: { __id__: 1 } },
    {
        __type__: 'cc.Node',
        __version__: 1,
        _name: 'Root',
        _lpos: { __type__: 'cc.Vec3', x: 10, y: 20, z: 5 },
        _parent: null,
        _children: [],
        _components: [],
        _prefab: { __id__: 2 },
    },
    {
        __type__: 'cc.PrefabInfo',
        root: { __id__: 1 },
        asset: { __uuid__: '00000000-0000-0000-0000-000000000000' },
        fileId: 'xx',
    },
];

function assert(cond, msg) {
    if (!cond) {
        console.error('FAIL:', msg);
        process.exit(1);
    }
}

assert(isCocos2xPrefabSerializedArray(minimal), 'minimal fixture should detect as 2.x prefab');

const t = to3xShape(minimal);
assert(t.data.expandedVec3Hints != null, 'to3xShape should include expandedVec3Hints');
const f = from3xShape(t.data);
assert(JSON.stringify(minimal) === JSON.stringify(f.data), 'minimal round-trip');

const json = execSync(
    'curl -fsSL "https://raw.githubusercontent.com/cocos-creator/cocos-tutorial-duang-sheep/master/assets/prefabs/PipeGroup.prefab"',
    { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
);
const arr = JSON.parse(json);
const t2 = to3xShape(arr);
const f2 = from3xShape(t2.data);
assert(JSON.stringify(arr) === JSON.stringify(f2.data), 'PipeGroup round-trip');

// —— Native 3.x → 2.x approx ——
assert(isLikelyNative3xSerializedPrefabArray(native3xMinimal), 'fixture should look like native 3.x');
const conv = native3xSerializedArrayTo2xApprox(native3xMinimal);
assert(conv.data.length === native3xMinimal.length, '3x→2x should preserve array length');
assert(!JSON.stringify(conv.data).includes('"__version__"'), '__version__ stripped');
const node = conv.data[1];
assert(node._position && node._position.__type__ === 'cc.Vec2', '_lpos mapped to _position');
assert(node._position.x === 10 && node._position.y === 20, 'vec2 xy');
assert(conv.warnings.some((w) => w.includes('lossy_position_z')), 'non-zero z should warn');

const blocked = [
    ...native3xMinimal,
    { __type__: 'cc.Animation', node: { __id__: 1 }, _enabled: true },
];
const blockedRes = native3xSerializedArrayTo2xApprox(blocked);
assert(blockedRes.data.length === 0, 'blocked conversion returns empty data');
assert(blockedRes.warnings.some((w) => w.startsWith('blocked_unsupported')), 'lossy rule: unsupported component');

// from3xShape native array path
const viaFrom = from3xShape(native3xMinimal);
assert(isCocos2xPrefabSerializedArray(viaFrom.data), 'from3xShape(native3x[]) yields 2.x-shaped array');

const dry = from3xShape(native3xMinimal, { dryRun: true });
assert(Array.isArray(dry.dryRunRecords) && dry.dryRunRecords.length > 0, 'dryRunRecords populated');

// Bridge round-trip after 3x→2x (not identity to native3x; sanity check structure)
const bridge = to3xShape(viaFrom.data);
assert(bridge.data.expandedVec3Hints != null, 'bridge after 3x import has vec3 hints');

console.log('prefab-format-2x verify: OK');

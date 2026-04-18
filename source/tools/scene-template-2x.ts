/**
 * Minimal Cocos Creator 2.x `.fire` scene template (same graph shape as a new
 * 2.4 Canvas scene). Used by `scene-tools.create_scene` on engine 2.x only.
 */

const BASE64_ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function newLocalId(): string {
    let s = '';
    for (let i = 0; i < 22; i++) {
        s += BASE64_ID_CHARS[Math.floor(Math.random() * BASE64_ID_CHARS.length)];
    }
    return s;
}

function walkAssignNewIds(node: unknown): void {
    if (node == null || typeof node !== 'object') {
        return;
    }
    if (Array.isArray(node)) {
        for (const item of node) {
            walkAssignNewIds(item);
        }
        return;
    }
    const o = node as Record<string, unknown>;
    if (typeof o._id === 'string') {
        o._id = newLocalId();
    }
    for (const k of Object.keys(o)) {
        walkAssignNewIds(o[k]);
    }
}

/** Serialized records for a basic Canvas + Camera scene (Creator 2.4.x). */
export const MINIMAL_2X_FIRE_TEMPLATE: unknown[] = [
    {
        __type__: 'cc.SceneAsset',
        _name: '',
        _objFlags: 0,
        _native: '',
        scene: { __id__: 1 },
    },
    {
        __type__: 'cc.Scene',
        _objFlags: 0,
        _parent: null,
        _children: [{ __id__: 2 }],
        _active: true,
        _components: [],
        _prefab: null,
        _opacity: 255,
        _color: { __type__: 'cc.Color', r: 255, g: 255, b: 255, a: 255 },
        _contentSize: { __type__: 'cc.Size', width: 0, height: 0 },
        _anchorPoint: { __type__: 'cc.Vec2', x: 0, y: 0 },
        _trs: {
            __type__: 'TypedArray',
            ctor: 'Float64Array',
            array: [0, 0, 0, 0, 0, 0, 1, 1, 1, 1],
        },
        _is3DNode: true,
        _groupIndex: 0,
        groupIndex: 0,
        autoReleaseAssets: false,
        _id: '74gwBDKT5MvJfjzyEUBVA3',
    },
    {
        __type__: 'cc.Node',
        _name: 'Canvas',
        _objFlags: 0,
        _parent: { __id__: 1 },
        _children: [{ __id__: 3 }],
        _active: true,
        _components: [{ __id__: 5 }, { __id__: 6 }],
        _prefab: null,
        _opacity: 255,
        _color: { __type__: 'cc.Color', r: 255, g: 255, b: 255, a: 255 },
        _contentSize: { __type__: 'cc.Size', width: 960, height: 640 },
        _anchorPoint: { __type__: 'cc.Vec2', x: 0.5, y: 0.5 },
        _trs: {
            __type__: 'TypedArray',
            ctor: 'Float64Array',
            array: [480, 320, 0, 0, 0, 0, 1, 1, 1, 1],
        },
        _eulerAngles: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 },
        _skewX: 0,
        _skewY: 0,
        _is3DNode: false,
        _groupIndex: 0,
        groupIndex: 0,
        _id: '12d7fmZTJPL4M8EigAess8',
    },
    {
        __type__: 'cc.Node',
        _name: 'Main Camera',
        _objFlags: 0,
        _parent: { __id__: 2 },
        _children: [],
        _active: true,
        _components: [{ __id__: 4 }],
        _prefab: null,
        _opacity: 255,
        _color: { __type__: 'cc.Color', r: 255, g: 255, b: 255, a: 255 },
        _contentSize: { __type__: 'cc.Size', width: 0, height: 0 },
        _anchorPoint: { __type__: 'cc.Vec2', x: 0.5, y: 0.5 },
        _trs: {
            __type__: 'TypedArray',
            ctor: 'Float64Array',
            array: [0, 0, 0, 0, 0, 0, 1, 1, 1, 1],
        },
        _eulerAngles: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 },
        _skewX: 0,
        _skewY: 0,
        _is3DNode: false,
        _groupIndex: 0,
        groupIndex: 0,
        _id: 'f0Jj/apKJN1afjSljUdJYI',
    },
    {
        __type__: 'cc.Camera',
        _name: '',
        _objFlags: 0,
        node: { __id__: 3 },
        _enabled: true,
        _cullingMask: 4294967295,
        _clearFlags: 7,
        _backgroundColor: { __type__: 'cc.Color', r: 0, g: 0, b: 0, a: 255 },
        _depth: -1,
        _zoomRatio: 1,
        _targetTexture: null,
        _fov: 60,
        _orthoSize: 10,
        _nearClip: 1,
        _farClip: 4096,
        _ortho: true,
        _rect: { __type__: 'cc.Rect', x: 0, y: 0, width: 1, height: 1 },
        _renderStages: 1,
        _alignWithScreen: true,
        _id: 'e52N0fvpRCoq6NFcuGEsAm',
    },
    {
        __type__: 'cc.Canvas',
        _name: '',
        _objFlags: 0,
        node: { __id__: 2 },
        _enabled: true,
        _designResolution: { __type__: 'cc.Size', width: 960, height: 640 },
        _fitWidth: false,
        _fitHeight: true,
        _id: '419dFAkEdACYfLOJqbxJmI',
    },
    {
        __type__: 'cc.Widget',
        _name: '',
        _objFlags: 0,
        node: { __id__: 2 },
        _enabled: true,
        alignMode: 1,
        _target: null,
        _alignFlags: 45,
        _left: 0,
        _right: 0,
        _top: 0,
        _bottom: 0,
        _verticalCenter: 0,
        _horizontalCenter: 0,
        _isAbsLeft: true,
        _isAbsRight: true,
        _isAbsTop: true,
        _isAbsBottom: true,
        _isAbsHorizontalCenter: true,
        _isAbsVerticalCenter: true,
        _originalWidth: 0,
        _originalHeight: 0,
        _id: 'd8go5/9XJKhpPaROoT46FD',
    },
];

export function buildNew2xFireSceneJson(sceneName: string): string {
    const records = JSON.parse(JSON.stringify(MINIMAL_2X_FIRE_TEMPLATE)) as unknown[];
    walkAssignNewIds(records);
    const head = records[0] as Record<string, unknown> | undefined;
    if (head && head.__type__ === 'cc.SceneAsset') {
        head._name = sceneName;
    }
    return JSON.stringify(records, null, 2);
}

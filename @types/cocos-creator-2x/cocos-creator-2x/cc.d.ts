/**
 * Minimal Cocos Creator 2.4.x engine (`cc`) stubs for scene scripts / runtime.
 * @see https://docs.cocos.com/creator/2.4/api/en/
 */

declare namespace cc {
    class Color {
        constructor(r?: number, g?: number, b?: number, a?: number);
        r: number;
        g: number;
        b: number;
        a: number;
    }

    class Vec2 {
        constructor(x?: number, y?: number);
        x: number;
        y: number;
    }

    class Vec3 {
        constructor(x?: number, y?: number, z?: number);
        x: number;
        y: number;
        z: number;
    }

    class Size {
        constructor(w?: number, h?: number);
        width: number;
        height: number;
    }

    class Node {
        uuid: string;
        name: string;
        parent: Node | null;
        children: Node[];
        active: boolean;
        x: number;
        y: number;
        width: number;
        height: number;
        scaleX: number;
        scaleY: number;
        rotation: number;
        opacity: number;
        anchorX: number;
        anchorY: number;
        color: Color;
        zIndex: number;
        _components: Component[];

        addChild(node: Node, zIndex?: number): void;
        removeChild(node: Node): void;
        removeFromParent(): void;
        destroyAllChildren(): void;
        destroy(): void;
        setPosition(posOrX: Vec2 | Vec3 | number, y?: number): void;
        getPosition(out?: Vec2 | Vec3): Vec2 | Vec3;
        setScale(x: number, y?: number): void;
        getScale(): Vec2;
        getComponent<T extends Component = Component>(type: { prototype: T } | string): T | null;
        addComponent<T extends Component = Component>(type: { new (): T } | string): T;
        removeComponent(comp: Component | string): void;
        getChildByName(name: string): Node | null;
        getChildByUuid(uuid: string): Node | null;
        getChildren(): Node[];
    }

    class Component {
        uuid: string;
        node: Node;
        enabled: boolean;
        name: string;
    }

    class Scene extends Node {}

    class Sprite extends Component {
        spriteFrame: SpriteFrame | null;
        type: number;
        sizeMode: number;
    }

    class SpriteFrame {}

    class Label extends Component {
        string: string;
        fontSize: number;
        lineHeight: number;
        horizontalAlign: number;
        verticalAlign: number;
        overflow: number;
        font: any;
    }

    class Canvas extends Component {}
    class Widget extends Component {
        isAlignTop: boolean;
        isAlignBottom: boolean;
        isAlignLeft: boolean;
        isAlignRight: boolean;
        top: number;
        bottom: number;
        left: number;
        right: number;
    }
    class Layout extends Component {}
    class Button extends Component {}
    class ScrollView extends Component {}
    class EditBox extends Component {}
    class RigidBody extends Component {}
    class BoxCollider extends Component {}
    class CircleCollider extends Component {}
    class PolygonCollider extends Component {}
    class Animation extends Component {}
    class AudioSource extends Component {}
    class ParticleSystem extends Component {}
    class Camera extends Component {}
    class Prefab {}

    namespace js {
        function getClassByName(className: string): any;
    }

    const director: {
        getScene(): Scene | null;
        loadScene(sceneName: string, onLaunched?: (err?: Error) => void): void;
        getRunningScene(): Scene | null;
    };

    function find(path: string, referenceNode?: Node): Node | null;
    function instantiate(original: Prefab | Node): Node;
}

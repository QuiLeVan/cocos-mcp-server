/**
 * Minimal Cocos Creator 2.4.x editor API stubs for the MCP extension.
 * @see https://docs.cocos.com/creator/2.4/api/en/
 */

declare namespace Editor {
    function log(msg: string): void;
    function warn(msg: string): void;
    function error(msg: string): void;
    function success(msg: string): void;

    /**
     * 3.x project API (also declared so shared tool code type-checks on the 2.x build).
     * On 2.x hosts the adapter may map these from `projectInfo` at runtime.
     */
    namespace Project {
        const name: string;
        const path: string;
        const uuid: string;
    }

    /** 2.x project metadata — used for engine version detection. */
    const projectInfo: { path: string; name: string } | undefined;

    /** Optional version hints (shape varies by editor build). */
    namespace App {
        const version: string | undefined;
    }
    const versions: { editor?: string } | undefined;

    namespace Panel {
        function extend(config: any): any;
    }

    namespace Scene {
        function callSceneScript(extensionName: string, method: string, args?: any): Promise<any>;
    }

    namespace Ipc {
        function on(channel: string, handler: (...args: any[]) => void): void;
        function removeListener(channel: string, handler: (...args: any[]) => void): void;
        /** Last argument may be a Node-style `cb(err, ...results)`. */
        function sendToPackage(pkg: string, method: string, ...args: any[]): void;
        /** Last argument may be a Node-style `cb(err, ...results)`. */
        function sendToMain(method: string, ...args: any[]): void;
        function sendToPanel(panel: string, method: string, ...args: any[]): void;
    }

    type AssetDbCallback<T = any> = (err: any, result?: T) => void;

    /** Use object type so `delete` / `import` are valid property names. */
    const assetdb: {
        queryAssets(pattern: string, type: string | null, cb: AssetDbCallback<any[]>): void;
        queryUrlByUuid(uuid: string, cb: AssetDbCallback<string>): void;
        queryUuidByUrl(url: string, cb: AssetDbCallback<string>): void;
        queryPathByUuid(uuid: string, cb: AssetDbCallback<string>): void;
        queryMetaInfoByUuid(uuid: string, cb: AssetDbCallback<any>): void;
        saveMeta(uuid: string, metaJson: string, cb: AssetDbCallback): void;
        create(url: string, data: any, cb: AssetDbCallback): void;
        delete(urls: string | string[], cb: AssetDbCallback): void;
        move(srcUrl: string, destUrl: string, cb: AssetDbCallback): void;
        refresh(url: string, cb: AssetDbCallback): void;
        import(rawfiles: string | string[], destUrl: string, cb: AssetDbCallback): void;
    };

    namespace Profile {
        function load(scope: string, name: string, schema?: any): any;
    }

    namespace remote {
        namespace App {
            const version: string;
        }
    }
}

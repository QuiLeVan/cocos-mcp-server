export type EngineMajor = 2 | 3;

/**
 * Detect the running Cocos Creator engine major version.
 *
 * Must be cheap and synchronous — runs once at extension load before any
 * adapter or tool is constructed (plan §2.3).
 *
 * Detection order:
 *   1. `Editor.Project.path`      → 3.x
 *   2. `Editor.projectInfo.path`  → 2.x
 *   3. `Editor.App.version` / `Editor.versions.editor` string prefix
 *   4. Default 3 (safer — matches current behavior for host processes
 *      that expose neither path, e.g. headless tooling).
 */
export function detectEngineMajor(): EngineMajor {
    const editor: any = (globalThis as any).Editor;
    if (!editor) {
        return 3;
    }

    const version: string =
        (typeof editor.App?.version === 'string' ? editor.App.version : '') ||
        (typeof editor.versions?.editor === 'string' ? editor.versions.editor : '');

    // Prefer explicit editor semver — Creator 2.4.x may also define `Editor.Project.path`
    // (deprecation bridge), which would incorrectly classify 2.x as 3 if checked first.
    if (version.startsWith('2.')) {
        return 2;
    }
    if (version.startsWith('3.')) {
        return 3;
    }

    if (typeof editor.Project?.path === 'string') {
        return 3;
    }
    if (typeof editor.projectInfo?.path === 'string') {
        return 2;
    }

    return 3;
}

// Module-level constant so downstream code can `import { ENGINE_MAJOR }`
// without re-running detection on every call site.
export const ENGINE_MAJOR: EngineMajor = detectEngineMajor();

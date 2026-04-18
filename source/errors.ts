/** Shared error codes for MCP tool / adapter responses. */
export const ErrorCodes = {
    ENGINE_UNSUPPORTED: 'ENGINE_UNSUPPORTED',
    UNSUPPORTED_ON_ENGINE_2: 'unsupported_on_engine_2',
    PREFAB_WRITE_REQUIRES_TRANSLATOR: 'prefab_write_requires_translator',
    PREFAB_CONVERSION_BLOCKED: 'prefab_conversion_blocked',
} as const;

/**
 * Thrown when a tool or adapter hits an editor/engine capability that does not
 * exist on the current host (used heavily by the 2.x adapter).
 */
export class EngineUnsupportedError extends Error {
    public readonly code = ErrorCodes.ENGINE_UNSUPPORTED;
    public readonly feature: string;
    public readonly engineMajor: 2 | 3;

    constructor(feature: string, engineMajor: 2 | 3) {
        super(`${ErrorCodes.UNSUPPORTED_ON_ENGINE_2}: ${feature}`);
        this.name = 'EngineUnsupportedError';
        this.feature = feature;
        this.engineMajor = engineMajor;
    }

    /** Shape MCP clients can parse alongside JSON-RPC errors. */
    toJSON(): Record<string, unknown> {
        return {
            success: false,
            error: this.message,
            code: this.code,
            feature: this.feature,
            engineMajor: this.engineMajor,
        };
    }
}

export function engineUnsupported(feature: string, engineMajor: 2 | 3 = 2): EngineUnsupportedError {
    return new EngineUnsupportedError(feature, engineMajor);
}

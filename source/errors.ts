/** Shared error codes for MCP tool / adapter responses. */
export const ErrorCodes = {
    ENGINE_UNSUPPORTED: 'ENGINE_UNSUPPORTED',
    UNSUPPORTED_ON_ENGINE_2: 'unsupported_on_engine_2',
    PREFAB_WRITE_REQUIRES_TRANSLATOR: 'prefab_write_requires_translator',
    PREFAB_CONVERSION_BLOCKED: 'prefab_conversion_blocked',
    INVALID_TARGET_NODE: 'invalid_target_node',
    REQUIRED_ARG_MISSING: 'required_arg_missing',
    TOOL_TIMEOUT: 'tool_timeout',
    ENGINE_UNSUPPORTED_OR_MISSING_OP_2X: 'engine_unsupported_or_missing_op_2x',
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

/** Thrown when a component-* tool is handed a UUID that is not a `cc.Node`. */
export class InvalidTargetNodeError extends Error {
    public readonly code = ErrorCodes.INVALID_TARGET_NODE;
    public readonly feature: string;
    public readonly uuid: string;
    public readonly reason: string;

    constructor(feature: string, uuid: string, reason: string) {
        super(`${ErrorCodes.INVALID_TARGET_NODE}: ${reason}`);
        this.name = 'InvalidTargetNodeError';
        this.feature = feature;
        this.uuid = uuid;
        this.reason = reason;
    }

    toJSON(): Record<string, unknown> {
        return {
            success: false,
            error: this.message,
            code: this.code,
            feature: this.feature,
            uuid: this.uuid,
            reason: this.reason,
        };
    }
}

export function invalidTargetNode(feature: string, uuid: string, reason = 'uuid-is-not-a-cc-node'): InvalidTargetNodeError {
    return new InvalidTargetNodeError(feature, uuid, reason);
}

/** Thrown by the pre-dispatch validator when a required argument is missing. */
export class RequiredArgMissingError extends Error {
    public readonly code = ErrorCodes.REQUIRED_ARG_MISSING;
    public readonly tool: string;
    public readonly field: string;

    constructor(tool: string, field: string) {
        super(`${ErrorCodes.REQUIRED_ARG_MISSING}: ${tool} requires '${field}'`);
        this.name = 'RequiredArgMissingError';
        this.tool = tool;
        this.field = field;
    }

    toJSON(): Record<string, unknown> {
        return {
            success: false,
            error: this.message,
            code: this.code,
            tool: this.tool,
            field: this.field,
        };
    }
}

export function requiredArgMissing(tool: string, field: string): RequiredArgMissingError {
    return new RequiredArgMissingError(tool, field);
}

/** Thrown by the soft-timeout wrapper when a tool exceeds its wall-clock budget. */
export class ToolTimeoutError extends Error {
    public readonly code = ErrorCodes.TOOL_TIMEOUT;
    public readonly tool: string;
    public readonly softTimeoutMs: number;

    constructor(tool: string, softTimeoutMs: number) {
        super(`${ErrorCodes.TOOL_TIMEOUT}: ${tool} exceeded ${softTimeoutMs}ms`);
        this.name = 'ToolTimeoutError';
        this.tool = tool;
        this.softTimeoutMs = softTimeoutMs;
    }

    toJSON(): Record<string, unknown> {
        return {
            success: false,
            error: this.message,
            code: this.code,
            tool: this.tool,
            softTimeoutMs: this.softTimeoutMs,
        };
    }
}

export function toolTimeout(tool: string, softTimeoutMs: number): ToolTimeoutError {
    return new ToolTimeoutError(tool, softTimeoutMs);
}

const ADAPTER_ERROR_RE = /^(unsupported_scene_op_2x|unknown_scene_op_2x|unsupported_ipc_module_2x|unknown_asset_db_op_2x|execute_scene_script_foreign_package_2x|unknown_preferences_op_2x|snapshot_abort_not_supported_2x|preferences_open_settings_not_supported_2x):/;

/**
 * Predicate used by REST + JSON-RPC envelopes to decide whether a thrown error
 * is a structured tool-level outcome (return HTTP 200 + body) or an unexpected
 * server-side exception (return HTTP 5xx).
 */
export function isExpectedToolError(e: unknown): boolean {
    if (e instanceof EngineUnsupportedError) return true;
    if (e instanceof InvalidTargetNodeError) return true;
    if (e instanceof RequiredArgMissingError) return true;
    if (e instanceof ToolTimeoutError) return true;
    if (e instanceof Error) {
        return ADAPTER_ERROR_RE.test(e.message);
    }
    return false;
}

/** Build a structured body for the REST / JSON-RPC response when `isExpectedToolError(e)` is true. */
export function expectedErrorToBody(e: unknown, tool: string): Record<string, unknown> {
    if (e instanceof EngineUnsupportedError) {
        return { ...e.toJSON(), tool };
    }
    if (e instanceof InvalidTargetNodeError) {
        return { ...e.toJSON(), tool };
    }
    if (e instanceof RequiredArgMissingError) {
        return { ...e.toJSON() };
    }
    if (e instanceof ToolTimeoutError) {
        return { ...e.toJSON() };
    }
    const msg = e instanceof Error ? e.message : String(e);
    // Adapter string errors: parse "<prefix>: <feature>"
    const colon = msg.indexOf(':');
    const prefix = colon >= 0 ? msg.slice(0, colon) : msg;
    const feature = colon >= 0 ? msg.slice(colon + 1).trim() : '';
    return {
        success: false,
        error: msg,
        code: ErrorCodes.ENGINE_UNSUPPORTED_OR_MISSING_OP_2X,
        feature,
        adapterPrefix: prefix,
        tool,
    };
}

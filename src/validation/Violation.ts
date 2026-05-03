export class Violation {
    readonly path: string;
    readonly constraintCode: string;
    readonly code: string;
    readonly message?: string;
    readonly params?: Record<string, unknown>;
    readonly cause?: unknown;

    public constructor(path: string, constraintCode: string, code: string, message?: string, params?: Record<string, unknown>, cause?: unknown) {
        this.path = path;
        this.constraintCode = constraintCode;
        this.code = code;
        this.message = message;
        this.params = params;
        this.cause = cause;
    }
}
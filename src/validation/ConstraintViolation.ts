export type ConstraintViolation = {
    errorCode: string
    message?: string
    params?: Record<string, unknown>
    cause?: unknown
    path?: string
}
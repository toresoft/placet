export type ConstraintViolation = {
    code: string
    message?: string
    params?: Record<string, unknown>
    cause?: unknown
    path?: string
}
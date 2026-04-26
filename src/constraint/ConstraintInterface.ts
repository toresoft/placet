import {TypeKind} from "./TypeKind";

export interface ConstraintInterface<T = unknown> {
    readonly code: string;
    readonly errorCodes: readonly string[];
    readonly handledTypes: readonly TypeKind[];
    readonly groups: readonly string[];
    validate(value: T): Promise<void>;
}
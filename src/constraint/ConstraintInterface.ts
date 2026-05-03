import {TypeKind} from "./TypeKind";
import {ConstraintContext} from "../context/ConstraintContext";

export interface ConstraintInterface<T = unknown> {
    readonly code: string;
    readonly errorCodes: ReadonlySet<string>;
    readonly handledTypes: ReadonlySet<TypeKind>;
    readonly groups: ReadonlySet<string>;
    validate(value: T, context: ConstraintContext): Promise<void>;
}
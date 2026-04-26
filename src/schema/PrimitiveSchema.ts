import {Schema} from "./Schema";
import {ConstraintInterface} from "../constraint/ConstraintInterface";

export class PrimitiveSchema<T> extends Schema<T>{
    constructor(constraints: readonly ConstraintInterface<T>[] = []) {
        super(constraints);
    }
}

export function primitive<T>(...constraints: ConstraintInterface<T>[]): PrimitiveSchema<T> {
    return new PrimitiveSchema<T>(constraints);
}
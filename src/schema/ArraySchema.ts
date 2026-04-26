import {Schema} from "./Schema";
import {ConstraintInterface} from "../constraint/ConstraintInterface";

export class ArraySchema<T extends unknown[]> extends Schema<T> {
    readonly itemSchema: Schema<T[number]>;
    constructor(itemSchema: Schema<T[number]>, constraints: readonly ConstraintInterface<T>[] = []) {
        super(constraints);
        this.itemSchema = itemSchema;
    }
}

export function array<U>(itemSchema: Schema<U>, ...constraints: ConstraintInterface<U[]>[]): ArraySchema<U[]> {
    return new ArraySchema<U[]>(itemSchema, constraints);
}
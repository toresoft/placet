import {ConstraintInterface} from "../constraint/ConstraintInterface";

declare const TypeMarker: unique symbol;
export abstract class Schema<T> {
    readonly [TypeMarker]!: T;
    readonly constraints: readonly ConstraintInterface<T>[];

    protected constructor(constraints: readonly ConstraintInterface<T>[] = []) {
        this.constraints = constraints;
    }
}
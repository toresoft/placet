import {Schema} from "./Schema";
import {ConstraintInterface} from "../constraint/ConstraintInterface";

export type ObjectProperties<T extends object> = {
    readonly [K in keyof T]-?: Schema<
        undefined extends T[K] ? T[K] : T[K] | (object extends Pick<T, K> ? undefined : never)
    >;
};

export class ObjectSchema<T extends object> extends Schema<T> {
    readonly properties: ObjectProperties<T>;
    constructor(properties: ObjectProperties<T>, constraints: readonly ConstraintInterface<T>[] = []) {
        super(constraints);
        this.properties = properties;
    }
}

export function object<T extends object>(properties: ObjectProperties<T>, ...constraints: ConstraintInterface<T>[]): ObjectSchema<T> {
    return new ObjectSchema<T>(properties, constraints);
}
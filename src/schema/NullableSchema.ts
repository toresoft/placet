import {Schema} from "./Schema";

export class NullableSchema<T> extends Schema<T | null> {
    readonly innerSchema: Schema<T>;
    constructor(innerSchema: Schema<T>) {
        super();
        this.innerSchema = innerSchema;
    }
}

export function nullable<T>(innerSchema: Schema<T>): NullableSchema<T> {
    return new NullableSchema(innerSchema)
}
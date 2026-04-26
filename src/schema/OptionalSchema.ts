import {Schema} from "./Schema";

export class OptionalSchema<T> extends Schema<T | undefined> {
    readonly innerSchema: Schema<T>;
    constructor(innerSchema: Schema<T>) {
        super();
        this.innerSchema = innerSchema;
    }
}

export function optional<T>(innerSchema: Schema<T>): OptionalSchema<T> {
    return new OptionalSchema(innerSchema)
}
import {Schema} from "./Schema";

export class OptionalSchema<T> extends Schema<T> {
    readonly innerSchema: Schema<notUndefined<T>>;
    constructor(innerSchema: Schema<notUndefined<T>>) {
        super();
        this.innerSchema = innerSchema;
    }
}

export function optional<T>(innerSchema: Schema<notUndefined<T>>): OptionalSchema<T> {
    return new OptionalSchema(innerSchema)
}

type notUndefined<T> = Exclude<T, undefined>;
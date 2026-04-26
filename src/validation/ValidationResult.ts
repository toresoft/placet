import {ValidationError} from "./ValidationError";

export class ValidationResult {
    readonly errors: ValidationError[];
    readonly valid: boolean;
    constructor(errors: ValidationError[], valid: boolean) {
        this.errors = errors;
        this.valid = valid;
    }
}
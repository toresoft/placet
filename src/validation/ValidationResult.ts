import {Violation} from "./Violation";
import {SkippedConstraint} from "./SkippedConstraint";

export class ValidationResult {
    readonly violations: Violation[];
    readonly valid: boolean;
    readonly skipped: SkippedConstraint[];
    constructor(violations: Violation[], skipped: SkippedConstraint[]) {
        this.violations = violations;
        this.valid = violations.length === 0;
        this.skipped = skipped;
    }
}
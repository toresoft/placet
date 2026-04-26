import {SkipReason} from "./SkipReason";

export class SkippedConstraint {
    readonly path: string;
    readonly constraintCode: string;
    readonly reason: SkipReason

    constructor(path: string, constraintCode: string, reason: SkipReason) {
        this.path = path;
        this.constraintCode = constraintCode;
        this.reason = reason;
    }
}
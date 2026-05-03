import {Violation} from "../validation/Violation";

export class SharedState {
    readonly root: unknown;
    readonly groups: ReadonlySet<string>;
    readonly custom: unknown;
    private readonly _violations: Violation[] = [];

    constructor(root: unknown, groups: ReadonlySet<string> = new Set(), custom: unknown = null) {
        this.root = root;
        this.groups = groups;
        this.custom = custom;
    }

    public addViolation(violation: Violation): void {
        this._violations.push(violation);
    }

    public get violations(): readonly Violation[] {
        return this._violations;
    }
}
import {ConstraintContext} from "./ConstraintContext";
import {Location} from "./Location";
import {Violation} from "../validation/Violation";
import {ConstraintViolation} from "../validation/ConstraintViolation";
import {SharedState} from "./SharedState";
import {IllegalStateError} from "../exception/IllegalStateError";
import {PropertyAccessor} from "./PropertyAccessor";
import {isValidJsIdentifier} from "../lib/helper";

export class ValidationContext implements ConstraintContext {
    readonly location: Location;
    readonly parent: unknown;
    readonly path: string;

    private readonly shared: SharedState;
    private readonly constraintCode: string | undefined;

    private constructor(path: string,
                        location: Location,
                        shared: SharedState,
                        parent?: unknown,
                        constraintCode?: string) {
        this.path = path;
        this.location = location;
        this.shared = shared;
        this.parent = parent;
        this.constraintCode = constraintCode;
    }

    addViolation(constraintViolation: ConstraintViolation): void {
        if(undefined === this.constraintCode) {
            throw new IllegalStateError('addViolation called outside a constraint binding!')
        }
        this.shared.addViolation(this.createViolation(this.constraintCode, this.path, constraintViolation));
    }

    get(path: string): unknown;
    get<T>(path: string): T | undefined;
    get(path: string): unknown {
        return PropertyAccessor.get(this.shared.root, path);
    }

    get root(): unknown {
        return this.shared.root;
    }

    get custom(): unknown {
        return this.shared.custom;
    }

    get violations(): readonly Violation[] {
        return this.shared.violations;
    }

    get groups(): ReadonlySet<string> {
        return this.shared.groups;
    }

    static createRoot(root: unknown,
                      options?: {custom?: unknown, groups?: ReadonlySet<string>}): ValidationContext {
        const shared = new SharedState(root, options?.groups, options?.custom);
        return new ValidationContext('$', {kind: 'root'}, shared);
    }

    withChild(location: Extract<Location, { kind: 'array' | 'object' }>,
              parent: unknown): ValidationContext {
        const childPath: string = this.computePath(location);
        return new ValidationContext(childPath, location, this.shared, parent);
    }

    forConstraint(constraintCode: string): ValidationContext {
        return new ValidationContext(this.path, this.location, this.shared, this.parent, constraintCode);
    }

    private computePath(location: Extract<Location, { kind: 'array' | 'object' }>): string {
        if (location.kind === 'array') {
            return `${this.path}[${location.index}]`;
        }
        if(isValidJsIdentifier(location.key)) {
            return `${this.path}.${location.key}`;
        } else {
            return `${this.path}.[${location.key}]`;
        }
    }

    private createViolation(constraintCode: string, path: string, constraintViolation: ConstraintViolation): Violation {
        return new Violation(
            constraintViolation.path ?? path,
            constraintCode,
            constraintViolation.code,
            constraintViolation.message,
            constraintViolation.params,
            constraintViolation.cause
        );
    }

}
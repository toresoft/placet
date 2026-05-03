import {SelectorContext} from "./SelectorContext";
import {ConstraintViolation} from "../validation/ConstraintViolation";

export interface ConstraintContext extends SelectorContext {
    addViolation(violation: ConstraintViolation): void
}
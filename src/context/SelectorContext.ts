import {Location} from "./Location";
import {Violation} from "../validation/Violation";

export interface SelectorContext {
    readonly path: string;
    readonly root: unknown;
    readonly parent: unknown;
    readonly location: Location;
    readonly groups: ReadonlySet<string>;
    readonly custom: unknown;

    get violations(): readonly Violation[];

    get(path: string): unknown;
    get<T>(path: string): T | undefined;
}
export function isValidJsIdentifier(s: string): boolean {
    return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(s);
}
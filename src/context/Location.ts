export type Location =
    | { readonly kind: 'root' }
    | { readonly kind: 'object', readonly key: string }
    | { readonly kind: 'array', readonly index: number }
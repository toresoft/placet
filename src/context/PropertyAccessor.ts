import {LRUCache} from "../lib/LRUCache";

type TokenizeResult =
    | { ok: true; tokens: readonly Token[] }
    | { ok: false; errors: readonly { readonly position: number; readonly char: string, readonly message: string}[] };

type Token = {
    readonly type: TokenType,
    readonly value: string|number
}

enum TokenType {
    ROOT = 'root',
    PROPERTY = 'property',
    INDEX = 'index'
}

const patternPieces: readonly string[] = [
    String.raw`(?<root>^\$)`,                             // 1. Simbolo root iniziale: $
    String.raw`(?:\.(?<dotProp>[a-zA-Z0-9_$]+))`,         // 2. Dot notation: .field
    String.raw`(?:\["(?<bracketDouble>[^"]+)"\])`,        // 3. Bracket con doppi apici: ["field"]
    String.raw`(?:\['(?<bracketSingle>[^']+)'\])`,        // 4. Bracket con singoli apici: ['field']
    String.raw`(?:\[(?<index>\d+)\])`,                    // 5. Indice numerico di array: [0]
    String.raw`(?<invalid>[\s\S])`,                       // ← qualunque char non riconosciuto
];

const pattern: RegExp = new RegExp(patternPieces.join('|'), 'g');
const cache = new LRUCache<string, readonly Token[]>(1024);

export class PropertyAccessor {
    public static get(data: unknown, path: string): unknown {
        const tokens = PropertyAccessor.getTokens(path);
        let current: unknown = data;
        for(const token of tokens) {
            if(token.type === TokenType.ROOT) {
                current = data;
                continue;
            }
            if(current === null || current === undefined) {
                return undefined;
            }
            current = (current as any)[token.value];
        }
        return current;
    }

    private static getTokens(path: string): readonly Token[] {
        if(cache.has(path)) {
            return cache.get(path)!;
        }
        const tokenizeResult = PropertyAccessor.tokenizer(path);
        if (!tokenizeResult.ok) {
            throw new Error(tokenizeResult.errors.map(e => e.message).join('; '));
        }
        cache.set(path, tokenizeResult.tokens);
        return tokenizeResult.tokens;
    }

    private static tokenizer(path: string): TokenizeResult {
        const tokens: Token[] = [];
        const errors: { readonly position: number; readonly char: string, readonly message: string}[] = [];
        for (const match of path.matchAll(pattern)) {
            const {groups} = match;
            if (groups === undefined) {
                continue;
            }
            if (groups.invalid !== undefined) {
                errors.push({
                    position: match.index,
                    char: groups.invalid,
                    message: `Invalid path "${path}": unexpected character '${groups.invalid}' at position ${match.index}`});
                continue
            }
            if (groups.root) {
                tokens.push({type: TokenType.ROOT, value: groups.root});
            } else if (groups.dotProp) {
                tokens.push({type: TokenType.PROPERTY, value: groups.dotProp});
            } else if (groups.bracketDouble || groups.bracketSingle) {
                // Uniamo la logica per i singoli e doppi apici
                tokens.push({type: TokenType.PROPERTY, value: groups.bracketDouble || groups.bracketSingle});
            } else if (groups.index) {
                tokens.push({type: TokenType.INDEX, value: parseInt(groups.index, 10)});
            }
        }
        if (tokens.length === 0 || tokens[0].type !== TokenType.ROOT) {
            errors.push({position: 0, char: path, message: `Invalid path "${path}": must start with '$'`});
        }
        if (errors.length > 0) {
            return {ok: false, errors: errors};
        }
        return {ok: true, tokens: tokens};
    }
}

export class LRUCache<K, V> {
    public readonly capacity: number;
    private buffer: Map<K, V> = new Map<K, V>();

    constructor(capacity: number) {
        if(capacity <= 0) throw new Error('Size must be greater than 0');
        this.capacity = capacity;
    }

    get(key: K): V | undefined {
        const value: V | undefined = this.buffer.get(key);
        if(value !== undefined) {
            this.buffer.delete(key);
            this.buffer.set(key, value);
        }
        return value;
    }

    set(key: K, value: V): void {
        if(this.buffer.has((key))) {
            this.buffer.delete(key);
        } else if(this.buffer.size >= this.capacity) {
            this.buffer.delete(this.buffer.keys().next().value as K);
        }
        this.buffer.set(key, value);
    }

    clear(): void {
        this.buffer.clear();
    }

    has(key: K): boolean {
        return this.buffer.has(key);
    }

    size(): number {
        return this.buffer.size;
    }
}
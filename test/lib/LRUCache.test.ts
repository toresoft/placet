import { describe, it, expect, beforeEach } from 'vitest';
import { LRUCache } from '../../src/lib/LRUCache';

describe('LRUCache', () => {
  let cache: LRUCache<string, number>;

  beforeEach(() => {
    cache = new LRUCache<string, number>(3);
  });

  describe('constructor', () => {
    it('should throw error when capacity is zero', () => {
      expect(() => new LRUCache(0)).toThrow('Size must be greater than 0');
    });

    it('should throw error when capacity is negative', () => {
      expect(() => new LRUCache(-1)).toThrow('Size must be greater than 0');
    });

    it('should accept capacity of 1', () => {
      expect(() => new LRUCache(1)).not.toThrow();
    });

    it('should store capacity value', () => {
      const cache = new LRUCache<string, number>(5);
      expect(cache.capacity).toBe(5);
    });
  });

  describe('set and get', () => {
    it('should store and retrieve a value', () => {
      cache.set('key', 42);
      expect(cache.get('key')).toBe(42);
    });

    it('should return undefined for non-existent key', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should update existing key and move it to most recent', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('a', 10); // Update 'a'
      expect(cache.get('a')).toBe(10);
    });

    it('should move accessed key to most recent position', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.get('a'); // Access 'a' to make it most recent
      cache.set('d', 4); // Should evict 'b' (LRU after access)

      expect(cache.has('b')).toBe(false);
      expect(cache.has('a')).toBe(true);
      expect(cache.has('c')).toBe(true);
      expect(cache.has('d')).toBe(true);
    });
  });

  describe('eviction', () => {
    it('should evict least recently used entry when over capacity', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.set('d', 4); // Should evict 'a'

      expect(cache.has('a')).toBe(false);
      expect(cache.has('b')).toBe(true);
      expect(cache.has('c')).toBe(true);
      expect(cache.has('d')).toBe(true);
    });

    it('should not evict if within capacity', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      expect(cache.size()).toBe(3);
      expect(cache.has('a')).toBe(true);
      expect(cache.has('b')).toBe(true);
      expect(cache.has('c')).toBe(true);
    });

    it('should evict LRU after get operation', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.get('a'); // Access 'a' to make it most recent
      cache.set('d', 4); // Should evict 'b' (LRU after access)

      expect(cache.has('b')).toBe(false);
      expect(cache.has('a')).toBe(true);
      expect(cache.has('c')).toBe(true);
      expect(cache.has('d')).toBe(true);
    });

    it('should evict LRU after set operation on existing key', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.set('a', 10); // Re-set 'a' makes it most recent
      cache.set('d', 4); // Should evict 'b' (LRU)

      expect(cache.has('b')).toBe(false);
      expect(cache.has('a')).toBe(true);
      expect(cache.has('c')).toBe(true);
      expect(cache.has('d')).toBe(true);
    });
  });

  describe('has', () => {
    it('should return true for existing key', () => {
      cache.set('a', 1);
      expect(cache.has('a')).toBe(true);
    });

    it('should return false for non-existent key', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should return false after key is evicted', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.set('d', 4); // Evicts 'a'
      expect(cache.has('a')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.clear();

      expect(cache.size()).toBe(0);
      expect(cache.has('a')).toBe(false);
      expect(cache.has('b')).toBe(false);
    });

    it('should result in empty cache', () => {
      cache.set('a', 1);
      cache.clear();
      expect(cache.get('a')).toBeUndefined();
    });
  });

  describe('size', () => {
    it('should return 0 for empty cache', () => {
      expect(cache.size()).toBe(0);
    });

    it('should return correct size after adding entries', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      expect(cache.size()).toBe(2);
    });

    it('should return capacity when full', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      expect(cache.size()).toBe(3);
    });

    it('should not exceed capacity', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.set('d', 4);
      cache.set('e', 5);
      expect(cache.size()).toBe(3);
    });
  });

  describe('edge cases', () => {
    it('should handle capacity of 1', () => {
      const singleCache = new LRUCache<string, number>(1);
      singleCache.set('a', 1);
      expect(singleCache.get('a')).toBe(1);
      expect(singleCache.size()).toBe(1);

      singleCache.set('b', 2);
      expect(singleCache.has('a')).toBe(false);
      expect(singleCache.has('b')).toBe(true);
      expect(singleCache.size()).toBe(1);
    });

    it('should handle duplicate set to same key', () => {
      cache.set('a', 1);
      cache.set('a', 2);
      expect(cache.size()).toBe(1);
      expect(cache.get('a')).toBe(2);
    });
  });
});
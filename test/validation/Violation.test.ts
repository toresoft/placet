import {describe, expect, it} from 'vitest';
import {Violation} from '../../src/validation/Violation';

describe('Violation', () => {
  describe('constructor', () => {

    it('should store path', () => {
      const violation = new Violation('user.email', 'REQUIRED', 'required');
      expect(violation.path).toBe('user.email');
    });

    it('should store constraintCode', () => {
      const violation = new Violation('user.email', 'REQUIRED', 'required');
      expect(violation.constraintCode).toBe('REQUIRED');
    });

    it('should store code', () => {
      const violation = new Violation('user.email', 'REQUIRED', 'required');
      expect(violation.code).toBe('required');
    });

    it('should store optional message when provided', () => {
      const violation = new Violation('user.email', 'REQUIRED', 'required', 'Field is required');
      expect(violation.message).toBe('Field is required');
    });

    it('should have undefined message when not provided', () => {
      const violation = new Violation('user.email', 'REQUIRED', 'required');
      expect(violation.message).toBeUndefined();
    });

    it('should store optional params when provided', () => {
      const params = {min: 1, max: 100};
      const violation = new Violation('user.age', 'RANGE', 'out-of-range', 'Must be between 1 and 100', params);
      expect(violation.params).to.deep.equal({min: 1, max: 100});
    });

    it('should have undefined params when not provided', () => {
      const violation = new Violation('user.email', 'REQUIRED', 'required');
      expect(violation.params).toBeUndefined();
    });

    it('should store optional cause when provided', () => {
      const cause = new Error('connection failed');
      const violation = new Violation('user.email', 'REQUIRED', 'required', 'Field is required', undefined, cause);
      expect(violation.cause).toBe(cause);
    });

    it('should have undefined cause when not provided', () => {
      const violation = new Violation('user.email', 'REQUIRED', 'required');
      expect(violation.cause).toBeUndefined();
    });
  });

  describe('immutability', () => {

    it('should store all values correctly', () => {
      const cause = new Error('test');
      const params = {min: 5};
      const violation = new Violation('path', 'CONSTRAINT', 'code', 'message', params, cause);

      expect(violation.path).toBe('path');
      expect(violation.constraintCode).toBe('CONSTRAINT');
      expect(violation.code).toBe('code');
      expect(violation.message).toBe('message');
      expect(violation.params).to.deep.equal({min: 5});
      expect(violation.cause).toBe(cause);
    });
  });
});
import { describe, it, expect } from 'vitest';
import { SkippedConstraint } from '../../src/validation/SkippedConstraint';
import { SkipReason } from '../../src/validation/SkipReason';

describe('SkippedConstraint', () => {
  describe('constructor', () => {
    it('should store path', () => {
      const skipped = new SkippedConstraint('user.email', 'EMAIL_CONSTRAINT', SkipReason.CHAIN_PREVIOUS_FAILED);
      expect(skipped.path).toBe('user.email');
    });

    it('should store constraint code', () => {
      const skipped = new SkippedConstraint('field', 'REQUIRED', SkipReason.CHAIN_PREVIOUS_FAILED);
      expect(skipped.constraintCode).toBe('REQUIRED');
    });

    it('should store skip reason', () => {
      const reason = SkipReason.CHAIN_PREVIOUS_FAILED;
      const skipped = new SkippedConstraint('field', 'CODE', reason);
      expect(skipped.reason).toBe(reason);
    });
  });

  describe('skip reasons', () => {
    it('should handle CHAIN_PREVIOUS_FAILED', () => {
      const skipped = new SkippedConstraint(
        'field',
        'CONSTRAINT',
        SkipReason.CHAIN_PREVIOUS_FAILED
      );
      expect(skipped.reason).toBe(SkipReason.CHAIN_PREVIOUS_FAILED);
      expect(skipped.reason).toBe('chain-previous-failed');
    });

    it('should handle CONDITIONAL_NOT_MATCH', () => {
      const skipped = new SkippedConstraint(
        'field',
        'CONSTRAINT',
        SkipReason.CONDITIONAL_NOT_MATCH
      );
      expect(skipped.reason).toBe(SkipReason.CONDITIONAL_NOT_MATCH);
      expect(skipped.reason).toBe('conditional-no-match');
    });
  });

  describe('immutability', () => {
    it('should store values correctly', () => {
      const skipped = new SkippedConstraint('path', 'CODE', SkipReason.CHAIN_PREVIOUS_FAILED);
      
      expect(skipped.path).toBe('path');
      expect(skipped.constraintCode).toBe('CODE');
      expect(skipped.reason).toBe(SkipReason.CHAIN_PREVIOUS_FAILED);
    });
  });
});
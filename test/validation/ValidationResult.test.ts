import {describe, expect, it} from 'vitest';
import {ValidationResult} from '../../src/validation/ValidationResult';
import {SkippedConstraint} from '../../src/validation/SkippedConstraint';
import {SkipReason} from '../../src/validation/SkipReason';
import {Violation} from "../../src/validation/Violation";

describe('ValidationResult', () => {
  describe('valid', () => {

    it('should be true when no violations and no skipped constraints', () => {
      const validationResult = new ValidationResult([], []);
      expect(validationResult.valid).to.equal(true);
    })

    it('should be true when no violations but has skipped constraints', () => {
      const validationResult = new ValidationResult([], [
          new SkippedConstraint('path', 'code', SkipReason.CHAIN_PREVIOUS_FAILED)
      ]);
      expect(validationResult.valid).to.equal(true);
    });

    it('should be false when has violations', () => {
      const validationResult = new ValidationResult([
          new Violation('path', 'constraint-code', 'code')
      ], []);
      expect(validationResult.valid).to.equal(false);
    });
  });

  describe('violations', () => {

    it('should expose the provided violations', () => {
      const violation = new Violation('user.email', 'REQUIRED', 'required');
      const validationResult = new ValidationResult([violation], []);
      expect(validationResult.violations).to.deep.equal([violation]);
    });

    it('should expose an empty array when no violations are provided', () => {
      const validationResult = new ValidationResult([], []);
      expect(validationResult.violations).to.deep.equal([]);
    });

    it('should expose multiple violations in order', () => {
      const v1 = new Violation('name', 'REQUIRED', 'required');
      const v2 = new Violation('email', 'FORMAT', 'invalid-format');
      const validationResult = new ValidationResult([v1, v2], []);
      expect(validationResult.violations).to.deep.equal([v1, v2]);
    });
  });

  describe('skipped', () => {

    it('should expose the provided skipped constraints', () => {
      const skipped = new SkippedConstraint('path', 'code', SkipReason.CHAIN_PREVIOUS_FAILED);
      const validationResult = new ValidationResult([], [skipped]);
      expect(validationResult.skipped).to.deep.equal([skipped]);
    });

    it('should expose an empty array when no skipped constraints are provided', () => {
      const validationResult = new ValidationResult([], []);
      expect(validationResult.skipped).to.deep.equal([]);
    });

    it('should expose multiple skipped constraints in order', () => {
      const s1 = new SkippedConstraint('name', 'REQUIRED', SkipReason.CHAIN_PREVIOUS_FAILED);
      const s2 = new SkippedConstraint('email', 'FORMAT', SkipReason.CONDITIONAL_NOT_MATCH);
      const validationResult = new ValidationResult([], [s1, s2]);
      expect(validationResult.skipped).to.deep.equal([s1, s2]);
    });
  });
});
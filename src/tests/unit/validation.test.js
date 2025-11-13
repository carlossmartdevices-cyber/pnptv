/**
 * Validation Utilities Tests
 */

import {
  isValidEmail,
  sanitizeText,
  sanitizeUsername,
  isValidLocation,
  isValidPlan,
  isValidPaymentAmount,
} from '../../utils/validation.js';

describe('Validation Utilities', () => {
  describe('isValidEmail', () => {
    test('should validate correct email', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name+tag@example.co.uk')).toBe(true);
    });

    test('should reject invalid email', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
    });
  });

  describe('sanitizeText', () => {
    test('should remove HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = sanitizeText(input);
      expect(result).toBe('Hello');
    });

    test('should limit length', () => {
      const longText = 'a'.repeat(2000);
      const result = sanitizeText(longText, 100);
      expect(result.length).toBe(100);
    });

    test('should remove javascript: protocol', () => {
      const input = 'javascript:alert("xss")';
      const result = sanitizeText(input);
      expect(result).not.toContain('javascript:');
    });
  });

  describe('sanitizeUsername', () => {
    test('should remove @ symbol', () => {
      expect(sanitizeUsername('@username')).toBe('username');
    });

    test('should remove special characters', () => {
      expect(sanitizeUsername('user@#$name')).toBe('username');
    });

    test('should limit to 32 characters', () => {
      const longUsername = 'a'.repeat(50);
      const result = sanitizeUsername(longUsername);
      expect(result.length).toBe(32);
    });
  });

  describe('isValidLocation', () => {
    test('should validate correct coordinates', () => {
      expect(isValidLocation(40.7128, -74.006)).toBe(true);
      expect(isValidLocation(0, 0)).toBe(true);
    });

    test('should reject invalid coordinates', () => {
      expect(isValidLocation(91, 0)).toBe(false);
      expect(isValidLocation(0, 181)).toBe(false);
      expect(isValidLocation('40.7128', '-74.006')).toBe(false);
    });
  });

  describe('isValidPlan', () => {
    test('should validate correct plans', () => {
      expect(isValidPlan('basic')).toBe(true);
      expect(isValidPlan('premium')).toBe(true);
      expect(isValidPlan('gold')).toBe(true);
    });

    test('should reject invalid plans', () => {
      expect(isValidPlan('platinum')).toBe(false);
      expect(isValidPlan('')).toBe(false);
    });
  });

  describe('isValidPaymentAmount', () => {
    test('should validate correct payment amounts', () => {
      expect(isValidPaymentAmount(9.99, 'basic')).toBe(true);
      expect(isValidPaymentAmount(19.99, 'premium')).toBe(true);
      expect(isValidPaymentAmount(29.99, 'gold')).toBe(true);
    });

    test('should reject incorrect amounts', () => {
      expect(isValidPaymentAmount(10.00, 'basic')).toBe(false);
      expect(isValidPaymentAmount(5.00, 'basic')).toBe(false);
    });
  });
});

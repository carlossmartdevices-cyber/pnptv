/**
 * Webhook Validator Tests
 */

import {
  validateDaimoSignature,
  validateEPaycoSignature,
  validateHmacSignature,
  validateTimestamp,
} from '../../utils/webhookValidator.js';
import crypto from 'crypto';

describe('Webhook Validator', () => {
  const testSecret = 'test_secret_key_12345';

  describe('validateDaimoSignature', () => {
    it('should validate correct Daimo signature', () => {
      const payload = { amount: 100, currency: 'USDC', userId: '12345' };
      const payloadString = JSON.stringify(payload);
      const hmac = crypto.createHmac('sha256', testSecret);
      hmac.update(payloadString);
      const signature = hmac.digest('hex');

      const result = validateDaimoSignature(payload, signature, testSecret);
      expect(result).toBe(true);
    });

    it('should reject invalid signature', () => {
      const payload = { amount: 100, currency: 'USDC', userId: '12345' };
      const invalidSignature = 'invalid_signature_12345';

      const result = validateDaimoSignature(payload, invalidSignature, testSecret);
      expect(result).toBe(false);
    });

    it('should reject tampered payload', () => {
      const payload = { amount: 100, currency: 'USDC', userId: '12345' };
      const payloadString = JSON.stringify(payload);
      const hmac = crypto.createHmac('sha256', testSecret);
      hmac.update(payloadString);
      const signature = hmac.digest('hex');

      // Tamper with payload
      const tamperedPayload = { ...payload, amount: 1000 };

      const result = validateDaimoSignature(tamperedPayload, signature, testSecret);
      expect(result).toBe(false);
    });
  });

  describe('validateEPaycoSignature', () => {
    it('should validate correct ePayco signature', () => {
      const payload = {
        ref_payco: 'REF123',
        x_currency: 'USD',
        x_amount: '50.00',
      };

      const signatureString = `${payload.ref_payco}${payload.x_currency}${payload.x_amount}${testSecret}`;
      const signature = crypto.createHash('sha256').update(signatureString).digest('hex');

      const result = validateEPaycoSignature(payload, signature, testSecret);
      expect(result).toBe(true);
    });

    it('should reject invalid ePayco signature', () => {
      const payload = {
        ref_payco: 'REF123',
        x_currency: 'USD',
        x_amount: '50.00',
      };

      const result = validateEPaycoSignature(payload, 'invalid_signature', testSecret);
      expect(result).toBe(false);
    });

    it('should reject payload with missing fields', () => {
      const payload = {
        ref_payco: 'REF123',
        x_currency: 'USD',
        // x_amount missing
      };

      const result = validateEPaycoSignature(payload, 'any_signature', testSecret);
      expect(result).toBe(false);
    });
  });

  describe('validateHmacSignature', () => {
    it('should validate correct HMAC signature', () => {
      const payload = { test: 'data' };
      const payloadString = JSON.stringify(payload);
      const hmac = crypto.createHmac('sha256', testSecret);
      hmac.update(payloadString);
      const signature = hmac.digest('hex');

      const result = validateHmacSignature(payload, signature, testSecret);
      expect(result).toBe(true);
    });

    it('should work with string payloads', () => {
      const payload = 'test_payload_string';
      const hmac = crypto.createHmac('sha256', testSecret);
      hmac.update(payload);
      const signature = hmac.digest('hex');

      const result = validateHmacSignature(payload, signature, testSecret);
      expect(result).toBe(true);
    });
  });

  describe('validateTimestamp', () => {
    it('should accept recent timestamps', () => {
      const now = Math.floor(Date.now() / 1000);
      const result = validateTimestamp(now, 300);
      expect(result).toBe(true);
    });

    it('should accept timestamps within tolerance', () => {
      const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 250;
      const result = validateTimestamp(fiveMinutesAgo, 300);
      expect(result).toBe(true);
    });

    it('should reject old timestamps', () => {
      const tenMinutesAgo = Math.floor(Date.now() / 1000) - 600;
      const result = validateTimestamp(tenMinutesAgo, 300);
      expect(result).toBe(false);
    });

    it('should reject future timestamps beyond tolerance', () => {
      const tenMinutesFromNow = Math.floor(Date.now() / 1000) + 600;
      const result = validateTimestamp(tenMinutesFromNow, 300);
      expect(result).toBe(false);
    });
  });
});

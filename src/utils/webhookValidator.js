/**
 * Webhook Signature Validation
 * Verifies webhook signatures from payment gateways
 */

import crypto from 'crypto';
import logger from './logger.js';

/**
 * Validate Daimo webhook signature
 * @param {Object} payload - Request body
 * @param {string} signature - Signature from header
 * @param {string} secret - Webhook secret
 * @returns {boolean}
 */
export function validateDaimoSignature(payload, signature, secret) {
  try {
    const hmac = crypto.createHmac('sha256', secret);
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    hmac.update(payloadString);
    const expectedSignature = hmac.digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    logger.error('Error validating Daimo signature:', error);
    return false;
  }
}

/**
 * Validate ePayco webhook signature
 * @param {Object} payload - Request body
 * @param {string} signature - Signature from header
 * @param {string} secret - Webhook secret
 * @returns {boolean}
 */
export function validateEPaycoSignature(payload, signature, secret) {
  try {
    // ePayco specific validation
    // Format: signature = sha256(ref_payco + currency + amount + signature_key)
    const { ref_payco, x_currency, x_amount } = payload;

    if (!ref_payco || !x_currency || !x_amount) {
      return false;
    }

    const signatureString = `${ref_payco}${x_currency}${x_amount}${secret}`;
    const expectedSignature = crypto
      .createHash('sha256')
      .update(signatureString)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature.toLowerCase()),
      Buffer.from(expectedSignature.toLowerCase())
    );
  } catch (error) {
    logger.error('Error validating ePayco signature:', error);
    return false;
  }
}

/**
 * Validate Stripe webhook signature (if used in future)
 * @param {string} payload - Raw request body
 * @param {string} signature - Signature from Stripe-Signature header
 * @param {string} secret - Webhook secret
 * @returns {boolean}
 */
export function validateStripeSignature(payload, signature, secret) {
  try {
    const signatureParts = signature.split(',');
    const timestamp = signatureParts.find(part => part.startsWith('t='))?.split('=')[1];
    const signatures = signatureParts.filter(part => part.startsWith('v1='))
      .map(part => part.split('=')[1]);

    if (!timestamp || signatures.length === 0) {
      return false;
    }

    const signedPayload = `${timestamp}.${payload}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    return signatures.some(sig =>
      crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSignature))
    );
  } catch (error) {
    logger.error('Error validating Stripe signature:', error);
    return false;
  }
}

/**
 * Generic HMAC SHA256 signature validation
 * @param {Object|string} payload - Request payload
 * @param {string} signature - Received signature
 * @param {string} secret - Secret key
 * @returns {boolean}
 */
export function validateHmacSignature(payload, signature, secret) {
  try {
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payloadString);
    const expectedSignature = hmac.digest('hex');

    // Support both hex and base64
    let signatureBuffer, expectedBuffer;

    try {
      signatureBuffer = Buffer.from(signature, 'hex');
      expectedBuffer = Buffer.from(expectedSignature, 'hex');
    } catch {
      signatureBuffer = Buffer.from(signature, 'base64');
      expectedBuffer = Buffer.from(expectedSignature, 'base64');
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch (error) {
    logger.error('Error validating HMAC signature:', error);
    return false;
  }
}

/**
 * Validate webhook timestamp to prevent replay attacks
 * @param {number} timestamp - Webhook timestamp
 * @param {number} toleranceSeconds - Maximum age in seconds (default: 300 = 5 minutes)
 * @returns {boolean}
 */
export function validateTimestamp(timestamp, toleranceSeconds = 300) {
  const now = Math.floor(Date.now() / 1000);
  const difference = Math.abs(now - timestamp);
  return difference <= toleranceSeconds;
}

export default {
  validateDaimoSignature,
  validateEPaycoSignature,
  validateStripeSignature,
  validateHmacSignature,
  validateTimestamp,
};

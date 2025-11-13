/**
 * Payment Data Model
 */

import { collections } from '../config/firebase.js';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a payment record
 */
export async function createPayment(paymentData) {
  try {
    const paymentId = uuidv4();
    const paymentRef = collections.payments().doc(paymentId);

    const payment = {
      paymentId,
      userId: paymentData.userId,
      planId: paymentData.planId,
      amount: paymentData.amount,
      currency: paymentData.currency,
      paymentMethod: paymentData.paymentMethod,
      transactionId: paymentData.transactionId || null,
      status: paymentData.status || 'pending',
      paymentUrl: paymentData.paymentUrl || null,
      metadata: paymentData.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await paymentRef.set(payment);
    logger.info(`Payment created: ${paymentId} for user ${paymentData.userId}`);

    return payment;
  } catch (error) {
    logger.error('Error creating payment:', error);
    throw error;
  }
}

/**
 * Get payment by ID
 */
export async function getPaymentById(paymentId) {
  try {
    const paymentRef = collections.payments().doc(paymentId);
    const doc = await paymentRef.get();

    if (!doc.exists) {
      return null;
    }

    return doc.data();
  } catch (error) {
    logger.error('Error getting payment:', error);
    throw error;
  }
}

/**
 * Get payment by transaction ID
 */
export async function getPaymentByTransactionId(transactionId) {
  try {
    const snapshot = await collections
      .payments()
      .where('transactionId', '==', transactionId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data();
  } catch (error) {
    logger.error('Error getting payment by transaction ID:', error);
    throw error;
  }
}

/**
 * Update payment status
 */
export async function updatePaymentStatus(paymentId, status, transactionId = null) {
  try {
    const paymentRef = collections.payments().doc(paymentId);

    const updates = {
      status,
      updatedAt: new Date(),
    };

    if (transactionId) {
      updates.transactionId = transactionId;
    }

    await paymentRef.update(updates);

    logger.info(`Payment ${paymentId} status updated to ${status}`);

    return updates;
  } catch (error) {
    logger.error('Error updating payment status:', error);
    throw error;
  }
}

/**
 * Get user's payment history
 */
export async function getUserPayments(userId, limit = 10) {
  try {
    const snapshot = await collections
      .payments()
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => doc.data());
  } catch (error) {
    logger.error('Error getting user payments:', error);
    throw error;
  }
}

/**
 * Get successful payments
 */
export async function getSuccessfulPayments(startDate, endDate) {
  try {
    const snapshot = await collections
      .payments()
      .where('status', '==', 'success')
      .where('createdAt', '>=', startDate)
      .where('createdAt', '<=', endDate)
      .get();

    return snapshot.docs.map((doc) => doc.data());
  } catch (error) {
    logger.error('Error getting successful payments:', error);
    throw error;
  }
}

export default {
  createPayment,
  getPaymentById,
  getPaymentByTransactionId,
  updatePaymentStatus,
  getUserPayments,
  getSuccessfulPayments,
};

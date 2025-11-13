/**
 * Daimo Pay Webhook Controller
 */

import { updatePaymentStatus, getPaymentById } from '../../../models/paymentModel.js';
import { activateSubscription } from '../../../services/subscriptionService.js';
import { bot } from '../../core/bot.js';
import { t } from '../../../utils/i18n.js';
import { getUserById } from '../../../services/userService.js';
import logger from '../../../utils/logger.js';

/**
 * Handle Daimo webhook
 */
export async function handleDaimoWebhook(req, res) {
  try {
    const { transaction_id, status, amount, memo, signature } = req.body;

    logger.info('Daimo webhook received:', req.body);

    // Verify signature (implement for production)
    // const expectedSignature = generateDaimoSignature(req.body);
    // if (signature !== expectedSignature) {
    //   return res.status(401).json({ error: 'Invalid signature' });
    // }

    // Extract payment ID from memo
    const paymentIdMatch = memo?.match(/Payment ID: (.+)/);
    if (!paymentIdMatch) {
      return res.status(400).json({ error: 'Invalid memo format' });
    }

    const paymentId = paymentIdMatch[1];

    // Get payment details
    const payment = await getPaymentById(paymentId);

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const isSuccess = status === 'confirmed' || status === 'completed';

    if (isSuccess) {
      // Update payment status
      await updatePaymentStatus(paymentId, 'success', transaction_id);

      // Activate subscription
      await activateSubscription(payment.userId, payment.planId);

      // Get user language
      const user = await getUserById(payment.userId);
      const lang = user?.language || 'en';

      // Notify user
      try {
        await bot.telegram.sendMessage(payment.userId, t('paymentSuccess', lang), {
          reply_markup: {
            inline_keyboard: [[{ text: t('myProfile', lang), callback_data: 'show_profile' }]],
          },
        });
      } catch (notifyError) {
        logger.error('Failed to notify user:', notifyError);
      }

      logger.info(`Daimo payment successful for user ${payment.userId}`);
    } else {
      // Payment failed
      await updatePaymentStatus(paymentId, 'failed', transaction_id);

      const user = await getUserById(payment.userId);
      const lang = user?.language || 'en';

      try {
        await bot.telegram.sendMessage(payment.userId, t('paymentFailed', lang), {
          reply_markup: {
            inline_keyboard: [
              [{ text: t('subscribe', lang), callback_data: 'show_subscription_plans' }],
            ],
          },
        });
      } catch (notifyError) {
        logger.error('Failed to notify user:', notifyError);
      }

      logger.warn(`Daimo payment failed for user ${payment.userId}`);
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    logger.error('Daimo webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default {
  handleDaimoWebhook,
};

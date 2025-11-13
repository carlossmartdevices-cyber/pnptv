/**
 * ePayco Webhook Controller
 */

import { updatePaymentStatus, getPaymentById } from '../../../models/paymentModel.js';
import { activateSubscription } from '../../../services/subscriptionService.js';
import { bot } from '../../core/bot.js';
import { t } from '../../../utils/i18n.js';
import { getUserById } from '../../../services/userService.js';
import logger from '../../../utils/logger.js';

/**
 * Handle ePayco webhook
 */
export async function handleEpaycoWebhook(req, res) {
  try {
    const {
      x_ref_payco,
      x_transaction_id,
      x_response,
      x_approval_code,
      x_extra1,
      x_extra2,
      x_extra3,
      x_signature,
    } = req.body;

    logger.info('ePayco webhook received:', req.body);

    // Verify signature (implement signature verification for production)
    // const expectedSignature = generateEpaycoSignature(req.body);
    // if (x_signature !== expectedSignature) {
    //   return res.status(401).json({ error: 'Invalid signature' });
    // }

    const paymentId = x_extra1;
    const userId = parseInt(x_extra2);
    const planId = x_extra3;

    // Check if payment was successful
    const isSuccess = x_response === 'Aceptada' || x_response === 'Aprobada';

    if (isSuccess) {
      // Update payment status
      await updatePaymentStatus(paymentId, 'success', x_transaction_id);

      // Activate subscription
      await activateSubscription(userId, planId);

      // Get user language
      const user = await getUserById(userId);
      const lang = user?.language || 'en';

      // Notify user
      try {
        await bot.telegram.sendMessage(userId, t('paymentSuccess', lang), {
          reply_markup: {
            inline_keyboard: [[{ text: t('myProfile', lang), callback_data: 'show_profile' }]],
          },
        });
      } catch (notifyError) {
        logger.error('Failed to notify user:', notifyError);
      }

      logger.info(`Payment successful for user ${userId}, plan ${planId}`);
    } else {
      // Payment failed
      await updatePaymentStatus(paymentId, 'failed', x_transaction_id);

      // Notify user
      const user = await getUserById(userId);
      const lang = user?.language || 'en';

      try {
        await bot.telegram.sendMessage(userId, t('paymentFailed', lang), {
          reply_markup: {
            inline_keyboard: [
              [{ text: t('subscribe', lang), callback_data: 'show_subscription_plans' }],
            ],
          },
        });
      } catch (notifyError) {
        logger.error('Failed to notify user:', notifyError);
      }

      logger.warn(`Payment failed for user ${userId}, plan ${planId}`);
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    logger.error('ePayco webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default {
  handleEpaycoWebhook,
};

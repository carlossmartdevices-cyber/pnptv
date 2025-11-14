/**
 * Webhook Routes
 */

import express from 'express';
import { handleEpaycoWebhook } from '../controllers/epaycoController.js';
import { handleDaimoWebhook } from '../controllers/daimoController.js';
import { bot } from '../../core/bot.js';
import logger from '../../../utils/logger.js';

const router = express.Router();

/**
 * @swagger
 * /api/webhooks/epayco:
 *   post:
 *     summary: ePayco payment webhook
 *     description: Receives payment confirmations from ePayco
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 */
router.post('/epayco', handleEpaycoWebhook);

/**
 * @swagger
 * /api/webhooks/daimo:
 *   post:
 *     summary: Daimo Pay webhook
 *     description: Receives payment confirmations from Daimo Pay
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 */
router.post('/daimo', handleDaimoWebhook);

/**
 * @swagger
 * /api/webhooks/telegram:
 *   post:
 *     summary: Telegram webhook
 *     description: Receives updates from Telegram Bot API
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 */
router.post('/telegram', async (req, res) => {
  try {
    // Verify the request is from Telegram (optional but recommended)
    const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (secretToken && req.headers['x-telegram-bot-api-secret-token'] !== secretToken) {
      logger.warn('Invalid webhook secret token');
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Process the update with Telegraf
    await bot.handleUpdate(req.body);

    // Respond quickly to Telegram
    res.status(200).json({ ok: true });
  } catch (error) {
    logger.error('Error processing Telegram webhook:', error);
    // Still respond with 200 to prevent Telegram from retrying
    res.status(200).json({ ok: false });
  }
});

export default router;

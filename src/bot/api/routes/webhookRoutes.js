/**
 * Webhook Routes
 */

import express from 'express';
import { handleEpaycoWebhook } from '../controllers/epaycoController.js';
import { handleDaimoWebhook } from '../controllers/daimoController.js';

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
router.post('/telegram', (req, res) => {
  // TODO: Integrate with Telegram bot logic
  res.status(200).json({ status: 'ok', message: 'Telegram webhook received.' });
});

export default router;

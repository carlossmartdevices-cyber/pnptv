/**
 * API Routes
 */

import express from 'express';

const router = express.Router();

/**
 * @swagger
 * /api/status:
 *   get:
 *     summary: Get bot status
 *     description: Returns current bot status and statistics
 *     tags: [API]
 *     responses:
 *       200:
 *         description: Bot status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 uptime:
 *                   type: number
 */
router.get('/status', (req, res) => {
  res.json({
    status: 'running',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

export default router;

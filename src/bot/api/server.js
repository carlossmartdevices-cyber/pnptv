/**
 * Express API Server for Webhooks and API Endpoints
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import logger from '../../utils/logger.js';
import webhookRoutes from './routes/webhookRoutes.js';
import apiRoutes from './routes/apiRoutes.js';

const app = express();

/**
 * Swagger configuration
 */
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PNPtv Bot API',
      version: '1.0.0',
      description: 'API for PNPtv Telegram Bot webhooks and endpoints',
    },
    servers: [
      {
        url: process.env.WEBAPP_URL || 'http://localhost:3000',
        description: 'API Server',
      },
    ],
  },
  apis: ['./src/bot/api/routes/*.js'],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);

/**
 * Middleware
 */
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(
  morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
});

app.use('/api/', limiter);

/**
 * Routes
 */
app.use('/api/webhooks', webhookRoutes);
app.use('/api', apiRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
  });
});

/**
 * Error handler
 */
app.use((err, req, res, next) => {
  logger.error('Express error:', err);

  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

/**
 * Start server
 */
export async function startWebServer() {
  const port = process.env.PORT || 3000;

  return new Promise((resolve, reject) => {
    const server = app.listen(port, (err) => {
      if (err) {
        return reject(err);
      }

      logger.info(`Web server listening on port ${port}`);
      logger.info(`API docs available at http://localhost:${port}/api-docs`);
      resolve(server);
    });
  });
}

export default app;

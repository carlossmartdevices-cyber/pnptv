/**
 * Standardized Error Handling for Admin Panel
 */

import logger from '../../../../utils/logger.js';
import { getUserLanguage } from '../../../../utils/i18n.js';
import { safeEditMessage } from '../../../helpers/messageHelper.js';
const ERROR_CODES = {
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    en: 'You do not have permission to perform this action',
    es: 'No tienes permiso para realizar esta acción',
    statusCode: 403,
  },
  USER_NOT_FOUND: {
    code: 'USER_NOT_FOUND',
    en: 'User not found',
    es: 'Usuario no encontrado',
    statusCode: 404,
  },
  PLAN_NOT_FOUND: {
    code: 'PLAN_NOT_FOUND',
    en: 'Plan not found',
    es: 'Plan no encontrado',
    statusCode: 404,
  },
  INVALID_INPUT: {
    code: 'INVALID_INPUT',
    en: 'Invalid input provided',
    es: 'Entrada inválida',
    statusCode: 400,
  },
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    en: 'Validation failed',
    es: 'Validación fallida',
    statusCode: 400,
  },
  RATE_LIMITED: {
    code: 'RATE_LIMITED',
    en: 'Too many requests. Please try again later',
    es: 'Demasiadas solicitudes. Intenta más tarde',
    statusCode: 429,
  },
  BROADCAST_FAILED: {
    code: 'BROADCAST_FAILED',
    en: 'Broadcast failed to send',
    es: 'La difusión falló',
    statusCode: 500,
  },
  DATABASE_ERROR: {
    code: 'DATABASE_ERROR',
    en: 'Database error. Please try again',
    es: 'Error de base de datos. Intenta de nuevo',
    statusCode: 500,
  },
  SESSION_EXPIRED: {
    code: 'SESSION_EXPIRED',
    en: 'Your session has expired. Please start again',
    es: 'Tu sesión ha expirado. Comienza de nuevo',
    statusCode: 401,
  },
  OPERATION_TIMEOUT: {
    code: 'OPERATION_TIMEOUT',
    en: 'Operation took too long. Please try again',
    es: 'La operación tardó demasiado. Intenta de nuevo',
    statusCode: 504,
  },
};

/**
 * Admin error class
 */
export class AdminError extends Error {
  constructor(errorCode, message = null, details = {}) {
    const errorDef = ERROR_CODES[errorCode] || ERROR_CODES.DATABASE_ERROR;
    super(message || errorDef.en);
    this.code = errorCode;
    this.en = errorDef.en;
    this.es = errorDef.es;
    this.statusCode = errorDef.statusCode;
    this.details = details;
  }

  getMessage(lang = 'en') {
    return lang === 'es' ? this.es : this.en;
  }
}

/**
 * Handle admin error and send user-friendly response
 * @param {object} ctx - Telegraf context
 * @param {Error} error - Error object
 * @param {object} options - Additional options
 * @returns {Promise<void>}
 */
export async function handleAdminError(ctx, error, options = {}) {
  const {
    showError = true,
    logError = true,
    notifyUser = true,
    answerCbQuery = true,
  } = options;

  const lang = getUserLanguage(ctx);

  // Log error
  if (logError) {
    logger.error('Admin error', {
      code: error.code || 'UNKNOWN',
      message: error.message,
      details: error.details,
      admin: ctx.from?.id,
      stack: error.stack,
    });
  }

  // Answer callback query with error
  if (answerCbQuery && ctx.callbackQuery) {
    await ctx.answerCbQuery('⚠️ Error', true);
  }

  // Send error message to user
  if (notifyUser && showError) {
    let message;

    if (error instanceof AdminError) {
      message = `❌ ${error.getMessage(lang)}`;
    } else {
      message = lang === 'es'
        ? '❌ Algo salió mal. Por favor intenta de nuevo.'
        : '❌ Something went wrong. Please try again.';
    }

    try {
      if (ctx.callbackQuery) {
        await safeEditMessage(ctx, message, { parse_mode: 'Markdown' });
      } else {
        await ctx.reply(message, { parse_mode: 'Markdown' });
      }
    } catch (replyError) {
      logger.error('Failed to send error message', { error: replyError.message });
    }
  }
}

/**
 * Handle validation error
 * @param {object} ctx - Telegraf context
 * @param {string} field - Field that failed validation
 * @param {string} reason - Reason for failure
 * @returns {Promise<void>}
 */
export async function handleValidationError(ctx, field, reason = '') {
  const lang = getUserLanguage(ctx);
  const error = new AdminError('VALIDATION_ERROR', `Invalid ${field}${reason ? `: ${reason}` : ''}`, {
    field,
    reason,
  });

  await handleAdminError(ctx, error);
}

/**
 * Handle user not found error
 * @param {object} ctx - Telegraf context
 * @param {string} userId - User ID that was not found
 * @returns {Promise<void>}
 */
export async function handleUserNotFound(ctx, userId) {
  const lang = getUserLanguage(ctx);
  const error = new AdminError('USER_NOT_FOUND', `User ${userId} not found`, {
    userId,
  });

  await handleAdminError(ctx, error);
}

/**
 * Handle operation timeout
 * @param {object} ctx - Telegraf context
 * @param {string} operation - Operation that timed out
 * @returns {Promise<void>}
 */
export async function handleTimeout(ctx, operation = 'Operation') {
  const lang = getUserLanguage(ctx);
  const error = new AdminError('OPERATION_TIMEOUT', `${operation} timed out`, {
    operation,
  });

  await handleAdminError(ctx, error);
}

/**
 * Format error for logging
 * @param {Error} error - Error to format
 * @returns {object} Formatted error info
 */
export function formatErrorForLog(error) {
  return {
    type: error.constructor.name,
    code: error.code || 'UNKNOWN',
    message: error.message,
    details: error.details || {},
    stack: error.stack?.split('\n').slice(0, 3).join('\n'),
  };
}

/**
 * Get error message for language
 * @param {string} errorCode - Error code
 * @param {string} lang - Language code
 * @returns {string} Localized error message
 */
export function getErrorMessage(errorCode, lang = 'en') {
  const error = ERROR_CODES[errorCode];
  if (!error) {
    return lang === 'es' ? 'Error desconocido' : 'Unknown error';
  }
  return lang === 'es' ? error.es : error.en;
}

/**
 * Check if error is recoverable
 * @param {Error} error - Error to check
 * @returns {boolean} True if recoverable
 */
export function isRecoverableError(error) {
  const recoverableCodes = [
    'VALIDATION_ERROR',
    'USER_NOT_FOUND',
    'PLAN_NOT_FOUND',
    'INVALID_INPUT',
    'RATE_LIMITED',
    'OPERATION_TIMEOUT',
  ];

  return error instanceof AdminError && recoverableCodes.includes(error.code);
}

/**
 * Get retry suggestion for error
 * @param {Error} error - Error to check
 * @param {string} lang - Language code
 * @returns {string|null} Retry message or null
 */
export function getRetrySuggestion(error, lang = 'en') {
  if (!isRecoverableError(error)) return null;

  const suggestions = {
    en: {
      VALIDATION_ERROR: 'Please check your input and try again',
      USER_NOT_FOUND: 'Please verify the user ID and try again',
      PLAN_NOT_FOUND: 'The plan no longer exists',
      INVALID_INPUT: 'Please provide valid input',
      RATE_LIMITED: 'Please wait a moment and try again',
      OPERATION_TIMEOUT: 'The operation took too long. Please try again',
    },
    es: {
      VALIDATION_ERROR: 'Por favor verifica tu entrada e intenta de nuevo',
      USER_NOT_FOUND: 'Por favor verifica el ID de usuario e intenta de nuevo',
      PLAN_NOT_FOUND: 'El plan ya no existe',
      INVALID_INPUT: 'Por favor proporciona entrada válida',
      RATE_LIMITED: 'Por favor espera un momento e intenta de nuevo',
      OPERATION_TIMEOUT: 'La operación tardó demasiado. Intenta de nuevo',
    },
  };

  return suggestions[lang]?.[error.code] || null;
}

export default {
  AdminError,
  ERROR_CODES,
  handleAdminError,
  handleValidationError,
  handleUserNotFound,
  handleTimeout,
  formatErrorForLog,
  getErrorMessage,
  isRecoverableError,
  getRetrySuggestion,
};

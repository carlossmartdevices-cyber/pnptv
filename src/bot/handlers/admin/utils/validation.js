/**
 * Input Validation Utilities for Admin Panel
 */

/**
 * Validate user ID format
 * @param {string|number} userId - User ID to validate
 * @returns {boolean} True if valid
 */
export function validateUserId(userId) {
  if (!userId) return false;
  const id = String(userId);
  // Telegram user IDs are 5-15 digits
  return /^\d{5,15}$/.test(id);
}

/**
 * Validate plan ID format
 * @param {string} planId - Plan ID to validate
 * @returns {boolean} True if valid
 */
export function validatePlanId(planId) {
  if (!planId) return false;
  // Allow alphanumeric and hyphens, 3-50 chars
  return /^[a-z0-9-]{3,50}$/i.test(planId);
}

/**
 * Validate duration in days
 * @param {string|number} days - Duration to validate
 * @returns {boolean} True if valid
 */
export function validateDays(days) {
  const num = parseInt(days);
  // Allow 0-36500 days (roughly 100 years)
  return !isNaN(num) && num >= 0 && num <= 36500;
}

/**
 * Validate broadcast message
 * @param {string} message - Message text to validate
 * @returns {boolean} True if valid
 */
export function validateBroadcastMessage(message) {
  if (!message) return false;
  // Max 4096 characters (Telegram's limit)
  return message.length <= 4096;
}

/**
 * Validate number with range
 * @param {string|number} value - Value to validate
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {boolean} True if valid
 */
export function validateNumberRange(value, min = 0, max = 100) {
  const num = Number(value);
  return !isNaN(num) && num >= min && num <= max;
}

/**
 * Validate date string (ISO format)
 * @param {string} dateStr - Date string to validate
 * @returns {boolean} True if valid
 */
export function validateDateString(dateStr) {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * Validate CSV content
 * @param {string} csv - CSV content
 * @param {number} maxLines - Maximum lines allowed
 * @returns {object} Validation result with data if valid
 */
export function validateCsvContent(csv, maxLines = 1000) {
  try {
    if (!csv || typeof csv !== 'string') {
      return { valid: false, error: 'Invalid CSV content' };
    }

    const lines = csv.trim().split('\n');

    if (lines.length > maxLines) {
      return {
        valid: false,
        error: `CSV exceeds ${maxLines} lines limit`,
      };
    }

    const data = lines.map((line) => line.trim()).filter((line) => line.length > 0);

    return {
      valid: true,
      data,
      count: data.length,
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message,
    };
  }
}

/**
 * Sanitize user input
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized input
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove control characters
  let sanitized = input.replace(/[\x00-\x1F\x7F]/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Limit length
  return sanitized.substring(0, 1000);
}

/**
 * Validate language code
 * @param {string} lang - Language code
 * @returns {boolean} True if valid
 */
export function validateLanguageCode(lang) {
  return ['en', 'es'].includes(lang);
}

/**
 * Get validation error message
 * @param {string} field - Field name
 * @param {string} reason - Reason for failure
 * @param {string} lang - Language code
 * @returns {string} Error message
 */
export function getValidationError(field, reason, lang = 'en') {
  const errors = {
    en: {
      userId: 'Invalid user ID format',
      planId: 'Invalid plan ID format',
      days: 'Invalid duration (must be 0-36500 days)',
      message: 'Message too long or empty',
      range: 'Value out of range',
      date: 'Invalid date format',
      csv: 'Invalid CSV content',
      language: 'Invalid language code',
    },
    es: {
      userId: 'Formato de ID de usuario inválido',
      planId: 'Formato de ID de plan inválido',
      days: 'Duración inválida (debe ser 0-36500 días)',
      message: 'Mensaje demasiado largo o vacío',
      range: 'Valor fuera de rango',
      date: 'Formato de fecha inválido',
      csv: 'Contenido CSV inválido',
      language: 'Código de idioma inválido',
    },
  };

  return errors[lang]?.[field] || `Invalid ${field}`;
}

export default {
  validateUserId,
  validatePlanId,
  validateDays,
  validateBroadcastMessage,
  validateNumberRange,
  validateDateString,
  validateCsvContent,
  sanitizeInput,
  validateLanguageCode,
  getValidationError,
};

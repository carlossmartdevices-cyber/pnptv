/**
 * Admin Callback Handler
 * Standardized callback pattern: admin:section:action:param1:param2...
 */

import logger from '../../../../utils/logger.js';

/**
 * Valid sections and their allowed actions
 */
const CALLBACK_SCHEMA = {
  dashboard: ['show', 'refresh'],
  users: ['list', 'search', 'view', 'ban', 'unban', 'message', 'details', 'page'],
  memberships: ['activate', 'extend', 'modify', 'confirm', 'execute', 'list', 'expiring'],
  broadcasts: ['wizard', 'audience', 'message', 'confirm', 'send', 'schedule', 'analytics', 'templates'],
  plans: ['list', 'view', 'create', 'edit', 'delete', 'stats'],
  payments: ['kyrrex', 'pending', 'confirm', 'history'],
  settings: ['menus', 'commands', 'notifications', 'admin'],
  tools: ['expiration', 'export', 'report', 'cleanup'],
  back: ['home', 'section'],
};

/**
 * Parse callback data
 * @param {string} data - Callback data string
 * @returns {object} Parsed callback with section, action, and params
 * @throws {Error} If callback format is invalid
 */
export function parseCallback(data) {
  if (!data || typeof data !== 'string') {
    throw new Error('Invalid callback data');
  }

  const parts = data.split(':');

  if (parts.length < 2) {
    throw new Error('Callback must have at least namespace and section');
  }

  const [namespace, section, action, ...params] = parts;

  // Validate namespace
  if (namespace !== 'admin') {
    throw new Error(`Invalid namespace: ${namespace}`);
  }

  // Validate section
  if (!Object.keys(CALLBACK_SCHEMA).includes(section)) {
    throw new Error(`Invalid section: ${section}`);
  }

  // Validate action if provided
  if (action && !CALLBACK_SCHEMA[section].includes(action)) {
    throw new Error(`Invalid action: ${action} for section ${section}`);
  }

  return {
    namespace,
    section,
    action: action || 'default',
    params: params || [],
    raw: data,
  };
}

/**
 * Build callback data safely
 * @param {string} section - Section name
 * @param {string} action - Action name
 * @param {...any} params - Additional parameters
 * @returns {string} Formatted callback data
 * @throws {Error} If parameters exceed Telegram's 64-byte limit
 */
export function buildCallback(section, action, ...params) {
  // Validate inputs
  if (!Object.keys(CALLBACK_SCHEMA).includes(section)) {
    throw new Error(`Invalid section: ${section}`);
  }

  if (!CALLBACK_SCHEMA[section].includes(action)) {
    throw new Error(`Invalid action: ${action} for section ${section}`);
  }

  const parts = ['admin', section, action, ...params];
  const callback = parts.join(':');

  // Telegram limit for callback_data is 64 bytes
  if (callback.length > 64) {
    // Use session storage instead for long data
    logger.warn(`Callback data exceeds 64 bytes: ${callback.length}`, { callback });
    throw new Error('Callback data too long. Use session storage for large data.');
  }

  return callback;
}

/**
 * Safe callback builder for user IDs (uses compression if needed)
 * @param {string} section - Section name
 * @param {string} action - Action name
 * @param {string|number} userId - User ID
 * @param {...any} params - Additional parameters
 * @returns {string} Formatted callback data
 */
export function buildCallbackWithUserId(section, action, userId, ...params) {
  // Convert user ID to avoid long strings
  const userIdStr = String(userId).slice(-6); // Last 6 digits should be unique

  try {
    return buildCallback(section, action, userIdStr, ...params);
  } catch (error) {
    // If still too long, use just section and action
    return buildCallback(section, action);
  }
}

/**
 * Validate callback before processing
 * @param {string} data - Callback data
 * @returns {boolean} True if valid
 */
export function isValidCallback(data) {
  try {
    parseCallback(data);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get callback schema for validation
 * @returns {object} Schema mapping
 */
export function getCallbackSchema() {
  return { ...CALLBACK_SCHEMA };
}

export default {
  parseCallback,
  buildCallback,
  buildCallbackWithUserId,
  isValidCallback,
  getCallbackSchema,
};

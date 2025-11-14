/**
 * Admin Session Management Utilities
 */

import logger from '../../../utils/logger.js';
/**
 * Session timeout in milliseconds (15 minutes)
 */
const SESSION_TIMEOUT = 15 * 60 * 1000;

/**
 * Admin session keys (to be cleared on navigation)
 */
const ADMIN_SESSION_KEYS = [
  'adminAction',
  'activationUserId',
  'broadcastWizard',
  'waitingFor',
  'searchQuery',
  'selectedUsers',
  'broadcastData',
  'membershipData',
  'tempData',
];

/**
 * Initialize admin session
 * @param {object} ctx - Telegraf context
 */
export function initializeAdminSession(ctx) {
  if (!ctx.session) {
    ctx.session = {};
  }

  if (!ctx.session.admin) {
    ctx.session.admin = {
      lastAction: null,
      lastActionTime: null,
      actionCount: 0,
      startTime: Date.now(),
    };
  }
}

/**
 * Mark admin action in session
 * @param {object} ctx - Telegraf context
 * @param {string} action - Action name
 */
export function markAdminAction(ctx, action) {
  if (!ctx.session?.admin) {
    initializeAdminSession(ctx);
  }

  ctx.session.admin.lastAction = action;
  ctx.session.admin.lastActionTime = Date.now();
  ctx.session.admin.actionCount = (ctx.session.admin.actionCount || 0) + 1;
}

/**
 * Get admin session duration
 * @param {object} ctx - Telegraf context
 * @returns {number} Duration in milliseconds
 */
export function getAdminSessionDuration(ctx) {
  return Date.now() - (ctx.session?.admin?.startTime || Date.now());
}

/**
 * Check if session has timed out
 * @param {object} ctx - Telegraf context
 * @returns {boolean} True if timed out
 */
export function isSessionExpired(ctx) {
  if (!ctx.session?.admin?.lastActionTime) {
    return false;
  }

  const elapsed = Date.now() - ctx.session.admin.lastActionTime;
  return elapsed > SESSION_TIMEOUT;
}

/**
 * Clean up all admin temporary data from session
 * @param {object} ctx - Telegraf context
 */
export function cleanupAdminSession(ctx) {
  if (!ctx.session) return;

  ADMIN_SESSION_KEYS.forEach((key) => {
    delete ctx.session[key];
  });

  if (ctx.session.admin) {
    ctx.session.admin.actionCount = 0;
    ctx.session.admin.lastAction = null;
  }

  logger.debug('Admin session cleaned up', { userId: ctx.from?.id });
}

/**
 * Clean up specific action data from session
 * @param {object} ctx - Telegraf context
 * @param {string} action - Action to clean (e.g., 'broadcastWizard', 'activation')
 */
export function cleanupActionData(ctx, action) {
  const actionKeys = {
    broadcastWizard: ['broadcastWizard', 'broadcastData'],
    activation: ['activationUserId', 'membershipData'],
    userSearch: ['searchQuery', 'selectedUsers'],
  };

  const keys = actionKeys[action] || [];
  keys.forEach((key) => {
    delete ctx.session[key];
  });

  delete ctx.session.waitingFor;
  delete ctx.session.adminAction;
}

/**
 * Store temporary data in session for wizard flows
 * @param {object} ctx - Telegraf context
 * @param {string} wizardName - Wizard name (e.g., 'broadcast', 'activation')
 * @param {object} data - Data to store
 */
export function setWizardData(ctx, wizardName, data) {
  if (!ctx.session) {
    ctx.session = {};
  }

  ctx.session[`${wizardName}Data`] = {
    ...ctx.session[`${wizardName}Data`],
    ...data,
    startedAt: ctx.session[`${wizardName}Data`]?.startedAt || Date.now(),
  };

  markAdminAction(ctx, wizardName);
}

/**
 * Get temporary data from session
 * @param {object} ctx - Telegraf context
 * @param {string} wizardName - Wizard name
 * @returns {object} Wizard data or empty object
 */
export function getWizardData(ctx, wizardName) {
  return ctx.session?.[`${wizardName}Data`] || {};
}

/**
 * Clear temporary data from session
 * @param {object} ctx - Telegraf context
 * @param {string} wizardName - Wizard name
 */
export function clearWizardData(ctx, wizardName) {
  if (ctx.session) {
    delete ctx.session[`${wizardName}Data`];
  }
}

/**
 * Check if admin is in the middle of an action
 * @param {object} ctx - Telegraf context
 * @returns {boolean} True if waiting for input
 */
export function isWaitingForInput(ctx) {
  return !!ctx.session?.waitingFor;
}

/**
 * Get what the admin is waiting for
 * @param {object} ctx - Telegraf context
 * @returns {string|null} Waiting for value or null
 */
export function getWaitingFor(ctx) {
  return ctx.session?.waitingFor || null;
}

/**
 * Set waiting state
 * @param {object} ctx - Telegraf context
 * @param {string|null} waitingFor - What to wait for or null to clear
 */
export function setWaitingFor(ctx, waitingFor) {
  if (!ctx.session) {
    ctx.session = {};
  }

  ctx.session.waitingFor = waitingFor;
  if (waitingFor) {
    markAdminAction(ctx, `waiting_for_${waitingFor}`);
  }
}

/**
 * Get session summary for debugging
 * @param {object} ctx - Telegraf context
 * @returns {object} Session summary
 */
export function getSessionSummary(ctx) {
  const admin = ctx.session?.admin || {};

  return {
    active: !!ctx.session?.admin,
    duration: getAdminSessionDuration(ctx),
    expired: isSessionExpired(ctx),
    lastAction: admin.lastAction,
    actionCount: admin.actionCount || 0,
    waitingFor: getWaitingFor(ctx),
  };
}

/**
 * Cleanup middleware - run on each admin request
 * @returns {Function} Express/Telegraf middleware
 */
export function sessionCleanupMiddleware() {
  return async (ctx, next) => {
    // Check for expired session
    if (isSessionExpired(ctx)) {
      cleanupAdminSession(ctx);
    }

    // Initialize if needed
    initializeAdminSession(ctx);

    // Continue to next handler
    return next();
  };
}

export default {
  initializeAdminSession,
  markAdminAction,
  getAdminSessionDuration,
  isSessionExpired,
  cleanupAdminSession,
  cleanupActionData,
  setWizardData,
  getWizardData,
  clearWizardData,
  isWaitingForInput,
  getWaitingFor,
  setWaitingFor,
  getSessionSummary,
  sessionCleanupMiddleware,
};

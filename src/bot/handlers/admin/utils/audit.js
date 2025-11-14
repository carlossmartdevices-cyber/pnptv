/**
 * Admin Audit Logging System
 * Tracks all sensitive admin actions
 */

import logger from '../../../../utils/logger.js';

/**
 * Log admin action to audit trail
 * @param {object} ctx - Telegraf context
 * @param {string} action - Action name
 * @param {object} details - Action details
 * @returns {Promise<void>}
 */
export async function logAdminAction(ctx, action, details = {}) {
  try {
    const adminId = ctx.from?.id;
    const adminUsername = ctx.from?.username || 'unknown';

    const auditEntry = {
      timestamp: new Date(),
      adminId: String(adminId),
      adminUsername,
      action,
      details: {
        ...details,
        // Sanitize sensitive data
        userIds: details.userIds ? details.userIds.slice(0, 10) : undefined,
      },
      sessionId: ctx.session?.id || 'no-session',
      ipAddress: ctx.request?.ip || 'unknown',
    };

    // Log to logger
    logger.info(`[AUDIT] Admin action: ${action}`, {
      admin: adminId,
      details: auditEntry.details,
    });

    // TODO: Store in database for permanent audit trail
    // await db.collection('admin_audit_log').add(auditEntry);

    // Store in session for context
    if (!ctx.session) {
      ctx.session = {};
    }
    ctx.session.lastAdminAction = auditEntry;

    return auditEntry;
  } catch (error) {
    logger.error('Failed to log admin action', {
      action,
      error: error.message,
    });
  }
}

/**
 * Log membership activation
 * @param {object} ctx - Telegraf context
 * @param {string} userId - User ID
 * @param {string} planId - Plan ID
 * @param {number} duration - Duration in days
 * @returns {Promise<void>}
 */
export async function logMembershipActivation(ctx, userId, planId, duration) {
  return logAdminAction(ctx, 'membership_activated', {
    targetUserId: String(userId),
    planId,
    duration,
    tier: 'premium', // TODO: Get from plan details
  });
}

/**
 * Log membership extension
 * @param {object} ctx - Telegraf context
 * @param {string} userId - User ID
 * @param {number} days - Days extended
 * @returns {Promise<void>}
 */
export async function logMembershipExtension(ctx, userId, days) {
  return logAdminAction(ctx, 'membership_extended', {
    targetUserId: String(userId),
    daysAdded: days,
  });
}

/**
 * Log broadcast sent
 * @param {object} ctx - Telegraf context
 * @param {string} audience - Target audience
 * @param {number} recipientCount - Number of recipients
 * @param {object} broadcastInfo - Broadcast details
 * @returns {Promise<void>}
 */
export async function logBroadcastSent(ctx, audience, recipientCount, broadcastInfo = {}) {
  return logAdminAction(ctx, 'broadcast_sent', {
    audience,
    recipientCount,
    messageLength: broadcastInfo.message?.length || 0,
    hasMedia: !!broadcastInfo.photo || !!broadcastInfo.video,
  });
}

/**
 * Log user action (ban, unban, message)
 * @param {object} ctx - Telegraf context
 * @param {string} actionType - Type of action
 * @param {string} userId - Target user ID
 * @param {object} details - Additional details
 * @returns {Promise<void>}
 */
export async function logUserAction(ctx, actionType, userId, details = {}) {
  return logAdminAction(ctx, `user_${actionType}`, {
    targetUserId: String(userId),
    ...details,
  });
}

/**
 * Log plan modification
 * @param {object} ctx - Telegraf context
 * @param {string} planId - Plan ID
 * @param {string} changeType - Type of change (create, edit, delete)
 * @param {object} changes - What changed
 * @returns {Promise<void>}
 */
export async function logPlanModification(ctx, planId, changeType, changes = {}) {
  return logAdminAction(ctx, `plan_${changeType}`, {
    planId,
    changes,
  });
}

/**
 * Log sensitive configuration change
 * @param {object} ctx - Telegraf context
 * @param {string} section - Configuration section
 * @param {object} changes - What changed
 * @returns {Promise<void>}
 */
export async function logConfigurationChange(ctx, section, changes = {}) {
  return logAdminAction(ctx, 'configuration_changed', {
    section,
    changes: {
      ...changes,
      // Never log secrets
      newValue: changes.newValue && typeof changes.newValue === 'object'
        ? 'REDACTED'
        : changes.newValue,
    },
  });
}

/**
 * Log failed admin action (security relevant)
 * @param {object} ctx - Telegraf context
 * @param {string} action - Failed action
 * @param {string} reason - Reason for failure
 * @param {object} context - Additional context
 * @returns {Promise<void>}
 */
export async function logFailedAction(ctx, action, reason, context = {}) {
  logger.warn(`[SECURITY] Failed admin action: ${action}`, {
    admin: ctx.from?.id,
    reason,
    context,
  });

  return logAdminAction(ctx, `failed_${action}`, {
    reason,
    context,
    severity: 'warning',
  });
}

/**
 * Get audit log for specific admin (with pagination)
 * @param {string} adminId - Admin user ID
 * @param {number} limit - Number of records to return
 * @returns {Promise<array>} Audit log entries
 */
export async function getAdminAuditLog(adminId, limit = 50) {
  try {
    // TODO: Query from database
    // const snapshot = await db.collection('admin_audit_log')
    //   .where('adminId', '==', String(adminId))
    //   .orderBy('timestamp', 'desc')
    //   .limit(limit)
    //   .get();
    // return snapshot.docs.map(doc => doc.data());
    return [];
  } catch (error) {
    logger.error('Failed to get audit log', { error: error.message });
    return [];
  }
}

/**
 * Get recent actions across all admins
 * @param {number} limit - Number of records
 * @returns {Promise<array>} Recent audit entries
 */
export async function getRecentAdminActions(limit = 100) {
  try {
    // TODO: Query from database
    // const snapshot = await db.collection('admin_audit_log')
    //   .orderBy('timestamp', 'desc')
    //   .limit(limit)
    //   .get();
    // return snapshot.docs.map(doc => doc.data());
    return [];
  } catch (error) {
    logger.error('Failed to get recent admin actions', { error: error.message });
    return [];
  }
}

/**
 * Export audit log to CSV format
 * @param {array} entries - Audit log entries
 * @returns {string} CSV formatted audit log
 */
export function exportAuditLogCsv(entries) {
  const headers = ['Timestamp', 'Admin', 'Action', 'Target User', 'Details'];
  const rows = entries.map((entry) => [
    new Date(entry.timestamp).toISOString(),
    entry.adminUsername || entry.adminId,
    entry.action,
    entry.details?.targetUserId || '-',
    JSON.stringify(entry.details || {}),
  ]);

  const csv = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  return csv;
}

export default {
  logAdminAction,
  logMembershipActivation,
  logMembershipExtension,
  logBroadcastSent,
  logUserAction,
  logPlanModification,
  logConfigurationChange,
  logFailedAction,
  getAdminAuditLog,
  getRecentAdminActions,
  exportAuditLogCsv,
};

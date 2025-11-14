/**
 * Message Helper Utilities
 * Provides safe wrappers for Telegram message operations
 */

import logger from '../../utils/logger.js';

/**
 * Safely edit a message with error handling
 * @param {object} ctx - Telegraf context
 * @param {string|object} content - Message content (text or media)
 * @param {object} extra - Extra options for message editing
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
export async function safeEditMessage(ctx, content, extra = {}) {
  try {
    if (!ctx.callbackQuery) {
      logger.debug('Cannot edit message - not a callback query');
      return false;
    }

    // Check if message is recent enough to edit (Telegram allows editing messages up to 48 hours old)
    const messageAge = Date.now() - (ctx.callbackQuery.message?.date * 1000 || 0);
    const MAX_EDIT_AGE = 48 * 60 * 60 * 1000; // 48 hours in milliseconds

    if (messageAge > MAX_EDIT_AGE) {
      logger.debug('Message too old to edit', { messageAge, messageId: ctx.callbackQuery.message?.message_id });
      // Send a new message instead
      await ctx.reply(content, extra);
      return false;
    }

    await ctx.editMessageText(content, extra);
    return true;
  } catch (error) {
    // Handle specific Telegram API errors
    if (error.description?.includes("message can't be edited")) {
      logger.debug('Message cannot be edited', {
        error: error.description,
        messageId: ctx.callbackQuery?.message?.message_id,
      });
      // Fallback: send a new message
      try {
        await ctx.reply(content, extra);
      } catch (replyError) {
        logger.error('Failed to send fallback message', { error: replyError.message });
      }
      return false;
    } else if (error.description?.includes("message is not modified")) {
      // Message content is identical - not an error
      logger.debug('Message content unchanged');
      return true;
    } else {
      logger.error('Failed to edit message', {
        error: error.message,
        description: error.description,
        messageId: ctx.callbackQuery?.message?.message_id,
      });
      return false;
    }
  }
}

/**
 * Safely delete a message with error handling
 * @param {object} ctx - Telegraf context
 * @param {number} messageId - Message ID to delete (optional, defaults to current message)
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
export async function safeDeleteMessage(ctx, messageId = null) {
  try {
    const targetMessageId = messageId || ctx.callbackQuery?.message?.message_id || ctx.message?.message_id;

    if (!targetMessageId) {
      logger.debug('No message ID available for deletion');
      return false;
    }

    await ctx.deleteMessage(targetMessageId);
    return true;
  } catch (error) {
    if (error.description?.includes("message to delete not found")) {
      logger.debug('Message already deleted', { messageId });
      return false;
    } else if (error.description?.includes("message can't be deleted")) {
      logger.debug('Message cannot be deleted', {
        error: error.description,
        messageId,
      });
      return false;
    } else {
      logger.error('Failed to delete message', {
        error: error.message,
        description: error.description,
        messageId,
      });
      return false;
    }
  }
}

/**
 * Safely answer callback query with error handling
 * @param {object} ctx - Telegraf context
 * @param {string} text - Callback answer text
 * @param {boolean} showAlert - Show as alert instead of notification
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
export async function safeAnswerCallback(ctx, text = '', showAlert = false) {
  try {
    if (!ctx.callbackQuery) {
      logger.debug('Cannot answer callback - not a callback query');
      return false;
    }

    await ctx.answerCbQuery(text, showAlert);
    return true;
  } catch (error) {
    if (error.description?.includes("query is too old")) {
      logger.debug('Callback query too old to answer');
      return false;
    } else {
      logger.error('Failed to answer callback query', {
        error: error.message,
        description: error.description,
      });
      return false;
    }
  }
}

/**
 * Send or edit message intelligently based on context
 * @param {object} ctx - Telegraf context
 * @param {string|object} content - Message content
 * @param {object} extra - Extra options
 * @returns {Promise<object|null>} Sent/edited message or null
 */
export async function sendOrEditMessage(ctx, content, extra = {}) {
  try {
    if (ctx.callbackQuery) {
      const edited = await safeEditMessage(ctx, content, extra);
      if (edited) {
        return ctx.callbackQuery.message;
      }
    }

    // Either not a callback or edit failed - send new message
    return await ctx.reply(content, extra);
  } catch (error) {
    logger.error('Failed to send or edit message', {
      error: error.message,
      hasCallback: !!ctx.callbackQuery,
    });
    return null;
  }
}

export default {
  safeEditMessage,
  safeDeleteMessage,
  safeAnswerCallback,
  sendOrEditMessage,
};

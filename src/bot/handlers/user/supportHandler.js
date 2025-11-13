/**
 * Support and AI Chat Handler
 */

import { Markup } from 'telegraf';
import { t, getUserLanguage } from '../../../utils/i18n.js';
import { OpenAI } from 'openai';
import logger from '../../../utils/logger.js';

// Initialize OpenAI (if enabled)
let openai = null;
if (process.env.ENABLE_AI_CHAT === 'true' && process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

/**
 * Register support handlers
 */
export function registerSupportHandlers(bot) {
  bot.action('show_support', async (ctx) => {
    await showSupportMenu(ctx);
  });

  bot.action('chat_with_ai', async (ctx) => {
    await startAIChat(ctx);
  });

  bot.action('contact_admin', async (ctx) => {
    const lang = getUserLanguage(ctx);
    ctx.session.waitingFor = 'support_message';

    await ctx.editMessageText(t('contactAdminPrompt', lang), Markup.inlineKeyboard([
      [Markup.button.callback(t('cancel', lang), 'show_support')],
    ]));
  });

  // Handle AI chat messages
  bot.on('text', async (ctx, next) => {
    if (ctx.session.aiChatActive) {
      await handleAIChat(ctx, ctx.message.text);
    } else if (ctx.session.waitingFor === 'support_message') {
      await handleSupportMessage(ctx, ctx.message.text);
    } else {
      return next();
    }
  });
}

/**
 * Show support menu
 */
async function showSupportMenu(ctx) {
  try {
    const lang = getUserLanguage(ctx);

    const buttons = [];

    if (process.env.ENABLE_AI_CHAT === 'true') {
      buttons.push([Markup.button.callback(t('chatWithAI', lang), 'chat_with_ai')]);
    }

    buttons.push(
      [Markup.button.callback(t('contactAdmin', lang), 'contact_admin')],
      [Markup.button.callback(t('back', lang), 'main_menu')]
    );

    const keyboard = Markup.inlineKeyboard(buttons);

    await ctx.editMessageText(t('supportIntro', lang), {
      parse_mode: 'Markdown',
      ...keyboard,
    });
  } catch (error) {
    logger.error('Error showing support menu:', error);
  }
}

/**
 * Start AI chat
 */
async function startAIChat(ctx) {
  try {
    const lang = getUserLanguage(ctx);

    ctx.session.aiChatActive = true;
    ctx.session.aiMessages = [];

    await ctx.editMessageText(t('aiChatActive', lang), {
      parse_mode: 'Markdown',
    });
  } catch (error) {
    logger.error('Error starting AI chat:', error);
  }
}

/**
 * Handle AI chat
 */
async function handleAIChat(ctx, message) {
  try {
    const lang = getUserLanguage(ctx);

    // Exit AI chat
    if (message === '/menu') {
      ctx.session.aiChatActive = false;
      delete ctx.session.aiMessages;
      return ctx.reply(t('mainMenuIntro', lang));
    }

    if (!openai) {
      return ctx.reply('AI chat is not available.');
    }

    // Send typing action
    await ctx.sendChatAction('typing');

    // Initialize conversation history
    if (!ctx.session.aiMessages) {
      ctx.session.aiMessages = [];
    }

    // Add user message
    ctx.session.aiMessages.push({
      role: 'user',
      content: message,
    });

    // Get AI response
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are Cristina, a helpful AI assistant for PNPtv, a social entertainment platform. Help users with questions about features, subscriptions, and general support. Be friendly and concise.',
        },
        ...ctx.session.aiMessages,
      ],
      max_tokens: 500,
    });

    const aiResponse = completion.choices[0].message.content;

    // Add AI response to history
    ctx.session.aiMessages.push({
      role: 'assistant',
      content: aiResponse,
    });

    // Keep only last 10 messages
    if (ctx.session.aiMessages.length > 10) {
      ctx.session.aiMessages = ctx.session.aiMessages.slice(-10);
    }

    await ctx.reply(aiResponse);
  } catch (error) {
    logger.error('Error handling AI chat:', error);
    await ctx.reply(t('error', getUserLanguage(ctx)));
  }
}

/**
 * Handle support message
 */
async function handleSupportMessage(ctx, message) {
  try {
    const lang = getUserLanguage(ctx);

    ctx.session.waitingFor = null;

    // Send to admins
    const adminIds = (process.env.ADMIN_USER_IDS || '').split(',').map(Number);

    for (const adminId of adminIds) {
      try {
        await ctx.telegram.sendMessage(
          adminId,
          `📩 **Support Request**\\n\\nFrom: @${ctx.from.username || ctx.from.first_name} (${ctx.from.id})\\n\\nMessage:\\n${message}`,
          { parse_mode: 'Markdown' }
        );
      } catch (error) {
        logger.error(`Failed to send to admin ${adminId}:`, error);
      }
    }

    await ctx.reply(t('supportTicketCreated', lang));
    await showSupportMenu(ctx);
  } catch (error) {
    logger.error('Error handling support message:', error);
  }
}

export default registerSupportHandlers;

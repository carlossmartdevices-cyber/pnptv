/**
 * Profile Management Handler
 */

import { Markup } from 'telegraf';
import { t, getUserLanguage } from '../../../utils/i18n.js';
import { getUserById, updateProfile } from '../../../services/userService.js';
import { sanitizeBio } from '../../../utils/validation.js';
import logger from '../../../utils/logger.js';

/**
 * Register profile handlers
 */
export function registerProfileHandlers(bot) {
  // Show profile
  bot.action('show_profile', async (ctx) => {
    await showProfile(ctx);
  });

  // Edit profile options
  bot.action('edit_profile', async (ctx) => {
    await showEditOptions(ctx);
  });

  // Edit photo
  bot.action('edit_photo', async (ctx) => {
    const lang = getUserLanguage(ctx);
    ctx.session.waitingFor = 'photo';
    await ctx.editMessageText(t('sendNewPhoto', lang), Markup.inlineKeyboard([
      [Markup.button.callback(t('cancel', lang), 'show_profile')],
    ]));
  });

  // Edit bio
  bot.action('edit_bio', async (ctx) => {
    const lang = getUserLanguage(ctx);
    ctx.session.waitingFor = 'bio';
    await ctx.editMessageText(t('sendNewBio', lang), Markup.inlineKeyboard([
      [Markup.button.callback(t('cancel', lang), 'show_profile')],
    ]));
  });

  // Edit location
  bot.action('edit_location', async (ctx) => {
    const lang = getUserLanguage(ctx);
    ctx.session.waitingFor = 'location';
    await ctx.editMessageText(t('sendLocation', lang), Markup.inlineKeyboard([
      [Markup.button.callback(t('cancel', lang), 'show_profile')],
    ]));
  });

  // Handle photo upload
  bot.on('photo', async (ctx, next) => {
    if (ctx.session.waitingFor === 'photo') {
      await handlePhotoUpdate(ctx);
    } else {
      return next();
    }
  });

  // Handle location share
  bot.on('location', async (ctx, next) => {
    if (ctx.session.waitingFor === 'location') {
      await handleLocationUpdate(ctx);
    } else {
      return next();
    }
  });

  // Handle text (bio)
  bot.on('text', async (ctx, next) => {
    if (ctx.session.waitingFor === 'bio') {
      await handleBioUpdate(ctx);
    } else {
      return next();
    }
  });
}

/**
 * Show user profile
 */
async function showProfile(ctx) {
  try {
    const lang = getUserLanguage(ctx);
    const user = await getUserById(ctx.from.id);

    if (!user) {
      return ctx.reply(t('error', lang));
    }

    const status = user.subscriptionStatus === 'active' ? '✅ Premium' : '🆓 Free';
    const plan = user.planId || 'Free';
    const joinDate = new Date(user.createdAt.toDate()).toLocaleDateString();

    const profileText = t('profileView', lang, {
      username: user.username || user.firstName || 'Unknown',
      status,
      plan,
      joinDate,
    });

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback(t('editProfile', lang), 'edit_profile')],
      [Markup.button.callback(t('back', lang), 'main_menu')],
    ]);

    if (ctx.callbackQuery) {
      await ctx.editMessageText(profileText, { parse_mode: 'Markdown', ...keyboard });
    } else {
      await ctx.reply(profileText, { parse_mode: 'Markdown', ...keyboard });
    }
  } catch (error) {
    logger.error('Error showing profile:', error);
  }
}

/**
 * Show edit options
 */
async function showEditOptions(ctx) {
  try {
    const lang = getUserLanguage(ctx);

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback(t('editPhoto', lang), 'edit_photo')],
      [Markup.button.callback(t('editBio', lang), 'edit_bio')],
      [Markup.button.callback(t('editLocation', lang), 'edit_location')],
      [Markup.button.callback(t('back', lang), 'show_profile')],
    ]);

    await ctx.editMessageText(t('editProfile', lang), keyboard);
  } catch (error) {
    logger.error('Error showing edit options:', error);
  }
}

/**
 * Handle photo update
 */
async function handlePhotoUpdate(ctx) {
  try {
    const lang = getUserLanguage(ctx);
    const photos = ctx.message.photo;
    const photoUrl = photos[photos.length - 1].file_id;

    await updateProfile(ctx.from.id, { photoUrl });

    ctx.session.waitingFor = null;
    await ctx.reply(t('profileUpdated', lang));
    await showProfile(ctx);
  } catch (error) {
    logger.error('Error updating photo:', error);
  }
}

/**
 * Handle bio update
 */
async function handleBioUpdate(ctx) {
  try {
    const lang = getUserLanguage(ctx);
    const bio = sanitizeBio(ctx.message.text);

    if (bio.length > 500) {
      return ctx.reply(t('bioTooLong', lang));
    }

    await updateProfile(ctx.from.id, { bio });

    ctx.session.waitingFor = null;
    await ctx.reply(t('profileUpdated', lang));
    await showProfile(ctx);
  } catch (error) {
    logger.error('Error updating bio:', error);
  }
}

/**
 * Handle location update
 */
async function handleLocationUpdate(ctx) {
  try {
    const lang = getUserLanguage(ctx);
    const location = ctx.message.location;

    await updateProfile(ctx.from.id, { location });

    ctx.session.waitingFor = null;
    await ctx.reply(t('profileUpdated', lang));
    await showProfile(ctx);
  } catch (error) {
    logger.error('Error updating location:', error);
  }
}

export default registerProfileHandlers;

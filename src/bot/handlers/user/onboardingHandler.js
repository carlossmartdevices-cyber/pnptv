/**
 * User Onboarding Flow Handler
 */

import { Markup } from 'telegraf';
import { getOrCreateUser, completeOnboarding } from '../../../services/userService.js';
import { t, setUserLanguage, getUserLanguage } from '../../../utils/i18n.js';
import { isValidEmail } from '../../../utils/validation.js';
import logger from '../../../utils/logger.js';

/**
 * Register onboarding handlers
 */
export function registerOnboardingHandlers(bot) {
  // Start command - begin onboarding
  bot.command('start', async (ctx) => {
    try {
      const user = await getOrCreateUser(ctx.from);

      if (user.onboardingCompleted) {
        // User already onboarded, show main menu
        return ctx.scene.enter('main_menu');
      }

      // Start onboarding with language selection
      await ctx.reply(
        '🌐 Welcome to PNPtv! / ¡Bienvenido a PNPtv!\\n\\nPlease select your language / Por favor selecciona tu idioma:',
        Markup.inlineKeyboard([
          [Markup.button.callback('🇺🇸 English', 'lang_en')],
          [Markup.button.callback('🇪🇸 Español', 'lang_es')],
        ])
      );
    } catch (error) {
      logger.error('Error in start command:', error);
      await ctx.reply('An error occurred. Please try again.');
    }
  });

  // Language selection
  bot.action(/lang_(en|es)/, async (ctx) => {
    try {
      const lang = ctx.match[1];
      setUserLanguage(ctx, lang);

      await ctx.editMessageText(
        t('ageConfirmation', lang),
        Markup.inlineKeyboard([
          [Markup.button.callback(t('ageYes', lang), 'age_yes')],
          [Markup.button.callback(t('ageNo', lang), 'age_no')],
        ])
      );
    } catch (error) {
      logger.error('Error in language selection:', error);
    }
  });

  // Age confirmation
  bot.action('age_yes', async (ctx) => {
    try {
      const lang = getUserLanguage(ctx);
      ctx.session.age18Plus = true;

      await ctx.editMessageText(
        t('termsAcceptance', lang),
        Markup.inlineKeyboard([
          [
            Markup.button.url(t('termsButton', lang), process.env.TERMS_URL || 'https://pnptv.com/terms'),
            Markup.button.url(t('privacyButton', lang), process.env.PRIVACY_URL || 'https://pnptv.com/privacy'),
          ],
          [Markup.button.callback(t('acceptTerms', lang), 'terms_accept')],
          [Markup.button.callback(t('declineTerms', lang), 'terms_decline')],
        ])
      );
    } catch (error) {
      logger.error('Error in age confirmation:', error);
    }
  });

  bot.action('age_no', async (ctx) => {
    try {
      const lang = getUserLanguage(ctx);
      await ctx.editMessageText(t('ageRestriction', lang));
    } catch (error) {
      logger.error('Error in age decline:', error);
    }
  });

  // Terms acceptance
  bot.action('terms_accept', async (ctx) => {
    try {
      const lang = getUserLanguage(ctx);
      ctx.session.termsAccepted = true;

      await ctx.editMessageText(
        t('emailRequest', lang),
        Markup.inlineKeyboard([
          [Markup.button.callback(t('emailSkip', lang), 'email_skip')],
        ])
      );

      // Set state to wait for email
      ctx.session.waitingForEmail = true;
    } catch (error) {
      logger.error('Error in terms acceptance:', error);
    }
  });

  bot.action('terms_decline', async (ctx) => {
    try {
      const lang = getUserLanguage(ctx);
      await ctx.editMessageText(t('termsDeclined', lang));
    } catch (error) {
      logger.error('Error in terms decline:', error);
    }
  });

  // Email skip
  bot.action('email_skip', async (ctx) => {
    try {
      await finishOnboarding(ctx, null);
    } catch (error) {
      logger.error('Error in email skip:', error);
    }
  });

  // Listen for email input
  bot.on('text', async (ctx, next) => {
    if (ctx.session.waitingForEmail) {
      const lang = getUserLanguage(ctx);
      const email = ctx.message.text;

      if (isValidEmail(email)) {
        ctx.session.waitingForEmail = false;
        await finishOnboarding(ctx, email);
      } else {
        await ctx.reply(
          t('emailInvalid', lang),
          Markup.inlineKeyboard([
            [Markup.button.callback(t('emailSkip', lang), 'email_skip')],
          ])
        );
      }
    } else {
      return next();
    }
  });
}

/**
 * Complete onboarding process
 */
async function finishOnboarding(ctx, email) {
  try {
    const lang = getUserLanguage(ctx);

    await completeOnboarding(ctx.from.id, {
      language: lang,
      age18Plus: ctx.session.age18Plus,
      termsAccepted: ctx.session.termsAccepted,
      email,
    });

    await ctx.reply(
      t('onboardingComplete', lang) + '\\n\\n' + t('mainMenuIntro', lang),
      Markup.inlineKeyboard([
        [Markup.button.callback(t('myProfile', lang), 'show_profile')],
        [Markup.button.callback(t('becomeMember', lang), 'show_subscription_plans')],
        [Markup.button.callback(t('support', lang), 'show_support')],
        [Markup.button.callback(t('settings', lang), 'show_settings')],
      ])
    );

    // Clear onboarding session data
    delete ctx.session.age18Plus;
    delete ctx.session.termsAccepted;
    delete ctx.session.waitingForEmail;
  } catch (error) {
    logger.error('Error finishing onboarding:', error);
    throw error;
  }
}

export default registerOnboardingHandlers;

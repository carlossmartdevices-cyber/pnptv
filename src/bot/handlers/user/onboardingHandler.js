/**
 * User Onboarding Flow Handler - Complete Rebuild
 *
 * Flow Steps:
 * 1. Language Selection (en/es)
 * 2. Age Verification (18+ confirmation, re-verified every 7 days)
 * 3. Terms & Conditions (accept/decline)
 * 4. Email Collection (text input with validation)
 * 5. Free Channel Invite (one-time link generation)
 * 6. Privacy Policy (accept/decline)
 * 7. Onboarding Complete (profile creation + main menu)
 */

import { Markup } from 'telegraf';
import * as userModel from '../../../models/userModel.js';
import { t, getUserLanguage, setUserLanguage } from '../../../../utils/i18n.js';
import { isValidEmail } from '../../../utils/validation.js';
import { activateMembership } from '../../../utils/membershipManager.js';
import { showMainMenu } from './mainMenuHandler.js';
import logger from '../../../../utils/logger.js';

/**
 * Register onboarding handlers
 */
export function registerOnboardingHandlers(bot) {
  // Start command - begin onboarding or show main menu
  bot.command('start', handleStartCommand);

  // Language selection
  bot.action(/language_(en|es)/, handleLanguageSelection);

  // Age verification
  bot.action('confirm_age', handleAgeConfirmation);

  // Terms acceptance
  bot.action('accept_terms', handleTermsAcceptance);
  bot.action('decline_terms', handleTermsDecline);

  // Privacy acceptance
  bot.action('accept_privacy', handlePrivacyAcceptance);
  bot.action('decline_privacy', handlePrivacyDecline);

  // Email submission - handled in text middleware
  bot.on('text', async (ctx, next) => {
    if (ctx.session?.awaitingEmail) {
      return handleEmailSubmission(ctx);
    }
    return next();
  });
}

/**
 * Handle /start command
 * Checks user state and routes to appropriate flow
 */
async function handleStartCommand(ctx) {
  try {
    const userId = ctx.from.id;
    const userRef = await userModel.getUserById(userId);

    // Update last active time
    if (userRef) {
      await userModel.updateUser(userId, { lastActive: new Date() });
    }

    // Check if user exists
    if (userRef) {
      // Check if onboarding is complete
      if (userRef.onboardingComplete) {
        // Check if age verification expired (every 7 days)
        const now = new Date();
        const ageExpiresAt = userRef.ageVerificationExpiresAt?.toDate
          ? userRef.ageVerificationExpiresAt.toDate()
          : userRef.ageVerificationExpiresAt
            ? new Date(userRef.ageVerificationExpiresAt)
            : null;

        if (ageExpiresAt && now > ageExpiresAt) {
          // Age verification expired - re-verify
          logger.info(`Age verification expired for user ${userId}, requiring re-verification`);

          // Initialize session for age re-verification
          ctx.session = {
            ...ctx.session,
            language: userRef.language || 'en',
            onboardingStep: 'ageVerification',
            onboardingComplete: true, // Keep onboarding complete flag
            isReVerification: true, // Flag to indicate this is re-verification
          };

          return showAgeVerificationScreen(ctx, true); // true = re-verification
        }

        // User is fully onboarded and age verified - show main menu
        logger.info(`Returning user ${userId} accessing main menu`);
        return showMainMenu(ctx);
      }
    }

    // New user or incomplete onboarding - start fresh
    logger.info(`Starting onboarding for user ${userId}`);

    // Create user if doesn't exist
    if (!userRef) {
      await userModel.createUser({
        userId: ctx.from.id,
        username: ctx.from.username,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name,
        language: ctx.from.language_code?.split('-')[0] || 'en',
      });
    }

    // Initialize session for new onboarding
    ctx.session = {
      userId: ctx.from.id,
      username: ctx.from.username,
      onboardingStep: 'language',
      onboardingComplete: false,
      ageVerified: false,
      termsAccepted: false,
      privacyAccepted: false,
      awaitingEmail: false,
    };

    // Show language selection
    await ctx.reply(
      t('welcome', 'en') + '\n\n' + t('selectLanguage', 'en'),
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback(t('languageEnglish', 'en'), 'language_en')],
          [Markup.button.callback(t('languageSpanish', 'es'), 'language_es')],
        ]),
      }
    );
  } catch (error) {
    logger.error('Error in start command:', error);
    await ctx.reply(t('error', 'en'));
  }
}

/**
 * Handle language selection
 */
async function handleLanguageSelection(ctx) {
  try {
    await ctx.answerCbQuery();

    const lang = ctx.match[1]; // en or es
    setUserLanguage(ctx, lang);
    ctx.session.language = lang;
    ctx.session.onboardingStep = 'ageVerification';

    logger.info(`User ${ctx.from.id} selected language: ${lang}`);

    // Update user language in database
    await userModel.updateUser(ctx.from.id, { language: lang });

    // Show age verification screen
    await showAgeVerificationScreen(ctx, false);
  } catch (error) {
    logger.error('Error in language selection:', error);
    const lang = getUserLanguage(ctx);

    // Handle "message not modified" error
    if (error.description?.includes('message is not modified')) {
      await ctx.reply(t('error', lang));
    } else {
      throw error;
    }
  }
}

/**
 * Show age verification screen
 * @param {boolean} isReVerification - Whether this is a re-verification (every 7 days)
 */
async function showAgeVerificationScreen(ctx, isReVerification = false) {
  const lang = getUserLanguage(ctx);
  const messageKey = isReVerification ? 'ageVerificationReminder' : 'ageVerification';

  try {
    await ctx.editMessageText(
      t(messageKey, lang),
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback(t('confirmAge', lang), 'confirm_age')],
        ]),
      }
    );
  } catch (editError) {
    // If edit fails, send new message
    if (editError.description?.includes('message is not modified') ||
        editError.description?.includes('message to edit not found')) {
      await ctx.reply(
        t(messageKey, lang),
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback(t('confirmAge', lang), 'confirm_age')],
          ]),
        }
      );
    } else {
      throw editError;
    }
  }
}

/**
 * Handle age confirmation
 */
async function handleAgeConfirmation(ctx) {
  try {
    await ctx.answerCbQuery();

    const lang = getUserLanguage(ctx);
    const userId = ctx.from.id;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 168 * 60 * 60 * 1000); // 7 days

    // Update session
    ctx.session.ageVerified = true;
    ctx.session.ageVerifiedAt = now;
    ctx.session.ageVerificationExpiresAt = expiresAt;

    // Update database
    await userModel.updateUser(userId, {
      ageVerified: true,
      ageVerifiedAt: now,
      ageVerificationExpiresAt: expiresAt,
    });

    logger.info(`Age verified for user ${userId}, expires at ${expiresAt.toISOString()}`);

    // If this is re-verification, show success and return to main menu
    if (ctx.session.isReVerification) {
      await ctx.editMessageText(t('ageVerificationSuccess', lang), { parse_mode: 'Markdown' });

      // Wait a moment then show main menu
      setTimeout(async () => {
        await showMainMenu(ctx);
      }, 2000);

      return;
    }

    // Continue onboarding - show terms
    ctx.session.onboardingStep = 'terms';

    const termsUrl = process.env.TERMS_URL || 'https://pnptv.app/terms';

    try {
      await ctx.editMessageText(
        t('terms', lang, { termsUrl }),
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.url(t('termsButton', lang), termsUrl)],
            [Markup.button.callback(t('accept', lang), 'accept_terms')],
            [Markup.button.callback(t('decline', lang), 'decline_terms')],
          ]),
        }
      );
    } catch (editError) {
      if (editError.description?.includes('message is not modified') ||
          editError.description?.includes('message to edit not found')) {
        await ctx.reply(
          t('terms', lang, { termsUrl }),
          {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
              [Markup.button.url(t('termsButton', lang), termsUrl)],
              [Markup.button.callback(t('accept', lang), 'accept_terms')],
              [Markup.button.callback(t('decline', lang), 'decline_terms')],
            ]),
          }
        );
      } else {
        throw editError;
      }
    }
  } catch (error) {
    logger.error('Error in age confirmation:', error);
    const lang = getUserLanguage(ctx);
    await ctx.reply(t('error', lang));
  }
}

/**
 * Handle terms acceptance
 */
async function handleTermsAcceptance(ctx) {
  try {
    await ctx.answerCbQuery();

    const lang = getUserLanguage(ctx);
    const userId = ctx.from.id;

    // Update session and database
    ctx.session.termsAccepted = true;
    ctx.session.onboardingStep = 'email';
    ctx.session.awaitingEmail = true;

    await userModel.updateUser(userId, { termsAccepted: true });

    logger.info(`Terms accepted by user ${userId}`);

    // Show email prompt
    try {
      await ctx.editMessageText(
        t('emailPrompt', lang),
        { parse_mode: 'Markdown' }
      );
    } catch (editError) {
      if (editError.description?.includes('message is not modified') ||
          editError.description?.includes('message to edit not found')) {
        await ctx.reply(t('emailPrompt', lang), { parse_mode: 'Markdown' });
      } else {
        throw editError;
      }
    }
  } catch (error) {
    logger.error('Error in terms acceptance:', error);
    const lang = getUserLanguage(ctx);
    await ctx.reply(t('error', lang));
  }
}

/**
 * Handle terms decline
 */
async function handleTermsDecline(ctx) {
  try {
    await ctx.answerCbQuery();

    const lang = getUserLanguage(ctx);
    logger.info(`Terms declined by user ${ctx.from.id}`);

    try {
      await ctx.editMessageText(t('termsDeclined', lang), { parse_mode: 'Markdown' });
    } catch (editError) {
      if (editError.description?.includes('message is not modified') ||
          editError.description?.includes('message to edit not found')) {
        await ctx.reply(t('termsDeclined', lang), { parse_mode: 'Markdown' });
      } else {
        throw editError;
      }
    }

    // Clear session
    ctx.session = {};
  } catch (error) {
    logger.error('Error in terms decline:', error);
  }
}

/**
 * Handle email submission
 */
async function handleEmailSubmission(ctx) {
  try {
    const lang = getUserLanguage(ctx);
    const email = ctx.message.text.trim().toLowerCase();
    const userId = ctx.from.id;

    // Validate email
    if (!isValidEmail(email)) {
      logger.warn(`Invalid email submitted by user ${userId}: ${email}`);
      return await ctx.reply(t('emailInvalid', lang), { parse_mode: 'Markdown' });
    }

    // Update session and database
    ctx.session.email = email;
    ctx.session.awaitingEmail = false;
    ctx.session.onboardingStep = 'freeChannelInvite';

    await userModel.updateUser(userId, { email, emailVerified: false });

    logger.info(`Email confirmed for user ${userId}: ${email}`);

    // Send confirmation
    await ctx.reply(t('emailConfirmed', lang, { email }), { parse_mode: 'Markdown' });

    // Generate and send channel invites
    await sendChannelInvites(ctx);

    // Move to privacy policy step
    ctx.session.onboardingStep = 'privacy';

    const privacyUrl = process.env.PRIVACY_URL || 'https://pnptv.app/privacy';

    await ctx.reply(
      t('privacy', lang, { privacyUrl }),
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url(t('privacyButton', lang), privacyUrl)],
          [Markup.button.callback(t('accept', lang), 'accept_privacy')],
          [Markup.button.callback(t('decline', lang), 'decline_privacy')],
        ]),
      }
    );
  } catch (error) {
    logger.error('Error in email submission:', error);
    const lang = getUserLanguage(ctx);
    await ctx.reply(t('error', lang));
  }
}

/**
 * Send free channel and group invites
 */
async function sendChannelInvites(ctx) {
  const lang = getUserLanguage(ctx);
  const userId = ctx.from.id;

  try {
    const freeChannelId = process.env.FREE_CHANNEL_ID || '-1003159260496';
    const freeGroupId = process.env.FREE_GROUP_ID || '-1003291737499';

    // Generate channel invite
    try {
      const channelInvite = await ctx.telegram.createChatInviteLink(freeChannelId, {
        member_limit: 1,
        name: `Free - User ${userId}`,
      });

      logger.info(`Channel invite created for user ${userId}: ${channelInvite.invite_link}`);

      await ctx.reply(
        t('freeChannelInvite', lang, { inviteLink: channelInvite.invite_link }),
        {
          parse_mode: 'Markdown',
          disable_web_page_preview: false,
        }
      );
    } catch (channelError) {
      logger.error(`Failed to create channel invite for user ${userId}:`, channelError);
      await ctx.reply(t('freeChannelInviteError', lang), { parse_mode: 'Markdown' });
    }

    // Generate group invite
    try {
      const groupInvite = await ctx.telegram.createChatInviteLink(freeGroupId, {
        member_limit: 1,
        name: `Free - User ${userId}`,
      });

      logger.info(`Group invite created for user ${userId}: ${groupInvite.invite_link}`);

      await ctx.reply(
        `🎁 *Free Group Access*\n\nJoin our community group:\n\n${groupInvite.invite_link}`,
        {
          parse_mode: 'Markdown',
          disable_web_page_preview: false,
        }
      );
    } catch (groupError) {
      logger.error(`Failed to create group invite for user ${userId}:`, groupError);
      // Non-blocking - continue without group invite
    }
  } catch (error) {
    logger.error(`Error sending channel invites for user ${userId}:`, error);
    // Non-blocking - continue onboarding even if invites fail
  }
}

/**
 * Handle privacy acceptance
 */
async function handlePrivacyAcceptance(ctx) {
  try {
    await ctx.answerCbQuery();

    const lang = getUserLanguage(ctx);
    const userId = ctx.from.id;

    // Update session and database
    ctx.session.privacyAccepted = true;
    ctx.session.onboardingComplete = true;

    await userModel.updateUser(userId, {
      privacyAccepted: true,
      onboardingComplete: true,
      lastActive: new Date(),
    });

    logger.info(`Privacy accepted and onboarding completed for user ${userId}`);

    // Send completion message
    try {
      await ctx.editMessageText(
        t('profileCreated', lang) + '\n\n' + t('onboardingComplete', lang),
        { parse_mode: 'Markdown' }
      );
    } catch (editError) {
      if (editError.description?.includes('message is not modified') ||
          editError.description?.includes('message to edit not found')) {
        await ctx.reply(
          t('profileCreated', lang) + '\n\n' + t('onboardingComplete', lang),
          { parse_mode: 'Markdown' }
        );
      } else {
        throw editError;
      }
    }

    // Auto-activate Free tier membership if enabled
    if (process.env.AUTO_ACTIVATE_FREE_USERS === 'true') {
      try {
        await activateMembership(userId, 'Free', 'system', 0, ctx.telegram);
        logger.info(`Free tier auto-activated for user ${userId}`);
      } catch (activationError) {
        logger.error(`Failed to auto-activate Free tier for user ${userId}:`, activationError);
        // Non-blocking - continue even if activation fails
      }
    }

    // Wait a moment then show main menu
    setTimeout(async () => {
      await showMainMenu(ctx);
    }, 2000);
  } catch (error) {
    logger.error('Error in privacy acceptance:', error);
    const lang = getUserLanguage(ctx);
    await ctx.reply(t('error', lang));
  }
}

/**
 * Handle privacy decline
 */
async function handlePrivacyDecline(ctx) {
  try {
    await ctx.answerCbQuery();

    const lang = getUserLanguage(ctx);
    logger.info(`Privacy policy declined by user ${ctx.from.id}`);

    try {
      await ctx.editMessageText(t('privacyDeclined', lang), { parse_mode: 'Markdown' });
    } catch (editError) {
      if (editError.description?.includes('message is not modified') ||
          editError.description?.includes('message to edit not found')) {
        await ctx.reply(t('privacyDeclined', lang), { parse_mode: 'Markdown' });
      } else {
        throw editError;
      }
    }

    // Clear session
    ctx.session = {};
  } catch (error) {
    logger.error('Error in privacy decline:', error);
  }
}

export default registerOnboardingHandlers;

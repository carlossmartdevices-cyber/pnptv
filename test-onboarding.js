/**
 * Test Onboarding Flow
 * Run this to test the onboarding feature without full infrastructure
 */

import 'dotenv/config';
import { Telegraf, Markup } from 'telegraf';
import { t, setUserLanguage, getUserLanguage } from './src/utils/i18n.js';
import { isValidEmail } from './src/utils/validation.js';

// Create bot instance
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Simple in-memory session store for testing
const sessions = new Map();

// Session middleware
bot.use((ctx, next) => {
  const userId = ctx.from?.id;
  if (userId) {
    if (!sessions.has(userId)) {
      sessions.set(userId, {
        userId,
        username: ctx.from.username,
        language: ctx.from.language_code?.split('-')[0] || 'en',
      });
    }
    ctx.session = sessions.get(userId);
  }
  return next();
});

// Start command - begin onboarding
bot.command('start', async (ctx) => {
  console.log('📱 User started onboarding:', ctx.from.id, ctx.from.username);

  await ctx.reply(
    '🌐 Welcome to PNPtv! / ¡Bienvenido a PNPtv!\n\nPlease select your language / Por favor selecciona tu idioma:',
    Markup.inlineKeyboard([
      [Markup.button.callback('🇺🇸 English', 'lang_en')],
      [Markup.button.callback('🇪🇸 Español', 'lang_es')],
    ])
  );
});

// Language selection
bot.action(/lang_(en|es)/, async (ctx) => {
  const lang = ctx.match[1];
  setUserLanguage(ctx, lang);

  console.log('🌐 Language selected:', lang, 'by user:', ctx.from.id);

  await ctx.editMessageText(
    t('ageConfirmation', lang),
    Markup.inlineKeyboard([
      [Markup.button.callback(t('ageYes', lang), 'age_yes')],
      [Markup.button.callback(t('ageNo', lang), 'age_no')],
    ])
  );
});

// Age confirmation - Yes
bot.action('age_yes', async (ctx) => {
  const lang = getUserLanguage(ctx);
  ctx.session.age18Plus = true;

  console.log('✅ Age confirmed by user:', ctx.from.id);

  await ctx.editMessageText(
    t('termsAcceptance', lang),
    Markup.inlineKeyboard([
      [
        Markup.button.url(t('termsButton', lang), process.env.TERMS_URL || 'https://pnptv.app/terms'),
        Markup.button.url(t('privacyButton', lang), process.env.PRIVACY_URL || 'https://pnptv.app/privacy'),
      ],
      [Markup.button.callback(t('acceptTerms', lang), 'terms_accept')],
      [Markup.button.callback(t('declineTerms', lang), 'terms_decline')],
    ])
  );
});

// Age confirmation - No
bot.action('age_no', async (ctx) => {
  const lang = getUserLanguage(ctx);

  console.log('❌ Age declined by user:', ctx.from.id);

  await ctx.editMessageText(t('ageRestriction', lang));
});

// Terms acceptance
bot.action('terms_accept', async (ctx) => {
  const lang = getUserLanguage(ctx);
  ctx.session.termsAccepted = true;

  console.log('📝 Terms accepted by user:', ctx.from.id);

  await ctx.editMessageText(
    t('emailRequest', lang),
    Markup.inlineKeyboard([
      [Markup.button.callback(t('emailSkip', lang), 'email_skip')],
    ])
  );

  // Set state to wait for email
  ctx.session.waitingForEmail = true;
});

// Terms decline
bot.action('terms_decline', async (ctx) => {
  const lang = getUserLanguage(ctx);

  console.log('❌ Terms declined by user:', ctx.from.id);

  await ctx.editMessageText(t('termsDeclined', lang));
});

// Email skip
bot.action('email_skip', async (ctx) => {
  console.log('⏭️  Email skipped by user:', ctx.from.id);
  await finishOnboarding(ctx, null);
});

// Listen for email input
bot.on('text', async (ctx) => {
  if (ctx.session.waitingForEmail) {
    const lang = getUserLanguage(ctx);
    const email = ctx.message.text;

    console.log('📧 Email received:', email, 'from user:', ctx.from.id);

    if (isValidEmail(email)) {
      ctx.session.waitingForEmail = false;
      await finishOnboarding(ctx, email);
    } else {
      console.log('❌ Invalid email format');
      await ctx.reply(
        t('emailInvalid', lang),
        Markup.inlineKeyboard([
          [Markup.button.callback(t('emailSkip', lang), 'email_skip')],
        ])
      );
    }
  }
});

/**
 * Complete onboarding process
 */
async function finishOnboarding(ctx, email) {
  const lang = getUserLanguage(ctx);

  console.log('🎉 Onboarding completed for user:', ctx.from.id);
  console.log('   Language:', lang);
  console.log('   Age 18+:', ctx.session.age18Plus);
  console.log('   Terms accepted:', ctx.session.termsAccepted);
  console.log('   Email:', email || 'Not provided');

  // Store completion in session
  ctx.session.onboardingCompleted = true;
  ctx.session.email = email;

  await ctx.reply(
    t('onboardingComplete', lang) + '\n\n' + t('mainMenuIntro', lang),
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback(t('subscribe', lang), 'show_subscription_plans'),
          Markup.button.callback(t('myProfile', lang), 'show_profile'),
        ],
        [
          Markup.button.callback(t('nearbyUsers', lang), 'show_nearby'),
          Markup.button.callback(t('liveStreams', lang), 'show_live'),
        ],
        [
          Markup.button.callback(t('radio', lang), 'show_radio'),
          Markup.button.callback(t('zoomRooms', lang), 'show_zoom'),
        ],
        [
          Markup.button.callback(t('support', lang), 'show_support'),
          Markup.button.callback(t('settings', lang), 'show_settings'),
        ],
      ]),
    }
  );

  // Clear onboarding session data
  delete ctx.session.age18Plus;
  delete ctx.session.termsAccepted;
  delete ctx.session.waitingForEmail;

  console.log('✅ Main menu displayed to user:', ctx.from.id);
}

// Placeholder handlers for main menu (just log for now)
bot.action('show_subscription_plans', async (ctx) => {
  console.log('💎 User clicked: Subscription Plans');
  await ctx.answerCbQuery('Feature test: Subscription Plans');
});

bot.action('show_profile', async (ctx) => {
  console.log('👤 User clicked: My Profile');
  await ctx.answerCbQuery('Feature test: My Profile');
});

bot.action('show_nearby', async (ctx) => {
  console.log('🌍 User clicked: Nearby Users');
  await ctx.answerCbQuery('Feature test: Nearby Users');
});

bot.action('show_live', async (ctx) => {
  console.log('🎤 User clicked: Live Streams');
  await ctx.answerCbQuery('Feature test: Live Streams');
});

bot.action('show_radio', async (ctx) => {
  console.log('📻 User clicked: Radio');
  await ctx.answerCbQuery('Feature test: Radio');
});

bot.action('show_zoom', async (ctx) => {
  console.log('🎥 User clicked: Zoom Rooms');
  await ctx.answerCbQuery('Feature test: Zoom Rooms');
});

bot.action('show_support', async (ctx) => {
  console.log('🤖 User clicked: Support');
  await ctx.answerCbQuery('Feature test: Support');
});

bot.action('show_settings', async (ctx) => {
  console.log('⚙️ User clicked: Settings');
  await ctx.answerCbQuery('Feature test: Settings');
});

// Error handler
bot.catch((err, ctx) => {
  console.error('❌ Error:', err);
  ctx.reply('An error occurred. Please try again.');
});

// Launch bot
console.log('🚀 Starting onboarding test bot...');
console.log('📱 Bot token:', process.env.TELEGRAM_BOT_TOKEN.substring(0, 20) + '...');
console.log('\n📋 Test Steps:');
console.log('1. Open Telegram and find your bot: @' + process.env.BOT_USERNAME);
console.log('2. Send /start command');
console.log('3. Follow the onboarding flow:');
console.log('   - Select language (English or Spanish)');
console.log('   - Confirm age (18+)');
console.log('   - Accept terms');
console.log('   - Provide email (or skip)');
console.log('4. You should see the main menu at the end');
console.log('\n✅ All actions are logged to console\n');

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

/**
 * Subscription Plans Handler
 */

import { Markup } from 'telegraf';
import { t, getUserLanguage } from '../../../../utils/i18n.js';
import { PLANS } from '../../../services/subscriptionService.js';
import { createPayment } from '../../../models/paymentModel.js';
import logger from '../../../../utils/logger.js';
import axios from 'axios';

/**
 * Register subscription handlers
 */
export function registerSubscriptionHandlers(bot) {
  // Show subscription plans
  bot.action('show_subscription_plans', async (ctx) => {
    await showSubscriptionPlans(ctx);
  });

  // Select plan
  bot.action(/select_plan_(basic|premium|gold)/, async (ctx) => {
    const planId = ctx.match[1];
    await showPaymentMethods(ctx, planId);
  });

  // Select payment method
  bot.action(/payment_(epayco|daimo)_(.+)/, async (ctx) => {
    const paymentMethod = ctx.match[1];
    const planId = ctx.match[2];
    await initiatePayment(ctx, planId, paymentMethod);
  });
}

/**
 * Show subscription plans
 */
async function showSubscriptionPlans(ctx) {
  try {
    const lang = getUserLanguage(ctx);

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback(`${t('planBasic', lang)}`, 'select_plan_basic')],
      [Markup.button.callback(`${t('planPremium', lang)}`, 'select_plan_premium')],
      [Markup.button.callback(`${t('planGold', lang)}`, 'select_plan_gold')],
      [Markup.button.callback(t('back', lang), 'main_menu')],
    ]);

    const message = `${t('subscriptionPlans', lang)}\\n\\n` +
      `🥉 **${PLANS.basic.name}** - $${PLANS.basic.priceUSD}/month\\n${t('planBasicDesc', lang)}\\n\\n` +
      `🥈 **${PLANS.premium.name}** - $${PLANS.premium.priceUSD}/month\\n${t('planPremiumDesc', lang)}\\n\\n` +
      `🥇 **${PLANS.gold.name}** - $${PLANS.gold.priceUSD}/month\\n${t('planGoldDesc', lang)}`;

    if (ctx.callbackQuery) {
      await ctx.editMessageText(message, { parse_mode: 'Markdown', ...keyboard });
    } else {
      await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
    }
  } catch (error) {
    logger.error('Error showing subscription plans:', error);
  }
}

/**
 * Show payment methods
 */
async function showPaymentMethods(ctx, planId) {
  try {
    const lang = getUserLanguage(ctx);
    const plan = PLANS[planId];

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback(t('paymentEpayco', lang), `payment_epayco_${planId}`)],
      [Markup.button.callback(t('paymentDaimo', lang), `payment_daimo_${planId}`)],
      [Markup.button.callback(t('back', lang), 'show_subscription_plans')],
    ]);

    await ctx.editMessageText(
      `💎 **${plan.name} Plan** - $${plan.priceUSD}/month\\n\\n${t('selectPaymentMethod', lang)}`,
      { parse_mode: 'Markdown', ...keyboard }
    );
  } catch (error) {
    logger.error('Error showing payment methods:', error);
  }
}

/**
 * Initiate payment
 */
async function initiatePayment(ctx, planId, paymentMethod) {
  try {
    const lang = getUserLanguage(ctx);
    const plan = PLANS[planId];
    const userId = ctx.from.id;

    // Create payment record
    const payment = await createPayment({
      userId,
      planId,
      amount: plan.priceUSD,
      currency: paymentMethod === 'daimo' ? 'USDC' : 'USD',
      paymentMethod,
    });

    let paymentUrl;

    if (paymentMethod === 'epayco') {
      // Generate ePayco payment link
      paymentUrl = await generateEpaycoLink(payment, plan, ctx.from);
    } else if (paymentMethod === 'daimo') {
      // Generate Daimo payment link
      paymentUrl = await generateDaimoLink(payment, plan);
    }

    // Update payment with URL
    // await updatePaymentStatus(payment.paymentId, 'pending', null);

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.url('💳 Complete Payment', paymentUrl)],
      [Markup.button.callback(t('back', lang), 'show_subscription_plans')],
    ]);

    await ctx.editMessageText(
      `${t('paymentInstructions', lang)}\\n\\n💰 **Amount:** $${plan.priceUSD}\\n📦 **Plan:** ${plan.name}\\n\\n${t('paymentPending', lang)}`,
      { parse_mode: 'Markdown', ...keyboard }
    );
  } catch (error) {
    logger.error('Error initiating payment:', error);
    await ctx.reply(t('error', getUserLanguage(ctx)));
  }
}

/**
 * Generate ePayco payment link
 */
async function generateEpaycoLink(payment, plan, user) {
  try {
    // ePayco API integration
    const epaycoUrl = 'https://api.secure.payco.co/v1/charges/create';

    const data = {
      public_key: process.env.EPAYCO_PUBLIC_KEY,
      name: `PNPtv ${plan.name} Subscription`,
      description: `${plan.name} subscription for ${user.username || user.first_name}`,
      currency: 'usd',
      amount: plan.priceUSD,
      tax_base: 0,
      tax: 0,
      country: 'co',
      lang: 'en',
      external: 'false',
      extra1: payment.paymentId,
      extra2: payment.userId,
      extra3: payment.planId,
      confirmation: `${process.env.WEBAPP_URL || 'https://api.pnptv.com'}/api/webhooks/epayco`,
      response: `${process.env.WEBAPP_URL || 'https://pnptv.com'}/payment-success`,
    };

    const response = await axios.post(epaycoUrl, data);

    return response.data.data.url_payment || response.data.data.link;
  } catch (error) {
    logger.error('Error generating ePayco link:', error);
    // Return fallback URL
    return `${process.env.WEBAPP_URL || 'https://pnptv.com'}/subscribe?plan=${plan.id}`;
  }
}

/**
 * Generate Daimo payment link
 */
async function generateDaimoLink(payment, plan) {
  try {
    // Daimo Pay integration (example)
    const daimoUrl = `https://daimo.com/pay`;

    const params = new URLSearchParams({
      amount: plan.priceUSD,
      currency: 'USDC',
      recipient: process.env.DAIMO_RECIPIENT_ADDRESS || 'your_address',
      memo: `PNPtv ${plan.name} - Payment ID: ${payment.paymentId}`,
      callback: `${process.env.WEBAPP_URL}/api/webhooks/daimo`,
    });

    return `${daimoUrl}?${params.toString()}`;
  } catch (error) {
    logger.error('Error generating Daimo link:', error);
    return `${process.env.WEBAPP_URL || 'https://pnptv.com'}/subscribe?plan=${plan.id}`;
  }
}

export default registerSubscriptionHandlers;

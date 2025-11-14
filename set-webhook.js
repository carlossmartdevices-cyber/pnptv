// set-webhook.js
import https from 'https';

const BOT_TOKEN = '8499797477:AAHZ0EpnK9zmxY_ZN7yAPsrW_11qoAjsrRY';
const WEBHOOK_URL = 'https://pnptv.app/api/bot/webhook'; // Change if your endpoint differs

const apiUrl = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${encodeURIComponent(WEBHOOK_URL)}`;

https.get(apiUrl, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Telegram response:', data);
  });
}).on('error', (err) => {
  console.error('Error setting webhook:', err);
});
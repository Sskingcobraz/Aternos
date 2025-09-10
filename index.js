// index.js
require('dotenv').config();
const mineflayer = require('mineflayer');
const express = require('express');

const MC_HOST = process.env.MC_HOST || 'RunderSmpS2.aternos.me';
const MC_PORT = parseInt(process.env.MC_PORT || '50337', 10);
const MC_USERNAME = process.env.MC_USERNAME || 'AFKBot';
const MC_PASSWORD = process.env.MC_PASSWORD || '';
const MC_VERSION = process.env.MC_VERSION || false; // 'auto' or specific version, or false

const WEB_PORT = parseInt(process.env.PORT || '3000', 10);
const AFK_INTERVAL = parseInt(process.env.AFK_INTERVAL || '60000', 10); // ms
const RECONNECT_TIMEOUT = parseInt(process.env.RECONNECT_TIMEOUT || '5000', 10); // ms

let bot = null;
let afkIntervalId = null;

function startBot() {
  console.log(`Starting bot -> host=${MC_HOST} port=${MC_PORT} username=${MC_USERNAME}`);

  const options = {
    host: MC_HOST,
    port: MC_PORT,
    username: MC_USERNAME,
    ...(MC_PASSWORD ? { password: MC_PASSWORD } : {}),
    ...(MC_VERSION && MC_VERSION !== 'auto' ? { version: MC_VERSION } : {})
  };

  bot = mineflayer.createBot(options);

  bot.once('spawn', () => {
    console.log('✅ Bot spawned and connected to server.');

    // Clear any previous intervals
    if (afkIntervalId) clearInterval(afkIntervalId);

    // Anti-AFK: periodic jump
    afkIntervalId = setInterval(() => {
      try {
        bot.setControlState('jump', true);
        setTimeout(() => {
          try { bot.setControlState('jump', false); } catch (e) {}
        }, 200);
      } catch (err) {
        console.warn('AFK jump error:', err.message || err);
      }
    }, AFK_INTERVAL);
  });

  bot.on('kicked', (reason) => {
    console.warn('Bot was kicked:', reason);
  });

  bot.on('end', () => {
    console.warn(`⚠️ Bot disconnected. Reconnecting in ${RECONNECT_TIMEOUT}ms...`);
    if (afkIntervalId) {
      clearInterval(afkIntervalId);
      afkIntervalId = null;
    }
    setTimeout(startBot, RECONNECT_TIMEOUT);
  });

  bot.on('error', (err) => {
    console.error('Bot error:', err.message || err);
  });

  bot.on('message', (msg) => {
    // Silent by default, can add chat reactions here
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received: shutting down bot gracefully...');
    if (afkIntervalId) clearInterval(afkIntervalId);
    if (bot) bot.quit('Shutting down');
    process.exit(0);
  });
}

// Start bot
startBot();

// Express server for keepalive / health checks
const app = express();

app.get('/', (req, res) => {
  res.send('OK — AFK bot process is running.');
});

app.get('/health', (req, res) => {
  const alive = !!(bot && bot.entity && bot.entity.position);
  res.json({ alive, username: bot ? (bot.username || bot.user?.username) : null });
});

const WEB_PORT = Number(process.env.PORT) || 3000;

app.listen(WEB_PORT, () => {
  console.log(`🌍 Web status server listening on port ${WEB_PORT}`);
});

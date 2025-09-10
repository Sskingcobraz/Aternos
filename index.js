// index.js
require('dotenv').config();
const mineflayer = require('mineflayer');
const express = require('express');

// ----------------- CONFIG -----------------
const MC_HOST = process.env.MC_HOST || 'RunderSmpS2.aternos.me';
const MC_PORT = Number(process.env.MC_PORT) || 50337;
const MC_USERNAME = process.env.MC_USERNAME || 'AFKBot';
const MC_PASSWORD = process.env.MC_PASSWORD || ''; // Leave blank if AuthMe is handling login
const MC_VERSION = process.env.MC_VERSION || false; // 'auto' or specific version

const AFK_INTERVAL = Number(process.env.AFK_INTERVAL) || 60000; // ms
const RECONNECT_TIMEOUT = Number(process.env.RECONNECT_TIMEOUT) || 5000; // ms
const WEB_PORT = Number(process.env.PORT) || 3000; // Render provides PORT

let bot = null;
let afkIntervalId = null;

// ----------------- BOT FUNCTION -----------------
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

    // ----------------- LOGIN FOR AUTHME -----------------
    setTimeout(() => {
      // Replace 'ADKBOT' with your actual password
      bot.chat('/login ADKBOT');
      console.log('Sent /login command for AuthMe.');
    }, 1000); // 1 second delay to ensure server is ready

    // ----------------- ANTI-AFK -----------------
    if (afkIntervalId) clearInterval(afkIntervalId);

    afkIntervalId = setInterval(() => {
      try {
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 200);
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
    // Optional: handle chat messages here
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received: shutting down bot gracefully...');
    if (afkIntervalId) clearInterval(afkIntervalId);
    if (bot) bot.quit('Shutting down');
    process.exit(0);
  });
}

// ----------------- START BOT -----------------
startBot();

// ----------------- EXPRESS WEB SERVER -----------------
const app = express();

app.get('/', (req, res) => {
  res.send('OK — AFK bot process is running.');
});

app.get('/health', (req, res) => {
  const alive = !!(bot && bot.entity && bot.entity.position);
  res.json({ alive, username: bot ? (bot.username || bot.user?.username) : null });
});

app.listen(WEB_PORT, () => {
  console.log(`🌍 Web status server listening on port ${WEB_PORT}`);
});

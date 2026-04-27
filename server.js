const express = require('express');
const { createClient } = require('redis');
const getGWSession = require('./app');

const app = express();
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const redisKey = process.env.REDIS_KEY || 'gw:wsession';
const defaultTtlSeconds = Number(process.env.REDIS_TTL_SECONDS || 3600);
const ttlCookieNames = (process.env.REDIS_TTL_COOKIE_NAMES || 'GWSESSION')
  .split(',')
  .map(name => name.trim())
  .filter(Boolean);

const redis = createClient({ url: redisUrl });

redis.on('error', err => {
  console.error('Redis error:', err.message);
});

function getCookieTtlSeconds(cookies) {
  const nowSeconds = Math.floor(Date.now() / 1000);

  const ttlCookies = cookies.filter(cookie => ttlCookieNames.includes(cookie.name));
  const candidates = ttlCookies.length > 0 ? ttlCookies : cookies;

  const futureExpires = candidates
    .map(cookie => Number(cookie.expires))
    .filter(expires => Number.isFinite(expires) && expires > nowSeconds);

  if (futureExpires.length === 0) {
    return defaultTtlSeconds;
  }

  return Math.max(1, Math.min(...futureExpires) - nowSeconds);
}

async function saveSessionToRedis(session) {
  if (!redis.isOpen) {
    await redis.connect();
  }

  const ttlSeconds = getCookieTtlSeconds(session);
  const payload = {
    wsession: session,
    savedAt: new Date().toISOString(),
    expiresInSeconds: ttlSeconds,
  };

  await redis.set(redisKey, JSON.stringify(payload), {
    EX: ttlSeconds,
  });

  return ttlSeconds;
}

app.get('/get-wsession', async (req, res) => {
  try {
    const session = await getGWSession();
    const ttlSeconds = await saveSessionToRedis(session);

    res.json({
      wsession: session,
      redis: {
        key: redisKey,
        ttlSeconds,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/wsession-cache', async (req, res) => {
  try {
    if (!redis.isOpen) {
      await redis.connect();
    }

    const value = await redis.get(redisKey);
    const ttlSeconds = await redis.ttl(redisKey);

    if (!value) {
      res.status(404).json({ error: 'No cached wsession found', key: redisKey });
      return;
    }

    res.json({
      key: redisKey,
      ttlSeconds,
      value: JSON.parse(value),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, host, () => {
  console.log(`Server is running at http://${host}:${port}`);
});

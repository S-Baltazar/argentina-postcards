const fs = require('fs');
const path = require('path');

const BUNDLED_DB_PATH = path.join(__dirname, 'data.json');
const DB_PATH = process.env.VERCEL ? '/tmp/data.json' : BUNDLED_DB_PATH;
const REDIS_KEY = 'postales_vintage:db';

function getRedisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return { url: url.replace(/\/$/, ''), token };
  return null;
}

function getSeedData() {
  if (fs.existsSync(BUNDLED_DB_PATH)) {
    const seed = JSON.parse(fs.readFileSync(BUNDLED_DB_PATH, 'utf8'));
    if (!Array.isArray(seed.friendRequests)) seed.friendRequests = [];
    return seed;
  }
  return { users: [], friendships: [], friendRequests: [], letters: [] };
}

function normalizeDb(raw) {
  let data = raw;
  while (typeof data === 'string') {
    data = JSON.parse(data);
  }
  if (!data || typeof data !== 'object') return getSeedData();
  if (!Array.isArray(data.users)) data.users = [];
  if (!Array.isArray(data.friendships)) data.friendships = [];
  if (!Array.isArray(data.friendRequests)) data.friendRequests = [];
  if (!Array.isArray(data.letters)) data.letters = [];
  return data;
}

async function redisCommand(redis, commandArgs) {
  const res = await fetch(redis.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${redis.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(commandArgs)
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Redis error ${res.status}: ${errText}`);
  }
  return res.json();
}

async function loadDb() {
  const redis = getRedisConfig();
  if (redis) {
    const json = await redisCommand(redis, ['GET', REDIS_KEY]);
    if (json.result) {
      return normalizeDb(json.result);
    }
    const seed = getSeedData();
    await saveDb(seed);
    return seed;
  }

  if (!fs.existsSync(DB_PATH)) {
    const seed = getSeedData();
    fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2));
    return seed;
  }
  return normalizeDb(fs.readFileSync(DB_PATH, 'utf8'));
}

async function saveDb(data) {
  const redis = getRedisConfig();
  if (redis) {
    await redisCommand(redis, ['SET', REDIS_KEY, JSON.stringify(data)]);
    return;
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

module.exports = { loadDb, saveDb };

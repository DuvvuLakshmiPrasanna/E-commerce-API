// Redis configuration with in-memory fallback
const { createClient } = require('redis');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redisClient = createClient({
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries) => {
      const delay = Math.min(retries * 50, 500);
      return delay;
    },
  },
});

// In-memory fallback store
const memoryStore = new Map();
const expirations = new Map();

const setMemory = (key, value, ttlSeconds) => {
  memoryStore.set(key, value);
  if (expirations.has(key)) {
    clearTimeout(expirations.get(key));
    expirations.delete(key);
  }
  if (ttlSeconds && ttlSeconds > 0) {
    const to = setTimeout(() => {
      memoryStore.delete(key);
      expirations.delete(key);
    }, ttlSeconds * 1000);
    expirations.set(key, to);
  }
};

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err.message || err);
});

redisClient.on('connect', () => {
  console.log('Redis connected successfully');
});

redisClient.on('reconnecting', () => {
  console.log('Redis reconnecting...');
});

// Export a wrapper that provides get/setEx/keys/del and falls back to memoryStore
module.exports = {
  async connect() {
    try {
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }
    } catch (err) {
      console.warn('Redis connect failed, using in-memory fallback');
    }
  },
  async get(key) {
    try {
      if (redisClient.isOpen) return await redisClient.get(key);
    } catch (err) {
      // fallthrough to memory
    }
    return memoryStore.has(key) ? memoryStore.get(key) : null;
  },
  async setEx(key, ttlSeconds, value) {
    try {
      if (redisClient.isOpen) return await redisClient.setEx(key, ttlSeconds, value);
    } catch (err) {
      // fallthrough
    }
    setMemory(key, value, ttlSeconds);
    return 'OK';
  },
  async keys(pattern) {
    try {
      if (redisClient.isOpen) return await redisClient.keys(pattern);
    } catch (err) {
      // fallthrough
    }
    // very simple glob support for trailing *
    if (!pattern) return Array.from(memoryStore.keys());
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      return Array.from(memoryStore.keys()).filter((k) => k.startsWith(prefix));
    }
    // exact match
    return Array.from(memoryStore.keys()).filter((k) => k === pattern);
  },
  async del(keys) {
    try {
      if (redisClient.isOpen) return await redisClient.del(keys);
    } catch (err) {
      // fallthrough
    }
    if (Array.isArray(keys)) {
      let count = 0;
      for (const k of keys) {
        if (memoryStore.delete(k)) count++;
      }
      return count;
    }
    return memoryStore.delete(keys) ? 1 : 0;
  },
};

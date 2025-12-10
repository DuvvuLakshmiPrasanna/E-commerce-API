const { createClient } = require('redis');

const create = (opts = {}) => {
  const url = process.env.REDIS_URL || opts.url || 'redis://localhost:6379';
  const client = createClient({ url });

  client.on('error', (err) => {
    // do not crash tests when redis is not available
    console.warn('Redis client error (helper):', err.message);
  });

  const connect = async () => {
    if (!client.isOpen) {
      try {
        await client.connect();
      } catch (err) {
        // ignore
      }
    }
  };

  const delPattern = async (pattern) => {
    await connect();
    try {
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(keys);
      }
      return keys.length;
    } catch (err) {
      console.warn('delPattern error:', err.message);
      return 0;
    }
  };

  return {
    client,
    connect,
    delPattern,
  };
};

module.exports = create;

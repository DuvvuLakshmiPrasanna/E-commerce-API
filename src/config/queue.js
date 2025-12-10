// BullMQ Queue configuration
const { Queue } = require('bullmq');
const net = require('net');

// Probe Redis before creating Queue; if Redis isn't reachable, export a safe no-op stub.
const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379;

const probeRedis = () => new Promise((resolve) => {
  const socket = net.createConnection({ host: redisHost, port: redisPort, timeout: 400 }, () => {
    socket.destroy();
    resolve(true);
  });
  socket.on('error', () => resolve(false));
  socket.on('timeout', () => { socket.destroy(); resolve(false); });
});

// We'll create a proxy object that always exposes `add` and `on` so other modules
// can call `emailQueue.add(...)` synchronously even while initialization runs.
let realQueue = null;
let initDone = false;
const initPromise = (async () => {
  const ok = await probeRedis();
  if (!ok) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Could not initialize BullMQ email queue (Redis not reachable); using no-op stub.');
    }
    // leave realQueue as null -> proxy will use stub behavior
    initDone = true;
    return;
  }

  try {
    realQueue = new Queue('email-notifications', {
      connection: {
        host: redisHost,
        port: redisPort,
      },
    });

    realQueue.on('error', (err) => {
      console.error('Email Queue Error:', err);
    });

    initDone = true;
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Could not initialize BullMQ email queue; falling back to no-op.');
    }
    realQueue = null;
    initDone = true;
  }
})();

const stubQueue = {
  add: async (name, data, opts) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`(stub) queued job ${name}`, data ? Object.keys(data) : '');
    }
    return Promise.resolve({ stub: true });
  },
  on: () => {},
};

const emailQueue = {
  async add(name, data, opts) {
    // wait for init to finish but don't block forever
    try {
      await initPromise;
    } catch (_) {
      // ignore
    }
    if (realQueue && typeof realQueue.add === 'function') {
      return realQueue.add(name, data, opts);
    }
    return stubQueue.add(name, data, opts);
  },
  on(event, handler) {
    // attach handler to real queue if available, otherwise noop
    (async () => {
      await initPromise;
      if (realQueue && typeof realQueue.on === 'function') {
        realQueue.on(event, handler);
      }
    })();
  },
  // expose a helper to know whether we're using a stub
  isStub() {
    return !realQueue;
  }
};

module.exports = { emailQueue };

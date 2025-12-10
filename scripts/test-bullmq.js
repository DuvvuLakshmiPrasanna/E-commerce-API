#!/usr/bin/env node
/**
 * Test script to enqueue a sample email job directly to BullMQ
 * Usage: node scripts/test-bullmq.js
 * Requires Redis running and the worker (src/workers/emailWorker.js) started in another terminal.
 */
const { Queue } = require('bullmq');

const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
};

async function run() {
  try {
    const q = new Queue('email-notifications', { connection });
    const job = await q.add('sendOrderConfirmation', {
      orderId: -1,
      userEmail: process.env.TEST_EMAIL || 'test@example.com',
      userName: 'Test User',
      totalPrice: 1.23,
      itemCount: 1,
    });
    console.log('Enqueued job id=', job.id);
    await q.close();
    console.log('Done. Check your worker terminal for processing logs.');
  } catch (err) {
    console.error('Failed to enqueue job:', err.message);
    process.exit(1);
  }
}

run();

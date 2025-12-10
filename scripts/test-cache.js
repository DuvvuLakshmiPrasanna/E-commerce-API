#!/usr/bin/env node
/**
 * Test script for Redis caching of GET /products
 * Usage: node scripts/test-cache.js
 * Optional env:
 *   BASE_URL (default http://localhost:3000)
 *   REDIS_URL (default redis://localhost:6379)
 */
const RedisHelper = require('../utils/redisHelper');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const redis = RedisHelper({ url: process.env.REDIS_URL });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  await redis.connect();

  console.log('Clearing product caches...');
  const removed = await redis.delPattern('products:*');
  console.log(`Removed ${removed} keys`);

  console.log('\nFirst request (expect DB hit)');
  let t0 = Date.now();
  try {
    await fetch(`${BASE}/products`);
  } catch (e) {
    console.error('Request error:', e.message || e); process.exit(1);
  }
  let t1 = Date.now();
  console.log(`First request took ${t1 - t0} ms`);

  // allow server to cache
  await sleep(200);

  // Check keys (best-effort)
  try {
    const keys = await (redis.client ? redis.client.keys('products:*') : []);
    console.log('Redis keys after first request:', keys);
  } catch (e) {
    console.log('Could not list keys (redis absent)');
  }

  console.log('\nSecond request (expect cache hit)');
  t0 = Date.now();
  try {
    await fetch(`${BASE}/products`);
  } catch (e) {
    console.error('Request error:', e.message || e); process.exit(1);
  }
  t1 = Date.now();
  console.log(`Second request took ${t1 - t0} ms`);

  console.log('\nDone. To test invalidation: update a product via PUT /products/:id (Admin)');
  console.log('Then re-run this script to observe DB hit after invalidation.');

  process.exit(0);
}

run();

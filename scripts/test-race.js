#!/usr/bin/env node
/**
 * Race condition test script (optimistic locking)
 * Usage: set TOKEN_A and TOKEN_B (JWT for two users) and run
 * The script will attempt two parallel checkouts for same product
 */
const axios = require('axios');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const TOKEN_A = process.env.TOKEN_A;
const TOKEN_B = process.env.TOKEN_B;
const PRODUCT_ID = process.env.PRODUCT_ID || '1';

if (!TOKEN_A || !TOKEN_B) {
  console.error('Please set TOKEN_A and TOKEN_B env vars for two users');
  process.exit(1);
}

async function addToCart(token) {
  await axios.post(`${BASE}/cart/items`, { productId: PRODUCT_ID, quantity: 1 }, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function placeOrder(token) {
  const resp = await axios.post(`${BASE}/orders`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return resp.data;
}

async function run() {
  try {
    // Add to cart for both users
    await Promise.all([addToCart(TOKEN_A), addToCart(TOKEN_B)]);

    console.log('Both users added to cart. Placing orders in parallel...');

    const results = await Promise.allSettled([placeOrder(TOKEN_A), placeOrder(TOKEN_B)]);
    console.log('Results:');
    console.log(JSON.stringify(results, null, 2));
    console.log('Expect one success and one failure (VERSION_MISMATCH or INSUFFICIENT_STOCK)');
  } catch (err) {
    console.error('Error during race test:', err.message);
  }
}

run();

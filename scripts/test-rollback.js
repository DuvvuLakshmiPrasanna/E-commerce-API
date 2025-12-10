#!/usr/bin/env node
/**
 * Transaction rollback test
 * Steps:
 *  - adds items to user's cart (TOKEN required)
 *  - sets product stock to 0 using Prisma directly
 *  - attempts checkout and verifies failure
 * Usage:
 *  TOKEN=... PRODUCT_ID=1 node scripts/test-rollback.js
 */
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const TOKEN = process.env.TOKEN;
const PRODUCT_ID = Number(process.env.PRODUCT_ID || 1);

if (!TOKEN) {
  console.error('Please set TOKEN env var with a user JWT');
  process.exit(1);
}

const prisma = new PrismaClient();

async function run() {
  try {
    // Add product to cart
    await axios.post(`${BASE}/cart/items`, { productId: PRODUCT_ID, quantity: 1 }, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    console.log('Added product to cart');

    // Set product stock to 0 to simulate race/failure
    await prisma.product.update({ where: { id: PRODUCT_ID }, data: { stockQuantity: 0 } });
    console.log('Forced product stock to 0');

    // Attempt checkout
    try {
      await axios.post(`${BASE}/orders`, {}, { headers: { Authorization: `Bearer ${TOKEN}` } });
      console.error('Unexpected success — rollback test failed');
    } catch (err) {
      console.log('Checkout failed as expected. Error:', err.response?.data || err.message);
    }

    // Manual verification: check orders table and product stock in Prisma Studio or via API
    console.log('Manual check recommended: verify orders table and stock unchanged (use Prisma Studio or a DB query)');
  } catch (err) {
    console.error('Error during rollback test:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

run();

// Helper functions
const bcryptjs = require('bcryptjs');

/**
 * Hash password with bcryptjs
 */
const hashPassword = async (password) => {
  const salt = await bcryptjs.genSalt(10);
  return await bcryptjs.hash(password, salt);
};

/**
 * Compare password with hashed password
 */
const comparePassword = async (password, hashedPassword) => {
  return await bcryptjs.compare(password, hashedPassword);
};

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Generate pagination info
 */
const getPaginationInfo = (page = 1, limit = 10) => {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
  const skip = (pageNum - 1) * limitNum;

  return { pageNum, limitNum, skip };
};

/**
 * Format decimal to 2 places
 */
const formatPrice = (price) => {
  return parseFloat(parseFloat(price).toFixed(2));
};

module.exports = {
  hashPassword,
  comparePassword,
  isValidEmail,
  getPaginationInfo,
  formatPrice,
};

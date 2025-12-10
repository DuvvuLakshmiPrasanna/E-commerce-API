// Auth routes
const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  registerValidationRules,
  loginValidationRules,
} = require('../controllers/AuthController');
const { validateRequest } = require('../middlewares/validation');
const { authenticate } = require('../middlewares/auth');

// POST /auth/register
router.post(
  '/register',
  registerValidationRules(),
  validateRequest,
  register
);

// POST /auth/login
router.post('/login', loginValidationRules(), validateRequest, login);

// GET /auth/me - Get current authenticated user
router.get('/me', authenticate, getMe);

module.exports = router;

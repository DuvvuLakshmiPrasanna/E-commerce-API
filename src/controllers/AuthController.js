// Auth controller
const { body } = require('express-validator');
const AuthService = require('../services/AuthService');

/**
 * Register new user
 * POST /auth/register
 */
const register = async (req, res, next) => {
  try {
    const result = await AuthService.register(req.body);
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 * POST /auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Validation rules for register
 */
const registerValidationRules = () => [
  body('name').notEmpty().trim().withMessage('Name is required'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('confirmPassword')
    .notEmpty()
    .withMessage('Confirm password is required'),
];

/**
 * Validation rules for login
 */
const loginValidationRules = () => [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

/**
 * Get current authenticated user
 * GET /auth/me
 */
const getMe = async (req, res, next) => {
  try {
    // req.user is set by authenticate middleware from JWT
    const userId = req.user.id;
    const UserRepository = require('../repositories/UserRepository');
    const user = await UserRepository.findById(userId);
    
    if (!user) {
      const { NotFoundError } = require('../utils/errors');
      throw new NotFoundError('User not found');
    }

    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  registerValidationRules,
  loginValidationRules,
};

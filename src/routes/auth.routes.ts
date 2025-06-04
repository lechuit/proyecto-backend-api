import { Router } from 'express';
import { body } from 'express-validator';
import { AuthController } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';

const router = Router();
const authController = new AuthController();

// Register validation rules
const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('displayName')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Display name must be between 2 and 100 characters')
    .trim()
];

// Login validation rules
const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Forgot password validation
const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail()
];

// Reset password validation
const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
];

// Auth routes
router.post('/register', registerValidation, validateRequest, authController.register);
router.post('/login', loginValidation, validateRequest, authController.login);
router.post('/logout', authenticateToken, authController.logout);
router.post('/refresh', authController.refreshToken);
router.post('/forgot-password', forgotPasswordValidation, validateRequest, authController.forgotPassword);
router.post('/reset-password', resetPasswordValidation, validateRequest, authController.resetPassword);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/resend-verification', 
  body('email').isEmail().normalizeEmail(), 
  validateRequest, 
  authController.resendVerification
);
router.get('/verify', authenticateToken, authController.verify);

export default router;
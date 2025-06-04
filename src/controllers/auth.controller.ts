import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { generateTokens, verifyRefreshToken } from '../utils/jwt';
import { createError } from '../middleware/errorHandler';
import { RegisterDto, LoginDto, AuthResponse, RefreshTokenDto } from '../models/auth.types';
import { logger } from '../utils/logger';

export class AuthController {
  async register(
    req: Request<{}, AuthResponse, RegisterDto>,
    res: Response<AuthResponse>,
    next: NextFunction
  ) {
    try {
      const { email, username, password, displayName } = req.body;

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email },
            { username }
          ]
        }
      });

      if (existingUser) {
        if (existingUser.email === email) {
          throw createError('Email already registered', 409);
        }
        if (existingUser.username === username) {
          throw createError('Username already taken', 409);
        }
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          username,
          password: hashedPassword,
          displayName: displayName || username
        },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          avatar: true,
          isVerified: true
        }
      });

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens({
        userId: user.id,
        email: user.email,
        username: user.username
      });

      logger.info(`New user registered: ${user.username}`);

      res.status(201).json({
        user,
        accessToken,
        refreshToken
      });
    } catch (error) {
      next(error);
    }
  }

  async login(
    req: Request<{}, AuthResponse, LoginDto>,
    res: Response<AuthResponse>,
    next: NextFunction
  ) {
  try {
    // 🐛 DEBUG: Log request details
    logger.info('=== LOGIN REQUEST DEBUG ===');
    logger.info('📝 Request body:', JSON.stringify(req.body, null, 2));
    logger.info('📋 Request headers:', JSON.stringify(req.headers, null, 2));
    logger.info('🌐 Request method:', req.method);
    logger.info('🔗 Request URL:', req.url);
    logger.info('📦 Content-Type:', req.get('Content-Type'));
    logger.info('===============================');

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.error('❌ Validation errors:', errors.array());
      throw createError('Validation errors', 400);
    }

    const { email, password } = req.body;

    // 🐛 DEBUG: Log parsed data
    logger.info('✅ Parsed login data:', { email, passwordLength: password?.length });

    if (!email || !password) {
      logger.error('❌ Missing email or password', { email: !!email, password: !!password });
      throw createError('Email and password are required', 400);
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatar: true,
        isVerified: true,
        password: true
      }
    });

    if (!user) {
      logger.warn('⚠️ User not found for email:', email);
      throw createError('Invalid credentials', 401);
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      logger.warn('⚠️ Invalid password for user:', user.username);
      throw createError('Invalid credentials', 401);
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens({
      userId: user.id,
      email: user.email,
      username: user.username
    });

    logger.info(`✅ User logged in successfully: ${user.username}`);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      user: userWithoutPassword,
      accessToken,
      refreshToken
    });
  } catch (error) {
    logger.error('💥 Login error:', error);
    next(error);
  }
};

  async refreshToken(
    req: Request<{}, AuthResponse, RefreshTokenDto>,
    res: Response<AuthResponse>,
    next: NextFunction
  ) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Validation errors', 400);
    }

    const { refreshToken } = req.body;

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatar: true,
        isVerified: true
      }
    });

    if (!user) {
      throw createError('User not found', 401);
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens({
      userId: user.id,
      email: user.email,
      username: user.username
    });

    res.json({
      user,
      accessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    next(error);
  }
};

  async logout(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
  try {
    // In a more complex setup, you'd invalidate the refresh token in a blacklist
    // For now, we just return success (client should remove tokens)
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

  async verify(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
  try {
    if (!req.user) {
      throw createError('User not authenticated', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatar: true,
        isVerified: true
      }
    });

    if (!user) {
      throw createError('User not found', 401);
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
}

  async forgotPassword(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { email } = req.body;
      
      // TODO: Implement forgot password logic
      // For now, just return success
      res.json({ message: 'Password reset email sent' });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { token, password } = req.body;
      
      // TODO: Implement reset password logic
      // For now, just return success
      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      next(error);
    }
  }

  async verifyEmail(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { token } = req.params;
      
      // TODO: Implement email verification logic
      // For now, just return success
      res.json({ message: 'Email verified successfully' });
    } catch (error) {
      next(error);
    }
  }

  async resendVerification(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { email } = req.body;
      
      // TODO: Implement resend verification logic
      // For now, just return success
      res.json({ message: 'Verification email sent' });
    } catch (error) {
      next(error);
    }
  }
}

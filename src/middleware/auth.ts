import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from './errorHandler';
import { JwtPayload } from '../models/auth.types';
import { prisma } from '../config/database';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        username: string;
      };
    }
  }
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      throw createError('Access token required', 401);
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw createError('JWT secret not configured', 500);
    }

    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    
    // Verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true
      }
    });

    if (!user) {
      throw createError('User not found', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(createError('Invalid token', 401));
    }
    next(error);
  }
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next(); // Continue without authentication
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return next();
    }

    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true
      }
    });

    if (user) {
      req.user = user;
    }
    
    next();
  } catch (error) {
    // If token is invalid, just continue without auth
    next();
  }
};
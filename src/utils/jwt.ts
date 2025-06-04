import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { JwtPayload } from '../models/auth.types';

export const generateTokens = (payload: Omit<JwtPayload, 'iat' | 'exp'>) => {
  const jwtSecret = process.env.JWT_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
  const jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

  if (!jwtSecret || !jwtRefreshSecret) {
    throw new Error('JWT secrets not configured');
  }

  const tokenOptions: SignOptions = {
    expiresIn: jwtExpiresIn as jwt.SignOptions['expiresIn']
  };

  const refreshTokenOptions: SignOptions = {
    expiresIn: jwtRefreshExpiresIn as jwt.SignOptions['expiresIn']
  };

  const accessToken = jwt.sign(payload, jwtSecret as Secret, tokenOptions);
  const refreshToken = jwt.sign(payload, jwtRefreshSecret as Secret, refreshTokenOptions);

  return { accessToken, refreshToken };
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
  
  if (!jwtRefreshSecret) {
    throw new Error('JWT refresh secret not configured');
  }

  return jwt.verify(token, jwtRefreshSecret) as JwtPayload;
};
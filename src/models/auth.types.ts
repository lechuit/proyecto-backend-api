export interface RegisterDto {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
    isVerified: boolean;
  };
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  username: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenDto {
  refreshToken: string;
}
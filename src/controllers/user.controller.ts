import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../config/database';
import { createError } from '../middleware/errorHandler';
import { UpdateProfileDto, UserProfile } from '../models/user.types';

export const getProfile = async (
  req: Request,
  res: Response<{ user: UserProfile }>,
  next: NextFunction
) => {
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
        bio: true,
        avatar: true,
        isVerified: true,
        isPrivate: true,
        createdAt: true,
        _count: {
          select: {
            followers: true,
            following: true,
            posts: true
          }
        }
      }
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    const userProfile: UserProfile = {
      ...user,
      followerCount: user._count.followers,
      followingCount: user._count.following,
      postCount: user._count.posts
    };

    res.json({ user: userProfile });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (
  req: Request<{}, { user: UserProfile }, UpdateProfileDto>,
  res: Response<{ user: UserProfile }>,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Validation errors', 400);
    }

    if (!req.user) {
      throw createError('User not authenticated', 401);
    }

    const { displayName, bio, avatar, isPrivate } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(displayName !== undefined && { displayName }),
        ...(bio !== undefined && { bio }),
        ...(avatar !== undefined && { avatar }),
        ...(isPrivate !== undefined && { isPrivate })
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        bio: true,
        avatar: true,
        isVerified: true,
        isPrivate: true,
        createdAt: true,
        _count: {
          select: {
            followers: true,
            following: true,
            posts: true
          }
        }
      }
    });

    const userProfile: UserProfile = {
      ...updatedUser,
      followerCount: updatedUser._count.followers,
      followingCount: updatedUser._count.following,
      postCount: updatedUser._count.posts
    };

    res.json({ user: userProfile });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (
  req: Request<{ identifier: string }>,
  res: Response<{ user: UserProfile }>,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Validation errors', 400);
    }

    const { identifier } = req.params;
    const currentUserId = req.user?.id;

    // Try to find by ID first, then by username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: identifier },
          { username: identifier }
        ]
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        bio: true,
        avatar: true,
        isVerified: true,
        isPrivate: true,
        createdAt: true,
        _count: {
          select: {
            followers: true,
            following: true,
            posts: true
          }
        },
        followers: currentUserId ? {
          where: { followerId: currentUserId }
        } : false
      }
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    const userProfile: UserProfile = {
      ...user,
      followerCount: user._count.followers,
      followingCount: user._count.following,
      postCount: user._count.posts,
      isFollowing: currentUserId ? user.followers.length > 0 : false
    };

    res.json({ user: userProfile });
  } catch (error) {
    next(error);
  }
};

export const followUser = async (
  req: Request<{ userId: string }>,
  res: Response<{ message: string }>,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Validation errors', 400);
    }

    if (!req.user) {
      throw createError('User not authenticated', 401);
    }

    const { userId } = req.params;
    const followerId = req.user.id;

    if (userId === followerId) {
      throw createError('Cannot follow yourself', 400);
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!targetUser) {
      throw createError('User not found', 404);
    }

    // Create follow relationship (upsert to handle duplicates)
    await prisma.follow.upsert({
      where: {
        followerId_followingId: {
          followerId,
          followingId: userId
        }
      },
      update: {},
      create: {
        followerId,
        followingId: userId
      }
    });

    res.json({ message: 'User followed successfully' });
  } catch (error) {
    next(error);
  }
};

export const unfollowUser = async (
  req: Request<{ userId: string }>,
  res: Response<{ message: string }>,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Validation errors', 400);
    }

    if (!req.user) {
      throw createError('User not authenticated', 401);
    }

    const { userId } = req.params;
    const followerId = req.user.id;

    await prisma.follow.deleteMany({
      where: {
        followerId,
        followingId: userId
      }
    });

    res.json({ message: 'User unfollowed successfully' });
  } catch (error) {
    next(error);
  }
};

export const getFollowers = async (
  req: Request<{ userId: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Validation errors', 400);
    }

    const { userId } = req.params;

    const followers = await prisma.follow.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            isVerified: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ 
      followers: followers.map(f => f.follower),
      count: followers.length
    });
  } catch (error) {
    next(error);
  }
};

export const getFollowing = async (
  req: Request<{ userId: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Validation errors', 400);
    }

    const { userId } = req.params;

    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            isVerified: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ 
      following: following.map(f => f.following),
      count: following.length
    });
  } catch (error) {
    next(error);
  }
};
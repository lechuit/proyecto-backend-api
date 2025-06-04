import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../config/database';
import { createError } from '../middleware/errorHandler';
import { CreatePostDto, UpdatePostDto, PostResponse, CreateCommentDto, FeedQuery } from '../models/post.types';
import { googleBooksService } from '../services/googleBooks.service';
import { logger } from '../utils/logger';

const getPostWithDetails = async (postId: string, currentUserId?: string) => {
  return await prisma.post.findUnique({
    where: { id: postId },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatar: true,
          isVerified: true,
          isPrivate: true
        }
      },
      book: {
        select: {
          id: true,
          title: true,
          authors: true,
          imageUrl: true
        }
      },
      _count: {
        select: {
          likes: true,
          comments: true
        }
      },
      likes: currentUserId ? {
        where: { userId: currentUserId }
      } : false
    }
  });
};

const formatPostResponse = (post: any, currentUserId?: string): PostResponse => {
  return {
    id: post.id,
    content: post.content,
    imageUrl: post.imageUrl,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    author: post.author,
    book: post.book,
    likeCount: post._count.likes,
    commentCount: post._count.comments,
    isLiked: currentUserId ? post.likes.length > 0 : false
  };
};

export const getFeed = async (
  req: Request<{}, any, any, FeedQuery>,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw createError('User not authenticated', 401);
    }

    const page = parseInt(`${req.query.page}`) || 1;
    const limit = parseInt(`${req.query.limit}`) || 10;
    const skip = (page - 1) * limit;

    // Get posts from followed users
    const posts = await prisma.post.findMany({
      where: {
        author: {
          followers: {
            some: {
              followerId: req.user.id
            }
          }
        }
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            isVerified: true
          }
        },
        book: {
          select: {
            id: true,
            title: true,
            authors: true,
            imageUrl: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        },
        likes: {
          where: { userId: req.user.id }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    const formattedPosts = posts.map(post => formatPostResponse(post, req.user!.id));

    res.json({
      posts: formattedPosts,
      page,
      limit,
      hasMore: posts.length === limit
    });
  } catch (error) {
    next(error);
  }
};

export const getDiscoverPosts = async (
  req: Request<{}, any, any, FeedQuery>,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = parseInt(`${req.query.page}`) || 1;
    const limit = parseInt(`${req.query.limit}`) || 10;
    const skip = (page - 1) * limit;
    const currentUserId = req.user?.id;

    // Get public posts (from non-private users)
    const posts = await prisma.post.findMany({
      where: {
        author: {
          isPrivate: false
        }
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            isVerified: true
          }
        },
        book: {
          select: {
            id: true,
            title: true,
            authors: true,
            imageUrl: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        },
        likes: currentUserId ? {
          where: { userId: currentUserId }
        } : false
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    const formattedPosts = posts.map(post => formatPostResponse(post, currentUserId));

    res.json({
      posts: formattedPosts,
      page,
      limit,
      hasMore: posts.length === limit
    });
  } catch (error) {
    next(error);
  }
};

export const createPost = async (
  req: Request<{}, PostResponse, CreatePostDto>,
  res: Response<PostResponse>,
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

    const { content, imageUrl, bookId, googleId } = req.body;
    let finalBookId = bookId;

    // Handle book association logic
    if (googleId && !bookId) {
      // User wants to associate a book from Google Books that might not be in our DB yet
      logger.info(`Creating post with Google Books ID: ${googleId}`);
      
      try {
        // Get or create book from Google Books API
        const book = await googleBooksService.getBookByGoogleId(googleId);
        if (book) {
          finalBookId = book.id;
          logger.info(`Book found/created with ID: ${finalBookId}`);
        } else {
          logger.warn(`Could not fetch book with Google ID: ${googleId}`);
          // Continue without book if Google Books API fails
        }
      } catch (bookError) {
        logger.error(`Error fetching book from Google Books API:`, bookError);
        // Continue without book if Google Books API fails
      }
    } else if (bookId) {
      // Verify book exists if bookId provided directly
      const book = await prisma.book.findUnique({
        where: { id: bookId }
      });
      if (!book) {
        throw createError('Book not found', 404);
      }
    }

    const post = await prisma.post.create({
      data: {
        content,
        imageUrl,
        bookId: finalBookId,
        authorId: req.user.id
      }
    });

    const postWithDetails = await getPostWithDetails(post.id, req.user.id);
    if (!postWithDetails) {
      throw createError('Error creating post', 500);
    }

    const formattedPost = formatPostResponse(postWithDetails, req.user.id);

    logger.info(`Post created successfully: ${post.id} ${finalBookId ? `with book: ${finalBookId}` : 'without book'}`);
    res.status(201).json(formattedPost);
  } catch (error) {
    next(error);
  }
};

export const getPostById = async (
  req: Request<{ postId: string }>,
  res: Response<PostResponse>,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Validation errors', 400);
    }

    const { postId } = req.params;
    const currentUserId = req.user?.id;

    const post = await getPostWithDetails(postId, currentUserId);

    if (!post) {
      throw createError('Post not found', 404);
    }

    // Check if user can view this post (private account check)
    if (post.author.isPrivate && currentUserId !== post.authorId) {
      // Check if current user follows the author
      const isFollowing = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId || '',
            followingId: post.authorId
          }
        }
      });

      if (!isFollowing) {
        throw createError('Post not found', 404);
      }
    }

    const formattedPost = formatPostResponse(post, currentUserId);

    res.json(formattedPost);
  } catch (error) {
    next(error);
  }
};

export const updatePost = async (
  req: Request<{ postId: string }, PostResponse, UpdatePostDto>,
  res: Response<PostResponse>,
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

    const { postId } = req.params;
    const { content, imageUrl } = req.body;

    // Check if post exists and user is the author
    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true }
    });

    if (!existingPost) {
      throw createError('Post not found', 404);
    }

    if (existingPost.authorId !== req.user.id) {
      throw createError('Not authorized to update this post', 403);
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        ...(content !== undefined && { content }),
        ...(imageUrl !== undefined && { imageUrl })
      }
    });

    const postWithDetails = await getPostWithDetails(updatedPost.id, req.user.id);
    if (!postWithDetails) {
      throw createError('Error updating post', 500);
    }

    const formattedPost = formatPostResponse(postWithDetails, req.user.id);

    res.json(formattedPost);
  } catch (error) {
    next(error);
  }
};

export const deletePost = async (
  req: Request<{ postId: string }>,
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

    const { postId } = req.params;

    // Check if post exists and user is the author
    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true }
    });

    if (!existingPost) {
      throw createError('Post not found', 404);
    }

    if (existingPost.authorId !== req.user.id) {
      throw createError('Not authorized to delete this post', 403);
    }

    await prisma.post.delete({
      where: { id: postId }
    });

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const likePost = async (
  req: Request<{ postId: string }>,
  res: Response<{ message: string; isLiked: boolean }>,
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

    const { postId } = req.params;
    const userId = req.user.id;

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      throw createError('Post not found', 404);
    }

    // Create like (upsert to handle duplicates)
    await prisma.like.upsert({
      where: {
        userId_postId: {
          userId,
          postId
        }
      },
      update: {},
      create: {
        userId,
        postId
      }
    });

    res.json({ message: 'Post liked successfully', isLiked: true });
  } catch (error) {
    next(error);
  }
};

export const unlikePost = async (
  req: Request<{ postId: string }>,
  res: Response<{ message: string; isLiked: boolean }>,
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

    const { postId } = req.params;
    const userId = req.user.id;

    await prisma.like.deleteMany({
      where: {
        userId,
        postId
      }
    });

    res.json({ message: 'Post unliked successfully', isLiked: false });
  } catch (error) {
    next(error);
  }
};

export const getPostComments = async (
  req: Request<{ postId: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Validation errors', 400);
    }

    const { postId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const comments = await prisma.comment.findMany({
      where: { postId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            isVerified: true
          }
        }
      },
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit
    });

    const formattedComments = comments.map(comment => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      author: comment.user
    }));

    res.json({
      comments: formattedComments,
      page,
      limit,
      hasMore: comments.length === limit
    });
  } catch (error) {
    next(error);
  }
};

export const addComment = async (
  req: Request<{ postId: string }, any, CreateCommentDto>,
  res: Response,
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

    const { postId } = req.params;
    const { content } = req.body;

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      throw createError('Post not found', 404);
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        userId: req.user.id,
        postId
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            isVerified: true
          }
        }
      }
    });

    const formattedComment = {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      author: comment.user
    };

    res.status(201).json(formattedComment);
  } catch (error) {
    next(error);
  }
};

export const getAllPosts = async (
  req: Request<{}, any, any, FeedQuery>,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = parseInt(`${req.query.page}`) || 1;
    const limit = parseInt(`${req.query.limit}`) || 10;
    const skip = (page - 1) * limit;
    const currentUserId = req.user?.id;

    // Get all public posts (for testing - similar to discover but simplified)
    const posts = await prisma.post.findMany({
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            isVerified: true
          }
        },
        book: {
          select: {
            id: true,
            title: true,
            authors: true,
            imageUrl: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        },
        likes: currentUserId ? {
          where: { userId: currentUserId }
        } : false
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    const formattedPosts = posts.map(post => formatPostResponse(post, currentUserId));

    res.json({
      posts: formattedPosts,
      page,
      limit,
      hasMore: posts.length === limit
    });
  } catch (error) {
    next(error);
  }
};

export const getUserPostsByUsername = async (
  req: Request<{ username: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Validation errors', 400);
    }

    const { username } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const currentUserId = req.user?.id;

    // Find user by username
    const user = await prisma.user.findUnique({
      where: { username },
      select: { 
        id: true, 
        isPrivate: true,
        username: true,
        displayName: true 
      }
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    // Check privacy settings
    if (user.isPrivate && currentUserId !== user.id) {
      const isFollowing = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId || '',
            followingId: user.id
          }
        }
      });

      if (!isFollowing) {
        throw createError('This user\'s posts are private', 403);
      }
    }

    const posts = await prisma.post.findMany({
      where: { authorId: user.id },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            isVerified: true
          }
        },
        book: {
          select: {
            id: true,
            title: true,
            authors: true,
            imageUrl: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        },
        likes: currentUserId ? {
          where: { userId: currentUserId }
        } : false
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    const formattedPosts = posts.map(post => formatPostResponse(post, currentUserId));

    res.json({
      posts: formattedPosts,
      page,
      limit,
      hasMore: posts.length === limit,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getUserPosts = async (
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
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const currentUserId = req.user?.id;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isPrivate: true }
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    // Check privacy settings
    if (user.isPrivate && currentUserId !== userId) {
      const isFollowing = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId || '',
            followingId: userId
          }
        }
      });

      if (!isFollowing) {
        throw createError('This user\'s posts are private', 403);
      }
    }

    const posts = await prisma.post.findMany({
      where: { authorId: userId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            isVerified: true
          }
        },
        book: {
          select: {
            id: true,
            title: true,
            authors: true,
            imageUrl: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        },
        likes: currentUserId ? {
          where: { userId: currentUserId }
        } : false
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    const formattedPosts = posts.map(post => formatPostResponse(post, currentUserId));

    res.json({
      posts: formattedPosts,
      page,
      limit,
      hasMore: posts.length === limit
    });
  } catch (error) {
    next(error);
  }
};
import { Router } from 'express';
import { body, param, query } from 'express-validator';
import * as postController from '../controllers/post.controller';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';

const router = Router();

// Get all posts (for testing/development)
router.get('/',
  optionalAuth,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 })
  ],
  validateRequest,
  postController.getAllPosts
);

// Get feed (posts from followed users)
router.get('/feed',
  authenticateToken,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 })
  ],
  validateRequest,
  postController.getFeed
);

// Get public posts (discover)
router.get('/discover',
  optionalAuth,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 })
  ],
  validateRequest,
  postController.getDiscoverPosts
);

// Create new post
router.post('/',
  authenticateToken,
  [
    body('content').isLength({ min: 1, max: 2000 }),
    body('imageUrl').optional().isURL(),
    body('bookId').optional().isString().isLength({ min: 1, max: 50 }),
    body('googleId').optional().isString().isLength({ min: 1, max: 50 })
  ],
  validateRequest,
  postController.createPost
);

// Get post by ID
router.get('/:postId',
  optionalAuth,
  [
    param('postId').isString().isLength({ min: 1, max: 50 })
  ],
  validateRequest,
  postController.getPostById
);

// Update post
router.put('/:postId',
  authenticateToken,
  [
    param('postId').isString().isLength({ min: 1, max: 50 }),
    body('content').optional().isLength({ min: 1, max: 2000 }),
    body('imageUrl').optional().isURL()
  ],
  validateRequest,
  postController.updatePost
);

// Delete post
router.delete('/:postId',
  authenticateToken,
  [
    param('postId').isString().isLength({ min: 1, max: 50 })
  ],
  validateRequest,
  postController.deletePost
);

// Like/Unlike post
router.post('/:postId/like',
  authenticateToken,
  [
    param('postId').isString().isLength({ min: 1, max: 50 })
  ],
  validateRequest,
  postController.likePost
);

router.delete('/:postId/like',
  authenticateToken,
  [
    param('postId').isString().isLength({ min: 1, max: 50 })
  ],
  validateRequest,
  postController.unlikePost
);

// Get post comments
router.get('/:postId/comments',
  optionalAuth,
  [
    param('postId').isString().isLength({ min: 1, max: 50 }),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 })
  ],
  validateRequest,
  postController.getPostComments
);

// Add comment to post
router.post('/:postId/comments',
  authenticateToken,
  [
    param('postId').isString().isLength({ min: 1, max: 50 }),
    body('content').isLength({ min: 1, max: 500 })
  ],
  validateRequest,
  postController.addComment
);

// Get user posts by username
router.get('/username/:username',
  optionalAuth,
  [
    param('username').notEmpty(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 })
  ],
  validateRequest,
  postController.getUserPostsByUsername
);

// Get user posts
router.get('/user/:userId',
  optionalAuth,
  [
    param('userId').isString().isLength({ min: 1, max: 50 }),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 })
  ],
  validateRequest,
  postController.getUserPosts
);

export default router;
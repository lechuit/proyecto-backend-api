import { Router } from 'express';
import { body, param } from 'express-validator';
import * as userController from '../controllers/user.controller';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';

const router = Router();

// Get current user profile
router.get('/profile', authenticateToken, userController.getProfile);

// Update current user profile
router.put('/profile',
  authenticateToken,
  [
    body('displayName').optional().isLength({ min: 1, max: 50 }),
    body('bio').optional().isLength({ max: 500 }),
    body('avatar').optional().isURL(),
    body('isPrivate').optional().isBoolean()
  ],
  validateRequest,
  userController.updateProfile
);

// Get user by ID or username
router.get('/:identifier',
  optionalAuth,
  [
    param('identifier').notEmpty()
  ],
  validateRequest,
  userController.getUserById
);

// Follow/Unfollow user
router.post('/:userId/follow',
  authenticateToken,
  [
    param('userId').isUUID()
  ],
  validateRequest,
  userController.followUser
);

router.delete('/:userId/follow',
  authenticateToken,
  [
    param('userId').isUUID()
  ],
  validateRequest,
  userController.unfollowUser
);

// Get user followers
router.get('/:userId/followers',
  optionalAuth,
  [
    param('userId').isUUID()
  ],
  validateRequest,
  userController.getFollowers
);

// Get user following
router.get('/:userId/following',
  optionalAuth,
  [
    param('userId').isUUID()
  ],
  validateRequest,
  userController.getFollowing
);

export default router;
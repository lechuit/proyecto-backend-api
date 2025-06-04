export interface UpdateProfileDto {
  displayName?: string;
  bio?: string;
  avatar?: string;
  isPrivate?: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatar: string | null;
  isVerified: boolean;
  isPrivate: boolean;
  createdAt: Date;
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
  isFollowing?: boolean;
}

export interface FollowUserDto {
  userId: string;
}
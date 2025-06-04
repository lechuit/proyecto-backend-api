export interface CreatePostDto {
  content: string;
  imageUrl?: string;
  bookId?: string;
  googleId?: string; // Para crear post con libro de Google Books que aún no está en BD
}

export interface UpdatePostDto {
  content?: string;
  imageUrl?: string;
}

export interface PostResponse {
  id: string;
  content: string;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
    isVerified: boolean;
  };
  book?: {
    id: string;
    title: string;
    authors: string;
    imageUrl: string | null;
  } | null;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  comments?: CommentResponse[];
}

export interface CommentResponse {
  id: string;
  content: string;
  createdAt: Date;
  author: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
    isVerified: boolean;
  };
}

export interface CreateCommentDto {
  content: string;
  postId: string;
}

export interface FeedQuery {
  page?: number;
  limit?: number;
  userId?: string;
}
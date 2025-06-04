export interface BookSearchResult {
  id: string;
  googleId: string;
  title: string;
  authors: string[];
  description?: string;
  isbn?: string;
  publisher?: string;
  publishedDate?: string;
  pageCount?: number;
  categories: string[];
  imageUrl?: string;
  language: string;
  isFromCache: boolean;
}

export interface BookSearchRequest {
  q: string;
  limit?: number;
}

export interface BookSearchResponse {
  success: boolean;
  data: {
    books: BookSearchResult[];
    total: number;
    query: string;
    fromCache: number;
    fromAPI: number;
  };
}

export interface CreatePostWithBookRequest {
  content: string;
  bookId?: string;
  googleId?: string; // Para crear post con libro de Google Books que aún no está en BD
  imageUrl?: string;
}

export interface BookCacheStats {
  totalBooks: number;
  booksWithGoogleId: number;
  cachePercentage: number;
}

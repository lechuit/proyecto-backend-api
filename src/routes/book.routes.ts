import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { 
  searchBooks, 
  getBookByGoogleId, 
  getCacheStats,
  clearBookCache
} from '../controllers/book.controller';

const router = Router();

/**
 * @route GET /api/books/search
 * @desc Buscar libros usando Google Books API + cache local
 * @access Private
 * @query q - Query de búsqueda general (optional si hay title/author)
 * @query title - Título del libro (optional)
 * @query author - Autor del libro (optional)
 * @query lang - Idioma del dispositivo/usuario (optional, ej: 'es', 'en')
 * @query limit - Número máximo de resultados (default: 10, max: 20)
 * @example 
 *   /api/books/search?q=harry potter&lang=es
 *   /api/books/search?title=Harry Potter&author=J.K. Rowling&lang=en
 *   /api/books/search?title=El Quijote&lang=es
 */
router.get('/search', authenticateToken, searchBooks);

/**
 * @route GET /api/books/google/:googleId
 * @desc Obtener un libro específico por Google ID
 * @access Private
 * @param googleId - ID del libro en Google Books
 */
router.get('/google/:googleId', authenticateToken, getBookByGoogleId);

/**
 * @route GET /api/books/cache/stats
 * @desc Obtener estadísticas de cache de libros
 * @access Private
 */
router.get('/cache/stats', authenticateToken, getCacheStats);

/**
 * @route DELETE /api/books/cache/clear
 * @desc Limpiar memory cache de libros
 * @access Private
 */
router.delete('/cache/clear', authenticateToken, clearBookCache);

export default router;

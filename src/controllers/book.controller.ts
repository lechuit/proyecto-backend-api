import { Request, Response } from 'express';
import { googleBooksService } from '../services/googleBooks.service';
import { logger } from '../utils/logger';

/**
 * Buscar libros usando Google Books API + cache local
 */
export const searchBooks = async (req: Request, res: Response) => {
  try {
    console.log('📋 Search request received with params:', req.query);
    
    const { q: query, title, author, lang, limit = '10' } = req.query;

    // Debug logging
    console.log('🔍 Search parameters:');
    console.log('  - q (query):', query);
    console.log('  - title:', title);
    console.log('  - author:', author);
    console.log('  - lang (device):', lang);
    console.log('  - limit:', limit);

    // Validar que al menos uno de los parámetros esté presente
    if (!query && !title && !author) {
      console.log('❌ No search parameters provided');
      return res.status(400).json({
        success: false,
        message: 'Al menos un parámetro de búsqueda es requerido: q, title, o author'
      });
    }

    let searchQuery: string;
    
    // Si hay título y autor separados, combinarlos inteligentemente
    if (title || author) {
      const parts: string[] = [];
      if (title && typeof title === 'string') parts.push(title.trim());
      if (author && typeof author === 'string') parts.push(author.trim());
      searchQuery = parts.join(' ');
      
      console.log(`🔍 Advanced search mode activated`);
      console.log(`  - Title: "${title}"`);
      console.log(`  - Author: "${author}"`);
      console.log(`  - Combined query: "${searchQuery}"`);
      
      logger.info(`🔍 Advanced search - Title: "${title}", Author: "${author}", Combined: "${searchQuery}"`);
    } else {
      searchQuery = (query as string).trim();
      console.log(`🔍 Simple search mode: "${searchQuery}"`);
    }

    // Validar longitud mínima del query para evitar resultados irrelevantes
    if (searchQuery.length < 2) {
      console.log(`❌ Search query too short: "${searchQuery}"`);
      return res.status(400).json({
        success: false,
        message: 'La búsqueda debe tener al menos 2 caracteres'
      });
    }

    const maxResults = Math.min(parseInt(limit as string) || 10, 20);
    console.log(`📊 Searching with query: "${searchQuery}", device language: ${lang}, limit: ${maxResults}`);
    
    const books = await googleBooksService.searchBooks(searchQuery, maxResults, lang as string);

    console.log(`✅ Search completed: ${books.length} books found`);

    res.json({
      success: true,
      data: {
        books,
        total: books.length,
        query: searchQuery,
        deviceLanguage: lang,
        originalQuery: { q: query, title, author },
        fromCache: books.filter(book => book.isFromCache).length,
        fromAPI: books.filter(book => !book.isFromCache).length
      }
    });

  } catch (error) {
    console.error('❌ Error in searchBooks controller:', error);
    logger.error('Error in searchBooks controller:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching books'
    });
  }
};

/**
 * Obtener un libro específico por Google ID
 */
export const getBookByGoogleId = async (req: Request, res: Response) => {
  try {
    const { googleId } = req.params;

    if (!googleId) {
      return res.status(400).json({
        success: false,
        message: 'Google ID is required'
      });
    }

    const book = await googleBooksService.getBookByGoogleId(googleId);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    res.json({
      success: true,
      data: { book }
    });

  } catch (error) {
    logger.error('Error in getBookByGoogleId controller:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving book'
    });
  }
};

/**
 * Obtener estadísticas de cache de libros
 */
export const getCacheStats = async (req: Request, res: Response) => {
  try {
    const stats = await googleBooksService.getCacheStats();

    res.json({
      success: true,
      data: { stats }
    });

  } catch (error) {
    logger.error('Error in getCacheStats controller:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving cache stats'
    });
  }
};

/**
 * Limpiar memory cache de libros
 */
export const clearBookCache = async (req: Request, res: Response) => {
  try {
    googleBooksService.clearMemoryCache();

    res.json({
      success: true,
      message: 'Memory cache cleared successfully'
    });

  } catch (error) {
    logger.error('Error in clearBookCache controller:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing cache'
    });
  }
};

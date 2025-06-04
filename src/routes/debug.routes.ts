import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import { seedDatabase } from '../scripts/seedDatabase';
import { googleBooksService } from '../services/googleBooks.service';

const router = Router();

// 🚨 TEMPORAL: Endpoint para hacer seeding desde el frontend
router.post('/seed', async (req: Request, res: Response) => {
  try {
    console.log('🌱 Ejecutando seeding desde endpoint...');
    await seedDatabase();
    
    const postsCount = await prisma.post.count();
    const usersCount = await prisma.user.count();
    
    res.json({
      success: true,
      message: 'Database seeded successfully',
      data: {
        posts: postsCount,
        users: usersCount
      }
    });
  } catch (error) {
    console.error('❌ Error en seeding:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to seed database',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 🧪 TEMPORAL: Endpoint para probar Google Books API
router.get('/test-books/:query', async (req: Request, res: Response) => {
  try {
    const { query } = req.params;
    console.log(`🔍 Testing Google Books API with query: "${query}"`);
    
    const books = await googleBooksService.searchBooks(query, 5);
    const stats = await googleBooksService.getCacheStats();
    
    res.json({
      success: true,
      query,
      booksFound: books.length,
      books: books.map(book => ({
        id: book.id,
        googleId: book.googleId,
        title: book.title,
        authors: book.authors,
        isFromCache: book.isFromCache,
        imageUrl: book.imageUrl
      })),
      cacheStats: stats
    });
  } catch (error) {
    console.error('❌ Error testing Google Books API:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test Google Books API',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Endpoint para verificar datos
router.get('/check', async (req: Request, res: Response) => {
  try {
    const postsCount = await prisma.post.count();
    const usersCount = await prisma.user.count();
    const booksCount = await prisma.book.count();
    
    // Obtener algunos posts de ejemplo
    const samplePosts = await prisma.post.findMany({
      take: 2,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true
          }
        },
        book: {
          select: {
            id: true,
            title: true,
            authors: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      }
    });
    
    res.json({
      counts: {
        posts: postsCount,
        users: usersCount,
        books: booksCount
      },
      samplePosts,
      databaseUrl: process.env.DATABASE_URL ? 'Connected' : 'No DATABASE_URL',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Database check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
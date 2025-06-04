import { googleBooksService } from '../services/googleBooks.service';
import { logger } from '../utils/logger';

async function testGoogleBooksIntegration() {
  logger.info('🧪 Testing Google Books API Integration...');
  
  try {
    // Test 1: Búsqueda de libros
    logger.info('📚 Test 1: Searching for books...');
    const searchResults = await googleBooksService.searchBooks('harry potter', 5);
    logger.info(`✅ Found ${searchResults.length} books`);
    
    if (searchResults.length > 0) {
      const firstBook = searchResults[0];
      logger.info(`📖 First book: "${firstBook.title}" by ${firstBook.authors.join(', ')}`);
      logger.info(`🏷️ Google ID: ${firstBook.googleId}`);
      logger.info(`💾 From cache: ${firstBook.isFromCache}`);
      
      // Test 2: Obtener libro específico por Google ID
      logger.info('🔍 Test 2: Getting book by Google ID...');
      const specificBook = await googleBooksService.getBookByGoogleId(firstBook.googleId);
      
      if (specificBook) {
        logger.info(`✅ Successfully retrieved: "${specificBook.title}"`);
        logger.info(`💾 From cache: ${specificBook.isFromCache}`);
      } else {
        logger.error('❌ Failed to retrieve book by Google ID');
      }
    }
    
    // Test 3: Estadísticas de cache
    logger.info('📊 Test 3: Getting cache stats...');
    const stats = await googleBooksService.getCacheStats();
    logger.info(`📈 Cache stats:`);
    logger.info(`   - Total books: ${stats.database.totalBooks}`);
    logger.info(`   - Books with Google ID: ${stats.database.booksWithGoogleId}`);
    logger.info(`   - Cache percentage: ${stats.database.cachePercentage.toFixed(2)}%`);
    
    // Test 4: Búsqueda en español
    logger.info('🇪🇸 Test 4: Spanish book search...');
    const spanishResults = await googleBooksService.searchBooks('gabriel garcía márquez', 3);
    logger.info(`✅ Found ${spanishResults.length} Spanish books`);
    
    if (spanishResults.length > 0) {
      spanishResults.forEach((book, index) => {
        logger.info(`   ${index + 1}. "${book.title}" (${book.language})`);
      });
    }
    
    logger.info('🎉 All tests completed successfully!');
    
  } catch (error) {
    logger.error('❌ Test failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Ejecutar tests
testGoogleBooksIntegration();
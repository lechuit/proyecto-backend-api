import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { memoryCacheService } from './memoryCache.service';

const prisma = new PrismaClient();

export interface GoogleBookData {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    description?: string;
    publisher?: string;
    publishedDate?: string;
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
    pageCount?: number;
    categories?: string[];
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    language?: string;
  };
}

export interface GoogleBooksSearchResponse {
  kind: string;
  totalItems: number;
  items?: GoogleBookData[];
}

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

class GoogleBooksService {
  private readonly baseUrl = 'https://www.googleapis.com/books/v1/volumes';
  private readonly apiKey = process.env.GOOGLE_BOOKS_API_KEY;

  /**
   * Buscar libros con estrategia híbrida optimizada: Memory Cache → DB Cache → Google Books API
   */
  async searchBooks(query: string, maxResults: number = 20, deviceLanguage?: string): Promise<BookSearchResult[]> {
    const startTime = Date.now();
    
    try {
      // 1. Check memory cache first (sub-10ms)
      const cacheKey = `search:${query}:${maxResults}:${deviceLanguage || 'auto'}`;
      const cachedResult = memoryCacheService.get<BookSearchResult[]>(cacheKey);
      
      if (cachedResult) {
        const duration = Date.now() - startTime;
        logger.info(`🚀 Memory cache hit for query: "${query}" (${duration}ms)`);
        return cachedResult;
      }

      logger.info(`Searching books for query: "${query}" with device language: ${deviceLanguage || 'auto'}`);

      // 2. Buscar en cache de base de datos (optimizado con full-text search)
      const cachedBooks = await this.searchBooksInCache(query, maxResults);
      
      if (cachedBooks.length >= maxResults) {
        const duration = Date.now() - startTime;
        logger.info(`Found ${cachedBooks.length} books in DB cache (${duration}ms)`);
        
        // Cache in memory for next time
        memoryCacheService.set(cacheKey, cachedBooks);
        return cachedBooks;
      }

      // 3. Si no hay suficientes resultados, buscar en Google Books API
      logger.info(`Found ${cachedBooks.length} books in cache, searching Google Books API for more`);
      
      const [dbResult, apiResult] = await Promise.allSettled([
        Promise.resolve(cachedBooks),
        this.shouldCallAPI(query) ? this.searchBooksInGoogleAPI(query, maxResults, deviceLanguage) : Promise.resolve([])
      ]);

      const googleBooks = apiResult.status === 'fulfilled' ? apiResult.value : [];

      // 4. Auto-persistir nuevos libros en batch
      const newBooks = await this.persistNewBooksToCache(googleBooks, cachedBooks);

      // 5. Combinar y deduplicar resultados
      const combinedResults = [...cachedBooks, ...newBooks];
      const uniqueResults = this.deduplicateBooks(combinedResults);
      
      // 6. Ordenar por idioma de dispositivo si se proporciona
      const sortedResults = this.sortByLanguagePreference(uniqueResults, deviceLanguage);
      const finalResults = sortedResults.slice(0, maxResults);

      const duration = Date.now() - startTime;
      logger.info(`Returning ${finalResults.length} total books (${cachedBooks.length} from cache, ${newBooks.length} new from Google) in ${duration}ms`);
      
      // Cache final results in memory
      memoryCacheService.set(cacheKey, finalResults, 10 * 60 * 1000);

      return finalResults;

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Error searching books after ${duration}ms:`, error);
      
      // Fallback: intentar solo cache local si Google Books API falla
      try {
        const fallbackResults = await this.searchBooksInCache(query, maxResults);
        logger.info(`API failed, returning ${fallbackResults.length} books from cache only`);
        return fallbackResults;
      } catch (cacheError) {
        logger.error('Cache fallback also failed:', cacheError);
        throw new Error('Book search service temporarily unavailable');
      }
    }
  }

  /**
   * Obtener un libro específico por Google ID con cache
   */
  async getBookByGoogleId(googleId: string): Promise<BookSearchResult | null> {
    try {
      // 1. Check memory cache first
      const cacheKey = `book:${googleId}`;
      const cachedBook = memoryCacheService.get<BookSearchResult>(cacheKey);
      
      if (cachedBook) {
        logger.info(`🚀 Memory cache hit for book: ${googleId}`);
        return cachedBook;
      }

      // 2. Buscar en base de datos
      const dbBook = await prisma.book.findUnique({
        where: { googleId }
      });

      if (dbBook) {
        const result = this.mapDbBookToSearchResult(dbBook, true);
        memoryCacheService.set(cacheKey, result);
        return result;
      }

      // 3. Si no está en cache, buscar en Google Books API
      const googleBook = await this.fetchBookFromGoogleAPI(googleId);
      if (!googleBook) {
        return null;
      }

      // 4. Persistir en cache y retornar
      const savedBook = await this.saveBookToDatabase(googleBook);
      const result = this.mapDbBookToSearchResult(savedBook, false);
      memoryCacheService.set(cacheKey, result);
      
      return result;

    } catch (error) {
      logger.error(`Error getting book by Google ID ${googleId}:`, error);
      return null;
    }
  }

  /**
   * Buscar libros en cache local con full-text search optimizado y filtros de relevancia
   */
  private async searchBooksInCache(query: string, limit: number): Promise<BookSearchResult[]> {
    try {
      // Construir query más preciso para la base de datos
      const preciseQuery = this.buildPreciseQuery(query);
      
      // Usar full-text search si está disponible
      const books = await prisma.$queryRaw`
        SELECT * FROM books 
        WHERE MATCH(title, authors, description) AGAINST(${preciseQuery} IN BOOLEAN MODE)
        ORDER BY createdAt DESC 
        LIMIT ${limit * 2}
      ` as any[];

      // Filtrar por relevancia
      const filteredBooks = this.filterRelevantBooksFromDB(books, query);
      
      return filteredBooks
        .slice(0, limit)
        .map(book => this.mapDbBookToSearchResult(book, true));
      
    } catch (error) {
      // Fallback a búsqueda con LIKE si full-text search no está disponible
      logger.warn('Full-text search not available, falling back to LIKE search:', error);
      
      return this.searchBooksInCacheFallback(query, limit);
    }
  }

  /**
   * Buscar libros en Google Books API con retry logic mejorado y filtros precisos
   */
  private async searchBooksInGoogleAPI(
    query: string, 
    maxResults: number,
    deviceLanguage?: string,
    retries: number = 3
  ): Promise<GoogleBookData[]> {
    
    // Usar idioma del dispositivo como prioridad, o detectar automáticamente
    const preferredLanguage = deviceLanguage || this.detectQueryLanguage(query);
    logger.info(`🌍 Using language: ${preferredLanguage} (device: ${deviceLanguage || 'auto'}, detected: ${this.detectQueryLanguage(query)}) for "${query}"`);
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const url = `${this.baseUrl}`;
        
        // Construir query más preciso para Google Books API
        const optimizedQuery = this.buildPreciseQuery(query);
        
        const params = {
          q: optimizedQuery,
          maxResults: Math.min(maxResults * 2, 40), // Traer más para filtrar después
          orderBy: 'relevance', // Ordenar por relevancia
          printType: 'books', // Solo libros, no magazines
          langRestrict: preferredLanguage, // Filtrar por idioma preferido
          ...(this.apiKey && { key: this.apiKey })
        };

        logger.info(`📚 API params: q="${optimizedQuery}", lang=${preferredLanguage}, maxResults=${params.maxResults}`);

        const response = await axios.get<GoogleBooksSearchResponse>(url, { 
          params,
          timeout: 10000 + (attempt * 2000)
        });

        const books = response.data.items || [];
        
        // Filtrar resultados por relevancia e idioma antes de retornar
        const filteredBooks = this.filterRelevantBooks(books, query, preferredLanguage);
        
        logger.info(`Google Books API: ${books.length} raw results, ${filteredBooks.length} after filtering`);
        
        return filteredBooks.slice(0, maxResults);

      } catch (error) {
        if (attempt === retries) {
          logger.error(`Google Books API failed after ${retries} attempts:`, error);
          throw error;
        }

        const delay = Math.pow(2, attempt - 1) * 1000;
        logger.warn(`Google Books API attempt ${attempt} failed, retrying in ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return [];
  }

  /**
   * Obtener un libro específico de Google Books API con retry
   */
  private async fetchBookFromGoogleAPI(googleId: string, retries: number = 2): Promise<GoogleBookData | null> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const url = `${this.baseUrl}/${googleId}`;
        const params = this.apiKey ? { key: this.apiKey } : {};

        const response = await axios.get<GoogleBookData>(url, { 
          params,
          timeout: 8000 + (attempt * 1000)
        });
        
        return response.data;
        
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          return null;
        }
        
        if (attempt === retries) {
          throw error;
        }
        
        const delay = attempt * 500; // 500ms, 1s
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return null;
  }

  /**
   * Persistir nuevos libros con batch operations optimizado
   */
  private async persistNewBooksToCache(
    googleBooks: GoogleBookData[], 
    existingCachedBooks: BookSearchResult[]
  ): Promise<BookSearchResult[]> {
    
    const existingGoogleIds = new Set(existingCachedBooks.map(book => book.googleId));
    const newGoogleBooks = googleBooks.filter(book => !existingGoogleIds.has(book.id));

    if (newGoogleBooks.length === 0) return [];

    // Preparar datos para batch insert
    const booksData = newGoogleBooks.map(googleBook => {
      const { id: googleId, volumeInfo } = googleBook;
      const isbn = volumeInfo.industryIdentifiers?.find(id => 
        id.type === 'ISBN_13' || id.type === 'ISBN_10'
      )?.identifier;
      const imageUrl = volumeInfo.imageLinks?.thumbnail || volumeInfo.imageLinks?.smallThumbnail;

      return {
        googleId,
        title: (volumeInfo.title || 'Título no disponible').toLowerCase(),
        authors: JSON.stringify((volumeInfo.authors || ['Autor desconocido']).map(a => a.toLowerCase())),
        description: volumeInfo.description?.toLowerCase() || null,
        isbn: isbn || null,
        publisher: volumeInfo.publisher || null,
        publishedDate: volumeInfo.publishedDate || null,
        pageCount: volumeInfo.pageCount || null,
        categories: JSON.stringify(volumeInfo.categories || []),
        imageUrl: imageUrl || null,
        language: volumeInfo.language || 'es'
      };
    });

    try {
      // Batch insert con manejo de duplicados
      await prisma.book.createMany({
        data: booksData,
        skipDuplicates: true
      });

      // Recuperar libros insertados para respuesta
      const insertedBooks = await prisma.book.findMany({
        where: {
          googleId: { in: newGoogleBooks.map(book => book.id) }
        }
      });

      logger.info(`📚 Batch inserted ${insertedBooks.length} new books to cache`);
      return insertedBooks.map(book => this.mapDbBookToSearchResult(book, false));
      
    } catch (error) {
      logger.error('Error in batch insert, falling back to individual inserts:', error);
      
      // Fallback al método individual
      return this.persistNewBooksToCacheIndividual(newGoogleBooks);
    }
  }

  /**
   * Fallback: persistir libros individualmente
   */
  private async persistNewBooksToCacheIndividual(googleBooks: GoogleBookData[]): Promise<BookSearchResult[]> {
    const savedBooks: BookSearchResult[] = [];

    for (const googleBook of googleBooks) {
      try {
        const savedBook = await this.saveBookToDatabase(googleBook);
        savedBooks.push(this.mapDbBookToSearchResult(savedBook, false));
      } catch (error) {
        logger.error(`Error saving book ${googleBook.id} to database:`, error);
        // Continuar con el siguiente libro si uno falla
      }
    }

    return savedBooks;
  }

  /**
   * Guardar libro de Google Books en base de datos local
   */
  private async saveBookToDatabase(googleBook: GoogleBookData) {
    const { id: googleId, volumeInfo } = googleBook;
    
    const isbn = volumeInfo.industryIdentifiers?.find(id => 
      id.type === 'ISBN_13' || id.type === 'ISBN_10'
    )?.identifier;

    const imageUrl = volumeInfo.imageLinks?.thumbnail || volumeInfo.imageLinks?.smallThumbnail;

    const bookData = {
      googleId,
      title: (volumeInfo.title || 'Título no disponible').toLowerCase(),
      authors: JSON.stringify((volumeInfo.authors || ['Autor desconocido']).map(a => a.toLowerCase())),
      description: volumeInfo.description?.toLowerCase() || null,
      isbn: isbn || null,
      publisher: volumeInfo.publisher || null,
      publishedDate: volumeInfo.publishedDate || null,
      pageCount: volumeInfo.pageCount || null,
      categories: JSON.stringify(volumeInfo.categories || []),
      imageUrl: imageUrl || null,
      language: volumeInfo.language || 'es'
    };

    return await prisma.book.upsert({
      where: { googleId },
      update: bookData,
      create: bookData
    });
  }

  /**
   * Mapear libro de base de datos a formato de resultado de búsqueda
   */
  private mapDbBookToSearchResult(dbBook: any, isFromCache: boolean): BookSearchResult {
    return {
      id: dbBook.id,
      googleId: dbBook.googleId || '',
      title: this.capitalizeText(dbBook.title),
      authors: JSON.parse(dbBook.authors || '[]').map((author: string) => this.capitalizeText(author)),
      description: dbBook.description ? this.capitalizeText(dbBook.description) : undefined,
      isbn: dbBook.isbn || undefined,
      publisher: dbBook.publisher || undefined,
      publishedDate: dbBook.publishedDate || undefined,
      pageCount: dbBook.pageCount || undefined,
      categories: JSON.parse(dbBook.categories || '[]'),
      imageUrl: dbBook.imageUrl || undefined,
      language: dbBook.language || 'es',
      isFromCache
    };
  }

  /**
   * Determinar si debería llamar a la API externa
   */
  private shouldCallAPI(query: string): boolean {
    // Solo llamar API si no tenemos suficientes resultados en cache
    // y el query tiene sentido (evitar calls para queries muy cortas)
    return query.length >= 3;
  }

  /**
   * Capitalizar texto para mostrar al usuario
   */
  private capitalizeText(text: string): string {
    if (!text) return text;
    return text.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  /**
   * Deduplicar libros por googleId
   */
  private deduplicateBooks(books: BookSearchResult[]): BookSearchResult[] {
    const seen = new Set<string>();
    return books.filter(book => {
      if (seen.has(book.googleId)) {
        return false;
      }
      seen.add(book.googleId);
      return true;
    });
  }

  /**
   * Estadísticas de cache para monitoreo
   */
  async getCacheStats() {
    const totalBooks = await prisma.book.count();
    const booksWithGoogleId = await prisma.book.count({
      where: { googleId: { not: null } }
    });
    
    const memoryStats = memoryCacheService.getDetailedStats();
    
    return {
      database: {
        totalBooks,
        booksWithGoogleId,
        cachePercentage: totalBooks > 0 ? (booksWithGoogleId / totalBooks) * 100 : 0
      },
      memory: memoryStats
    };
  }

  /**
   * Detectar idioma del query de búsqueda
   */
  private detectQueryLanguage(query: string): string {
    const spanishWords = ['y', 'el', 'la', 'de', 'del', 'los', 'las', 'un', 'una', 'con', 'en', 'para', 'por', 'sin', 'sobre', 'entre'];
    const englishWords = ['and', 'the', 'of', 'in', 'to', 'for', 'with', 'on', 'at', 'by', 'from', 'about', 'into', 'through'];
    
    const queryWords = query.toLowerCase().split(' ');
    
    const spanishMatches = queryWords.filter(word => spanishWords.includes(word)).length;
    const englishMatches = queryWords.filter(word => englishWords.includes(word)).length;
    
    if (spanishMatches > englishMatches) return 'es';
    if (englishMatches > spanishMatches) return 'en';
    
    // Si no hay palabras clave, detectar por caracteres
    const hasSpanishChars = /[áéíóúñüÁÉÍÓÚÑÜ]/.test(query);
    return hasSpanishChars ? 'es' : 'en';
  }

  /**
   * Construir query más preciso para APIs de búsqueda
   */
  private buildPreciseQuery(originalQuery: string): string {
    // Limpiar y normalizar el query
    let query = originalQuery.trim();
    
    // Si contiene "y" o "and", usar comillas para buscar frase exacta
    if (query.toLowerCase().includes(' y ') || query.toLowerCase().includes(' and ')) {
      return `"${query}"`;
    }
    
    // Si tiene más de 3 palabras, buscar como frase exacta
    const words = query.split(' ').filter(word => word.length > 0);
    if (words.length >= 3) {
      return `"${query}"`;
    }
    
    // Para queries cortos, usar términos individuales con +
    if (words.length === 2) {
      return words.map(word => `+${word}`).join(' ');
    }
    
    return query;
  }

  /**
   * Filtrar libros de Google Books API por relevancia e idioma
   */
  private filterRelevantBooks(books: GoogleBookData[], originalQuery: string, preferredLanguage?: string): GoogleBookData[] {
    const queryLower = originalQuery.toLowerCase();
    const queryWords = queryLower.split(' ').filter(word => word.length > 1);
    
    console.log(`🔍 Filtering ${books.length} books for query: "${originalQuery}"`);
    console.log(`📝 Query words: [${queryWords.join(', ')}]`);
    if (preferredLanguage) {
      console.log(`🌍 Preferred language: ${preferredLanguage}`);
    }
    
    const filtered = books.filter(book => {
      const title = book.volumeInfo.title?.toLowerCase() || '';
      const authors = book.volumeInfo.authors?.join(' ').toLowerCase() || '';
      const bookLanguage = book.volumeInfo.language || 'en';
      
      console.log(`📖 Checking: "${book.volumeInfo.title}" by ${book.volumeInfo.authors?.join(', ')} (${bookLanguage})`);
      
      // 1. Si el query completo está en el título → SIEMPRE incluir
      if (title.includes(queryLower)) {
        console.log(`   ✅ MATCH: Query completo en título`);
        return true;
      }
      
      // 2. Si el query completo está en autores → SIEMPRE incluir
      if (authors.includes(queryLower)) {
        console.log(`   ✅ MATCH: Query completo en autores`);
        return true;
      }
      
      // 3. Para queries largos (libros específicos), ser más flexible
      if (originalQuery.length > 15) {
        // Verificar si al menos 60% de las palabras están presentes
        const titleWords = title.split(' ');
        const authorWords = authors.split(' ');
        const allBookWords = [...titleWords, ...authorWords];
        
        const matchCount = queryWords.filter(queryWord => 
          allBookWords.some(bookWord => 
            bookWord.includes(queryWord) || queryWord.includes(bookWord)
          )
        ).length;
        
        const relevanceScore = matchCount / queryWords.length;
        console.log(`   📊 Relevance score: ${relevanceScore.toFixed(2)} (${matchCount}/${queryWords.length})`);
        
        if (relevanceScore >= 0.4) {
          console.log(`   ✅ MATCH: Relevance score suficiente`);
          return true;
        }
      } else {
        // Para queries cortos, verificar coincidencias parciales
        const hasPartialMatch = queryWords.some(queryWord => 
          title.includes(queryWord) || authors.includes(queryWord)
        );
        
        if (hasPartialMatch) {
          console.log(`   ✅ MATCH: Coincidencia parcial`);
          return true;
        }
      }
      
      console.log(`   ❌ NO MATCH`);
      return false;
    })
    .sort((a, b) => {
      const titleA = a.volumeInfo.title?.toLowerCase() || '';
      const titleB = b.volumeInfo.title?.toLowerCase() || '';
      const langA = a.volumeInfo.language || 'en';
      const langB = b.volumeInfo.language || 'en';
      
      // 1. Priorizar libros en el idioma preferido
      if (preferredLanguage) {
        const aIsPreferredLang = langA === preferredLanguage ? 1 : 0;
        const bIsPreferredLang = langB === preferredLanguage ? 1 : 0;
        
        if (aIsPreferredLang !== bIsPreferredLang) {
          return bIsPreferredLang - aIsPreferredLang;
        }
      }
      
      // 2. Luego priorizar por coincidencia exacta en título
      const aContainsQuery = titleA.includes(queryLower) ? 1 : 0;
      const bContainsQuery = titleB.includes(queryLower) ? 1 : 0;
      
      return bContainsQuery - aContainsQuery;
    });
    
    console.log(`📊 Filtered results: ${filtered.length}/${books.length}`);
    filtered.slice(0, 5).forEach((book, i) => {
      const lang = book.volumeInfo.language || 'unknown';
      const langFlag = lang === 'es' ? '🇪🇸' : lang === 'en' ? '🇺🇸' : '🌍';
      console.log(`   ${i + 1}. ${langFlag} "${book.volumeInfo.title}" by ${book.volumeInfo.authors?.join(', ')}`);
    });
    
    return filtered;
  }

  /**
   * Filtrar libros de la base de datos por relevancia
   */
  private filterRelevantBooksFromDB(books: any[], originalQuery: string): any[] {
    const queryLower = originalQuery.toLowerCase();
    
    return books.filter(book => {
      const title = book.title?.toLowerCase() || '';
      const authors = book.authors ? JSON.parse(book.authors).join(' ').toLowerCase() : '';
      
      // Para queries largos, debe estar en título o autores
      if (originalQuery.length > 15) {
        return title.includes(queryLower) || authors.includes(queryLower);
      }
      
      // Para queries cortos, aplicar filtro menos estricto
      const queryWords = queryLower.split(' ').filter(word => word.length > 2);
      const matchCount = queryWords.filter(queryWord => 
        title.includes(queryWord) || authors.includes(queryWord)
      ).length;
      
      return matchCount >= Math.ceil(queryWords.length * 0.6);
    });
  }

  /**
   * Fallback de búsqueda en cache cuando full-text search falla
   */
  private async searchBooksInCacheFallback(query: string, limit: number): Promise<BookSearchResult[]> {
    const lowerQuery = query.toLowerCase();
    const queryWords = lowerQuery.split(' ').filter(word => word.length > 2);
    
    // Buscar con múltiples estrategias
    const titleExactMatch = await prisma.book.findMany({
      where: { title: { contains: lowerQuery } },
      take: limit,
      orderBy: { createdAt: 'desc' }
    });
    
    if (titleExactMatch.length >= limit) {
      return titleExactMatch.map(book => this.mapDbBookToSearchResult(book, true));
    }
    
    // Si no hay suficientes, buscar por palabras individuales
    const wordMatches = await prisma.book.findMany({
      where: {
        OR: [
          ...queryWords.map(word => ({ title: { contains: word } })),
          ...queryWords.map(word => ({ authors: { contains: word } }))
        ]
      },
      take: limit * 2,
      orderBy: { createdAt: 'desc' }
    });
    
    // Filtrar y ordenar por relevancia
    const filtered = this.filterRelevantBooksFromDB(wordMatches, query);
    
    return filtered
      .slice(0, limit)
      .map(book => this.mapDbBookToSearchResult(book, true));
  }

  /**
   * Ordenar resultados por preferencia de idioma del dispositivo
   */
  private sortByLanguagePreference(books: BookSearchResult[], deviceLanguage?: string): BookSearchResult[] {
    if (!deviceLanguage) return books;
    
    return books.sort((a, b) => {
      const langA = a.language || 'en';
      const langB = b.language || 'en';
      
      // Priorizar idioma del dispositivo
      const aIsDeviceLang = langA === deviceLanguage ? 1 : 0;
      const bIsDeviceLang = langB === deviceLanguage ? 1 : 0;
      
      if (aIsDeviceLang !== bIsDeviceLang) {
        return bIsDeviceLang - aIsDeviceLang;
      }
      
      // Si ambos tienen el mismo idioma, mantener orden existente
      return 0;
    });
  }

  /**
   * Limpiar memory cache (útil para testing o maintenance)
   */
  clearMemoryCache(): void {
    memoryCacheService.clear();
    logger.info('📚 Google Books memory cache cleared');
  }
}

export const googleBooksService = new GoogleBooksService();

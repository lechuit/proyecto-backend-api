import { googleBooksService } from '../services/googleBooks.service';
import { logger } from '../utils/logger';

async function testPreciseBookSearch() {
  console.log('📚 Testing búsqueda precisa de libros...');
  console.log('='.repeat(50));

  const testCases = [
    {
      query: 'Harry Potter Y El Prisionero de Azkaban',
      expectedInTitle: 'prisionero',
      maxResults: 5
    },
    {
      query: 'Cien años de soledad',
      expectedInTitle: 'cien años',
      maxResults: 5
    },
    {
      query: 'El Quijote',
      expectedInTitle: 'quijote',
      maxResults: 5
    },
    {
      query: 'García Márquez',
      expectedInAuthors: 'garcía márquez',
      maxResults: 8
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n🔍 Testing: "${testCase.query}"`);
    console.log('-'.repeat(40));
    
    const startTime = Date.now();
    
    try {
      const results = await googleBooksService.searchBooks(testCase.query, testCase.maxResults);
      const duration = Date.now() - startTime;
      
      console.log(`⏱️  Tiempo: ${duration}ms`);
      console.log(`📊 Resultados: ${results.length}`);
      console.log(`💾 Desde cache: ${results.filter(r => r.isFromCache).length}`);
      console.log(`🌐 Desde API: ${results.filter(r => !r.isFromCache).length}`);
      
      // Verificar precisión de resultados
      let relevantResults = 0;
      
      console.log('\n📖 Primeros resultados:');
      results.slice(0, 3).forEach((book, index) => {
        const title = book.title.toLowerCase();
        const authors = book.authors.join(' ').toLowerCase();
        
        let isRelevant = false;
        
        if (testCase.expectedInTitle && title.includes(testCase.expectedInTitle)) {
          isRelevant = true;
        }
        
        if (testCase.expectedInAuthors && authors.includes(testCase.expectedInAuthors)) {
          isRelevant = true;
        }
        
        if (isRelevant) relevantResults++;
        
        const relevanceIcon = isRelevant ? '✅' : '⚠️';
        
        console.log(`   ${index + 1}. ${relevanceIcon} ${book.title}`);
        console.log(`      👤 ${book.authors.join(', ')}`);
        
        if (book.publishedDate) {
          console.log(`      📅 ${book.publishedDate}`);
        }
      });
      
      const precision = (relevantResults / Math.min(results.length, 3)) * 100;
      console.log(`\n🎯 Precisión: ${precision.toFixed(1)}% (${relevantResults}/${Math.min(results.length, 3)} relevantes)`);
      
      // Análisis de calidad
      if (precision >= 80) {
        console.log('🟢 Excelente precisión');
      } else if (precision >= 60) {
        console.log('🟡 Buena precisión');
      } else {
        console.log('🔴 Precisión mejorable');
      }
      
    } catch (error) {
      console.error(`❌ Error: ${error}`);
    }
  }
  
  // Test de queries cortos vs largos
  console.log('\n' + '='.repeat(50));
  console.log('📏 Testing queries de diferentes longitudes...');
  
  const lengthTests = [
    'Harry', // Corto - debería ser menos preciso
    'Harry Potter', // Medio - mejor precisión
    'Harry Potter Y El Prisionero de Azkaban' // Largo - máxima precisión
  ];
  
  for (const query of lengthTests) {
    console.log(`\n🔍 "${query}" (${query.length} chars)`);
    const startTime = Date.now();
    
    try {
      const results = await googleBooksService.searchBooks(query, 3);
      const duration = Date.now() - startTime;
      
      console.log(`   ⏱️  ${duration}ms, ${results.length} resultados`);
      
      const harryPotterResults = results.filter(book => 
        book.title.toLowerCase().includes('harry potter')
      ).length;
      
      console.log(`   📚 Harry Potter books: ${harryPotterResults}/${results.length}`);
      
    } catch (error) {
      console.error(`   ❌ Error: ${error}`);
    }
  }
  
  console.log('\n🎉 Testing completado!');
}

// Test de stress
async function testSearchStress() {
  console.log('\n🔥 Stress test de búsqueda...');
  
  const queries = [
    'Don Quijote',
    'Cervantes',
    'García Márquez',
    'Harry Potter',
    'Stephen King'
  ];
  
  const startTime = Date.now();
  
  try {
    const promises = queries.map(query => 
      googleBooksService.searchBooks(query, 5)
    );
    
    const results = await Promise.all(promises);
    const duration = Date.now() - startTime;
    
    const totalResults = results.reduce((sum, r) => sum + r.length, 0);
    
    console.log(`⚡ ${queries.length} búsquedas paralelas en ${duration}ms`);
    console.log(`📊 Total resultados: ${totalResults}`);
    console.log(`⚡ Promedio: ${(duration / queries.length).toFixed(1)}ms por búsqueda`);
    
  } catch (error) {
    console.error('❌ Stress test falló:', error);
  }
}

async function main() {
  try {
    await testPreciseBookSearch();
    await testSearchStress();
    
    // Cache stats
    console.log('\n📊 Estadísticas de cache:');
    const stats = await googleBooksService.getCacheStats();
    console.log(JSON.stringify(stats, null, 2));
    
  } catch (error) {
    console.error('❌ Error en testing:', error);
  } finally {
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

export { testPreciseBookSearch, testSearchStress };

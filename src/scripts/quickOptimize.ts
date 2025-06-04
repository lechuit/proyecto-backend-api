import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function quickOptimize() {
  console.log('🚀 Aplicando optimizaciones rápidas...');
  
  try {
    // Solo los índices más importantes
    const essentialIndices = [
      'ALTER TABLE books ADD FULLTEXT INDEX idx_books_search (title, authors, description)',
      'CREATE INDEX idx_books_google_id ON books(googleId)'
    ];

    for (const [i, command] of essentialIndices.entries()) {
      try {
        console.log(`${i + 1}. Aplicando índice ${i + 1}/2...`);
        await prisma.$executeRawUnsafe(command);
        console.log(`✅ Índice ${i + 1} aplicado`);
      } catch (error: any) {
        if (error.message.includes('Duplicate') || error.message.includes('exists')) {
          console.log(`⚠️ Índice ${i + 1} ya existe`);
        } else {
          console.log(`❌ Error índice ${i + 1}: ${error.message.split('\n')[0]}`);
        }
      }
    }

    // Test rápido
    console.log('\n🧪 Test rápido...');
    const testResult = await prisma.book.findMany({
      where: { title: { contains: 'harry potter' } },
      take: 3
    });
    
    console.log(`📚 Encontrados ${testResult.length} libros de prueba`);
    console.log('✅ Optimizaciones básicas completadas!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  quickOptimize();
}

export { quickOptimize };

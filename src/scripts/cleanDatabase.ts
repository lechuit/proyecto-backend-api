import { prisma } from '../config/database';

export async function cleanDatabase() {
  try {
    console.log('🧹 Iniciando limpieza de la base de datos...');

    // Delete in order to respect foreign key constraints
    console.log('🗑️ Eliminando likes...');
    await prisma.like.deleteMany();
    
    console.log('🗑️ Eliminando comentarios...');
    await prisma.comment.deleteMany();
    
    console.log('🗑️ Eliminando relaciones de seguimiento...');
    await prisma.follow.deleteMany();
    
    console.log('🗑️ Eliminando posts...');
    await prisma.post.deleteMany();
    
    console.log('🗑️ Eliminando libros...');
    await prisma.book.deleteMany();
    
    console.log('🗑️ Eliminando usuarios...');
    await prisma.user.deleteMany();

    console.log('✅ Base de datos limpiada exitosamente!');
    console.log('📊 Todas las tablas están ahora vacías');

  } catch (error) {
    console.error('❌ Error limpiando la base de datos:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  cleanDatabase()
    .then(() => {
      console.log('✅ Limpieza completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Limpieza falló:', error);
      process.exit(1);
    });
}

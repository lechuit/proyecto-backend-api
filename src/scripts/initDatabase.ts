import { prisma } from '../config/database';
import { seedDatabase } from './seedDatabase';

export async function initializeDatabase() {
  try {
    console.log('🔍 Verificando estado de la base de datos...');

    // Check if database has any users (indicating it's already initialized)
    const userCount = await prisma.user.count();
    
    if (userCount === 0) {
      console.log('📥 Base de datos vacía detectada - ejecutando seed inicial...');
      await seedDatabase();
      console.log('✅ Base de datos inicializada con datos de prueba');
    } else {
      console.log(`✅ Base de datos ya inicializada (${userCount} usuarios encontrados)`);
      console.log('🚫 Saltando seed para preservar datos existentes');
    }

  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('✅ Inicialización completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Inicialización falló:', error);
      process.exit(1);
    });
}

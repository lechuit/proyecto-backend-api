import { prisma } from '../config/database';
import bcrypt from 'bcryptjs';

const mockBooks = [
  {
    title: 'Cien años de soledad',
    authors: ['Gabriel García Márquez'],
    description: 'Una obra maestra del realismo mágico',
    imageUrl: 'https://picsum.photos/200/300?random=20',
    isbn: '9780060883287',
    publishedDate: '1967',
    categories: ['Realismo Mágico', 'Literatura Latinoamericana']
  },
  {
    title: 'Harry Potter y la Piedra Filosofal',
    authors: ['J.K. Rowling'],
    description: 'El primer libro de la saga de Harry Potter',
    imageUrl: 'https://picsum.photos/200/300?random=21',
    isbn: '9780439708180',
    publishedDate: '1997',
    categories: ['Fantasía', 'Juvenil']
  },
  {
    title: 'El marciano',
    authors: ['Andy Weir'],
    description: 'Ciencia ficción sobre supervivencia en Marte',
    imageUrl: 'https://picsum.photos/200/300?random=22',
    isbn: '9780553418026',
    publishedDate: '2011',
    categories: ['Ciencia Ficción', 'Aventura']
  },
  {
    title: 'Orgullo y prejuicio',
    authors: ['Jane Austen'],
    description: 'Clásico de la literatura inglesa',
    imageUrl: 'https://picsum.photos/200/300?random=23',
    isbn: '9780141439518',
    publishedDate: '1813',
    categories: ['Romance', 'Clásicos']
  },
  {
    title: '1984',
    authors: ['George Orwell'],
    description: 'Distopía clásica sobre un estado totalitario',
    imageUrl: 'https://picsum.photos/200/300?random=24',
    isbn: '9780451524935',
    publishedDate: '1949',
    categories: ['Distopía', 'Ciencia Ficción']
  }
];

const mockUsers = [
  {
    email: 'maria@email.com',
    username: 'maria_lectora',
    displayName: 'María González',
    bio: 'Amante de los clásicos latinoamericanos 📚',
    avatar: 'https://picsum.photos/80/80?random=10'
  },
  {
    email: 'carlos@email.com',
    username: 'wizard_reader',
    displayName: 'Carlos Mágico',
    bio: 'Fan de fantasía y Harry Potter ⚡',
    avatar: 'https://picsum.photos/80/80?random=11'
  },
  {
    email: 'ana@email.com',
    username: 'bookworm2025',
    displayName: 'Ana Lectora',
    bio: 'Meta 2025: 52 libros 🎯 Ya voy por 18!',
    avatar: 'https://picsum.photos/80/80?random=12'
  },
  {
    email: 'roberto@email.com',
    username: 'scifi_fan',
    displayName: 'Roberto Espacial',
    bio: 'Ciencia ficción y exploración espacial 🚀',
    avatar: 'https://picsum.photos/80/80?random=13'
  },
  {
    email: 'elena@email.com',
    username: 'classic_lover',
    displayName: 'Elena Clásica',
    bio: 'Los clásicos nunca pasan de moda 📖',
    avatar: 'https://picsum.photos/80/80?random=14'
  }
];

const mockPosts = [
  {
    content: '¡Acabo de terminar "Cien años de soledad" y estoy completamente fascinado! 📚 La forma en que García Márquez teje la realidad con elementos mágicos es simplemente extraordinaria. ¿Alguien más ha leído este clásico?',
    imageUrl: 'https://picsum.photos/400/300?random=1',
    userIndex: 0,
    bookIndex: 0
  },
  {
    content: 'Empezando mi viaje por la saga de Harry Potter otra vez 🪄 Nunca me canso de volver a Hogwarts. ¿Cuál es su libro favorito de la saga?',
    userIndex: 1,
    bookIndex: 1
  },
  {
    content: 'Meta de lectura 2025: 52 libros 📈 ¡Ya voy por el libro número 18! ¿Alguien más se ha puesto metas de lectura este año?',
    imageUrl: 'https://picsum.photos/400/250?random=2',
    userIndex: 2,
    bookIndex: null
  },
  {
    content: '¿Alguien tiene recomendaciones de ciencia ficción? Acabo de terminar "El marciano" y necesito algo similar 🚀',
    userIndex: 3,
    bookIndex: 2
  },
  {
    content: 'Primer día de mi club de lectura local 📖 Vamos a leer "Orgullo y prejuicio". ¡Estoy emocionada de discutir los clásicos con más gente!',
    imageUrl: 'https://picsum.photos/400/300?random=3',
    userIndex: 4,
    bookIndex: 3
  },
  {
    content: 'Reflexionando sobre "1984" de Orwell. Cada vez que lo releo, encuentro nuevas capas de significado. La vigilancia masiva que describe parece cada vez más relevante.',
    userIndex: 0,
    bookIndex: 4
  },
  {
    content: 'Terminé mi primer maratón de lectura del año 📚✨ 5 libros en una semana. Agotador pero increíblemente satisfactorio.',
    imageUrl: 'https://picsum.photos/400/300?random=4',
    userIndex: 2,
    bookIndex: null
  },
  {
    content: 'Buscando el regalo perfecto para mi sobrina que está empezando a leer. ¿Alguna recomendación para lectores jóvenes?',
    userIndex: 4,
    bookIndex: null
  }
];

export async function seedDatabase(cleanOnly = false) {
  try {
    console.log(cleanOnly ? '🧹 Iniciando limpieza de la base de datos...' : '🌱 Iniciando población de la base de datos...');

    // Clear existing data
    await prisma.like.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.follow.deleteMany();
    await prisma.post.deleteMany();
    await prisma.book.deleteMany();
    await prisma.user.deleteMany();
    console.log('🗑️ Datos anteriores eliminados');

    if (cleanOnly) {
      console.log('✅ Base de datos limpiada exitosamente!');
      console.log('📊 Todas las tablas están ahora vacías');
      return;
    }

    // Create books
    console.log('📚 Creando libros...');
    const createdBooks = [];
    for (const book of mockBooks) {
      const createdBook = await prisma.book.create({
        data: {
          title: book.title,
          authors: JSON.stringify(book.authors), // Convert array to JSON string
          description: book.description,
          imageUrl: book.imageUrl,
          isbn: book.isbn,
          publishedDate: book.publishedDate,
          categories: JSON.stringify(book.categories) // Convert array to JSON string
        }
      });
      createdBooks.push(createdBook);
    }
    console.log(`✅ ${createdBooks.length} libros creados`);

    // Create users
    console.log('👥 Creando usuarios...');
    const createdUsers = [];
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    for (const user of mockUsers) {
      const createdUser = await prisma.user.create({
        data: {
          ...user,
          password: hashedPassword,
          isVerified: Math.random() > 0.5 // Random verification status
        }
      });
      createdUsers.push(createdUser);
    }
    console.log(`✅ ${createdUsers.length} usuarios creados`);

    // Create some follow relationships
    console.log('🤝 Creando relaciones de seguimiento...');
    const followRelationships = [
      { follower: 0, following: 1 },
      { follower: 0, following: 2 },
      { follower: 1, following: 0 },
      { follower: 1, following: 3 },
      { follower: 2, following: 0 },
      { follower: 2, following: 4 },
      { follower: 3, following: 1 },
      { follower: 4, following: 0 },
      { follower: 4, following: 2 }
    ];

    for (const rel of followRelationships) {
      await prisma.follow.create({
        data: {
          followerId: createdUsers[rel.follower].id,
          followingId: createdUsers[rel.following].id
        }
      });
    }
    console.log(`✅ ${followRelationships.length} relaciones de seguimiento creadas`);

    // Create posts
    console.log('📝 Creando posts...');
    const createdPosts = [];
    for (const post of mockPosts) {
      const createdPost = await prisma.post.create({
        data: {
          content: post.content,
          imageUrl: post.imageUrl,
          authorId: createdUsers[post.userIndex].id,
          bookId: post.bookIndex !== null ? createdBooks[post.bookIndex].id : null,
          createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Random date in last week
        }
      });
      createdPosts.push(createdPost);
    }
    console.log(`✅ ${createdPosts.length} posts creados`);

    // Create some likes
    console.log('❤️ Creando likes...');
    const likesData = [];
    for (let i = 0; i < 20; i++) {
      const randomUser = createdUsers[Math.floor(Math.random() * createdUsers.length)];
      const randomPost = createdPosts[Math.floor(Math.random() * createdPosts.length)];
      
      // Avoid duplicate likes
      const existingLike = await prisma.like.findUnique({
        where: {
          userId_postId: {
            userId: randomUser.id,
            postId: randomPost.id
          }
        }
      });

      if (!existingLike) {
        await prisma.like.create({
          data: {
            userId: randomUser.id,
            postId: randomPost.id
          }
        });
        likesData.push({ userId: randomUser.id, postId: randomPost.id });
      }
    }
    console.log(`✅ ${likesData.length} likes creados`);

    // Create some comments
    console.log('💬 Creando comentarios...');
    const comments = [
      'Me encanta este libro también!',
      'Excelente recomendación 👍',
      'Tengo que leerlo definitivamente',
      'Totalmente de acuerdo contigo',
      'Gracias por compartir!',
      '¿Tienes más recomendaciones similares?',
      'Acabo de agregarlo a mi lista de lectura',
      'Una de mis sagas favoritas!',
      'Muy buena reflexión',
      'Inspiring! 📚'
    ];

    for (let i = 0; i < 15; i++) {
      const randomUser = createdUsers[Math.floor(Math.random() * createdUsers.length)];
      const randomPost = createdPosts[Math.floor(Math.random() * createdPosts.length)];
      const randomComment = comments[Math.floor(Math.random() * comments.length)];
      
      await prisma.comment.create({
        data: {
          content: randomComment,
          userId: randomUser.id,
          postId: randomPost.id,
          createdAt: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000) // Random date in last 3 days
        }
      });
    }
    console.log('✅ 15 comentarios creados');

    console.log('🎉 ¡Base de datos poblada exitosamente!');
    console.log('📊 Datos creados:');
    console.log(`   - ${createdBooks.length} libros`);
    console.log(`   - ${createdUsers.length} usuarios`);
    console.log(`   - ${followRelationships.length} relaciones de seguimiento`);
    console.log(`   - ${createdPosts.length} posts`);
    console.log(`   - ${likesData.length} likes`);
    console.log('   - 15 comentarios');
    console.log('');
    console.log('👤 Usuarios de prueba (password: password123):');
    createdUsers.forEach(user => {
      console.log(`   - ${user.email} (@${user.username})`);
    });

  } catch (error) {
    console.error('❌ Error poblando la base de datos:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  const cleanOnly = process.argv.includes('--clean');
  
  seedDatabase(cleanOnly)
    .then(() => {
      console.log(cleanOnly ? '✅ Limpieza completada' : '✅ Script completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error(cleanOnly ? '❌ Limpieza falló:' : '❌ Script falló:', error);
      process.exit(1);
    });
}

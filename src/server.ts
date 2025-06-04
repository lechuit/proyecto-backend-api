import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import postRoutes from './routes/post.routes';
import bookRoutes from './routes/book.routes';
import debugRoutes from './routes/debug.routes';

import { PrismaClient } from '@prisma/client';

// Initialize Prisma
const prisma = new PrismaClient();

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy - NECESARIO para Railway y otros proxies
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // Trust first proxy (Railway)
} else {
  // En desarrollo, confiar en proxies locales si existen
  app.set('trust proxy', process.env.TRUST_PROXY === 'true');
}

// Security middleware
app.use(helmet());

// 🚀 COMPRESSION - Mejora performance significativamente
app.use(compression({
  level: 6, // Balancear compresión vs CPU
  threshold: 1024, // Solo comprimir responses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// 🔧 CORS MEJORADO - Permitir apps móviles
const allowedOrigins = [
  'http://localhost:8100',          // Ionic serve
  'http://127.0.0.1:8100',         // IP local
  'ionic://localhost',              // Ionic iOS
  'capacitor://localhost',          // Capacitor
  'http://localhost',               // Capacitor Android HTTP
  'https://localhost',              // Capacitor Android HTTPS
];

// En producción, agregar dominios específicos si los tienes
if (process.env.NODE_ENV === 'production') {
  if (process.env.ALLOWED_ORIGINS) {
    allowedOrigins.push(...process.env.ALLOWED_ORIGINS.split(','));
  }
}

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (apps móviles nativas)
    if (!origin) return callback(null, true);
    
    // Verificar si el origin está en la lista
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // En desarrollo, ser más permisivo
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // En producción, rechazar origins no permitidos
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count']
}));

// 🔓 RATE LIMITING DESHABILITADO PARA DESARROLLO
// Verificar si queremos rate limiting basado en variable de entorno
const ENABLE_RATE_LIMITING = process.env.ENABLE_RATE_LIMITING === 'true';

if (ENABLE_RATE_LIMITING) {
  logger.info('🛡️ Rate limiting HABILITADO');
  
  // Rate limiting - Configuración diferenciada por entorno
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || (process.env.NODE_ENV === 'production' ? '200' : '1000')), // Más permisivo en desarrollo
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') / 1000 / 60) + ' minutes'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    
    // Configuración mejorada para Railway
    keyGenerator: (req) => {
      // En producción (Railway), usar X-Forwarded-For si existe, sino req.ip
      let ip = req.ip;
      if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-for']) {
        ip = (req.headers['x-forwarded-for'] as string).split(',')[0].trim();
      }
      
      // Log para debugging
      if (process.env.NODE_ENV !== 'production') {
        console.log(`🌐 Rate limit key (IP): ${ip}`);
      }
      
      return ip || 'unknown';
    },
    
    skip: (req) => {
      // Skip rate limiting para health check en desarrollo
      return process.env.NODE_ENV !== 'production' && req.path === '/health';
    }
  });

  // Rate limiting más estricto solo para auth endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 5 : 20, // 5 intentos en prod, 20 en dev
    message: {
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    
    // Usar el mismo keyGenerator que el limiter global
    keyGenerator: (req) => {
      let ip = req.ip;
      if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-for']) {
        ip = (req.headers['x-forwarded-for'] as string).split(',')[0].trim();
      }
      return ip || 'unknown';
    }
  });

  // Aplicar rate limiting
  app.use(limiter);
  
  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString(), rateLimiting: 'enabled' });
  });

  // API Routes con rate limiting específico
  app.use('/api/auth', authLimiter, authRoutes); // Rate limiting estricto para auth
  app.use('/api/users', userRoutes);
  app.use('/api/posts', postRoutes);
  app.use('/api/books', bookRoutes);

  app.use('/api/debug', debugRoutes); // Temporal para debugging

} else {
  logger.info('🔓 Rate limiting DESHABILITADO');
  
  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString(), rateLimiting: 'disabled' });
  });

  // API Routes SIN rate limiting
  app.use('/api/auth', authRoutes); // Sin rate limiting
  app.use('/api/users', userRoutes);
  app.use('/api/posts', postRoutes);
  app.use('/api/books', bookRoutes);

  app.use('/api/debug', debugRoutes); // Temporal para debugging
}

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🛡️ Rate limiting: ${ENABLE_RATE_LIMITING ? 'ENABLED' : 'DISABLED'}`);
  logger.info(`🌐 CORS origins: ${allowedOrigins.join(', ')}`);
});

export default app;

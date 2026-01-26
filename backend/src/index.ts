/// <reference path="./types/fastify.d.ts" />
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import dotenv from 'dotenv';

dotenv.config();

import { testConnection } from './config/database.js';
import errorHandler from './plugins/errorHandler.js';
import fileUpload from './plugins/fileUpload.js';
import { registerSwagger } from './plugins/swagger.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import roleRoutes from './routes/roleRoutes.js';
import matrixRoutes from './routes/matrixRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import methodRoutes from './routes/methodRoutes.js';
import labRoutes from './routes/labRoutes.js';
import parameterRoutes from './routes/parameterRoutes.js';
import unitRoutes from './routes/unitRoutes.js';
import analystTypeRoutes from './routes/analystTypeRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import subcontractorRoutes from './routes/subcontractorRoutes.js';
import packageRoutes from './routes/packageRoutes.js';
import standartRoutes from './routes/standartRoutes.js';
import contractRoutes from './routes/contractRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import sampleRoutes from './routes/sampleRoutes.js';
import worksheetRoutes from './routes/worksheetRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import quotationRoutes from './routes/quotationRoutes.js';
import preOrderRoutes from './routes/preOrderRoutes.js';
import sampleTestRoutes from './routes/sampleTestRoutes.js';

const PORT = parseInt(process.env.PORT || '3000', 10);

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport: process.env.NODE_ENV !== 'production' ? {
      target: 'pino-pretty',
      options: {
        colorize: true
      }
    } : undefined
  }
});

// Register plugins
await app.register(helmet);
await app.register(cors, {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
});
await app.register(errorHandler);
await app.register(fileUpload);

// Register Swagger documentation
await registerSwagger(app);

// Test database connection
testConnection();

// Health check route
app.get('/api/health', async () => {
  return {
    status: 'OK',
    message: 'Laboratory System API is running',
    timestamp: new Date().toISOString()
  };
});

// Register routes
await app.register(publicRoutes, { prefix: '/api/public' });
await app.register(authRoutes, { prefix: '/api/auth' });
await app.register(userRoutes, { prefix: '/api/users' });
await app.register(customerRoutes, { prefix: '/api/customers' });
await app.register(roleRoutes, { prefix: '/api/roles' });
await app.register(matrixRoutes, { prefix: '/api/matrices' });
await app.register(categoryRoutes, { prefix: '/api/categories' });
await app.register(methodRoutes, { prefix: '/api/methods' });
await app.register(labRoutes, { prefix: '/api/labs' });
await app.register(parameterRoutes, { prefix: '/api/parameters' });
await app.register(unitRoutes, { prefix: '/api/units' });
await app.register(analystTypeRoutes, { prefix: '/api/analyst-types' });
await app.register(serviceRoutes, { prefix: '/api/services' });
await app.register(subcontractorRoutes, { prefix: '/api/subcontractors' });
await app.register(packageRoutes, { prefix: '/api/packages' });
await app.register(standartRoutes, { prefix: '/api/standards' });
await app.register(contractRoutes, { prefix: '/api/contracts' });
await app.register(orderRoutes, { prefix: '/api/orders' });
await app.register(sampleRoutes, { prefix: '/api/samples' });
await app.register(worksheetRoutes, { prefix: '/api/worksheets' });
await app.register(invoiceRoutes, { prefix: '/api/invoices' });
await app.register(quotationRoutes, { prefix: '/api/quotations' });
await app.register(preOrderRoutes, { prefix: '/api/pre-orders' });
await app.register(sampleTestRoutes, { prefix: '/api/sample-tests' });

// Start server
const start = async () => {
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 API URL: http://localhost:${PORT}/api`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();

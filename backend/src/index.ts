/// <reference path="./types/express.d.ts" />
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

import { testConnection } from './config/database';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import publicRoutes from './routes/publicRoutes';
import customerRoutes from './routes/customerRoutes';
import roleRoutes from './routes/roleRoutes';
import matrixRoutes from './routes/matrixRoutes';
import categoryRoutes from './routes/categoryRoutes';
import methodRoutes from './routes/methodRoutes';
import labRoutes from './routes/labRoutes';
import parameterRoutes from './routes/parameterRoutes';
import unitRoutes from './routes/unitRoutes';
import analystTypeRoutes from './routes/analystTypeRoutes';
import serviceRoutes from './routes/serviceRoutes';
import subcontractorRoutes from './routes/subcontractorRoutes';
import packageRoutes from './routes/packageRoutes';
import standartRoutes from './routes/standartRoutes';
import contractRoutes from './routes/contractRoutes';
import orderRoutes from './routes/orderRoutes';
import sampleRoutes from './routes/sampleRoutes';
import worksheetRoutes from './routes/worksheetRoutes';

const app: Express = express();
const PORT: number = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test database connection
testConnection();

// Routes
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'OK',
    message: 'Laboratory System API is running',
    timestamp: new Date().toISOString()
  });
});

// Public routes (no authentication)
app.use('/api/public', publicRoutes);

// Authenticated routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/matrices', matrixRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/methods', methodRoutes);
app.use('/api/labs', labRoutes);
app.use('/api/parameters', parameterRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/analyst-types', analystTypeRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/subcontractors', subcontractorRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/standards', standartRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/samples', sampleRoutes);
app.use('/api/worksheets', worksheetRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 API URL: http://localhost:${PORT}/api`);
});

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import connectDB from './config/db';
import authRoutes from './modules/auth/auth.routes';
import propertyRoutes from './modules/property/property.routes';
import categoryRoutes from './modules/property/category.routes';
import landlordRoutes from './modules/landlord/landlord.routes';
import errorHandler from './middleware/errorHandler';
import AppError from './utils/AppError';

dotenv.config();

const app = express();

connectDB();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'RentNest API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/landlord', landlordRoutes);

// 404 handler
app.all('*', (_req, _res, next) => {
  next(new AppError('Route not found', 404));
});

app.use(errorHandler);

export default app;

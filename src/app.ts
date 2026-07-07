import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import connectDB from './config/db';

dotenv.config();

const app = express();

// Connect to database
connectDB();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'RentNest API is running' });
});

export default app;

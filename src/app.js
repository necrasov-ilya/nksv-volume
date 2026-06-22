import express from 'express';
import path from 'path';
import { config } from './config.js';
import { errorBoundary } from './middleware/errorBoundary.js';
import authRoutes from './routes/authRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import publicRoutes from './routes/publicRoutes.js';

const app = express();

app.use(express.json());
app.use(express.static(config.paths.public));

app.use('/api', authRoutes);
app.use('/api', fileRoutes);
app.use('/', publicRoutes);

app.use(errorBoundary);

export default app;

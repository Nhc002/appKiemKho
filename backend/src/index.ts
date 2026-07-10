import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes/api.js';
import { CronService } from './services/cron.service.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend integration (allow deployed frontend)
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:4173']
  : ['http://localhost:5173', 'http://localhost:4173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o))) {
      return callback(null, true);
    }
    // In production, be more permissive for now
    return callback(null, true);
  },
  credentials: true
}));

// Parse JSON request bodies
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    service: "Fabi Inventory Backend",
    version: "1.0.0",
    mode: process.env.NODE_ENV || 'development'
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    uptime: process.uptime(),
    timestamp: new Date()
  });
});

// Register main API routes
app.use('/api', apiRouter);

// Start background Fabi iPOS auto-sync cron scheduler
CronService.init();

// Start listening - bind to 0.0.0.0 for cloud deployment (Render, Railway, etc.)
const HOST = '0.0.0.0';
app.listen(Number(PORT), HOST, () => {
  console.log(`===========================================================`);
  console.log(`Hệ thống Quản lý Kho iPOS Backend chạy tại: http://${HOST}:${PORT}`);
  console.log(`Chế độ: ${process.env.NODE_ENV || 'development'}`);
  console.log(`===========================================================`);
});

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes/api.js';
import { CronService } from './services/cron.service.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.json({
    success: true,
    service: "Fabi Inventory Backend",
    version: "1.0.0"
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    uptime: process.uptime(),
    timestamp: new Date()
  });
});
// Enable CORS for frontend integration
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Register main API routes
app.use('/api', apiRouter);

// Start background Fabi iPOS auto-sync cron scheduler
CronService.init();

// Start listening
app.listen(PORT, () => {
  console.log(`===========================================================`);
  console.log(`Hệ thống Quản lý Kho iPOS Backend chạy tại: http://localhost:${PORT}`);
  console.log(`===========================================================`);
});

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes/api.js';
import { CronService } from './services/cron.service.js';
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
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

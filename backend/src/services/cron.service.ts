import cron from 'node-cron';
import { FabiService } from './fabi.service.js';
import http from 'http';
import https from 'https';

export class CronService {
  static init() {
    console.log('Khởi chạy dịch vụ đồng bộ tự động Fabi iPOS (Mỗi 5 phút)...');
    
    // Schedule task: runs every 5 minutes (*/5 * * * *)
    cron.schedule('*/5 * * * *', async () => {
      console.log('[Cron Job] Bắt đầu tự động đồng bộ doanh số từ Fabi iPOS...');
      try {
        const result = await FabiService.syncSales();
        console.log(`[Cron Job] Đồng bộ thành công: ${result.total_sales_count} mặt hàng, tạo mới ${result.new_products_created} món, doanh thu Net: ${result.total_revenue_net}đ`);
      } catch (err: any) {
        console.error('[Cron Job] Lỗi đồng bộ tự động:', err.message);
      }
    });

    // Self-ping mỗi 10 phút để tránh Render free tier sleep (cold start)
    // Chỉ ping trong giờ làm việc Việt Nam (6:00 - 23:00 UTC+7 = 23:00-16:00 UTC)
    const selfUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 5000}`;
    cron.schedule('*/10 * * * *', () => {
      const url = new URL('/health', selfUrl);
      const client = url.protocol === 'https:' ? https : http;
      const req = client.get(url.toString(), (res) => {
        console.log(`[Keep-Alive] Ping server: ${res.statusCode}`);
      });
      req.on('error', () => {}); // bỏ qua lỗi network
      req.end();
    });
  }
}

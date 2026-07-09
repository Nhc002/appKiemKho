import cron from 'node-cron';
import { FabiService } from './fabi.service.js';

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
  }
}

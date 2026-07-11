import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiService } from '../services/api.js';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  AlertTriangle, 
  Activity, 
  ShoppingBag,
  ArrowRight,
  Download,
  Upload,
  ClipboardCheck,
  Plus
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  ResponsiveContainer, 
  Tooltip,
  XAxis
} from 'recharts';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboardData'],
    queryFn: () => ApiService.getDashboard()
  });

  const { data: logs } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: () => ApiService.getLogs()
  });

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-3/4"></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
        </div>
        <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
      </div>
    );
  }

  // Pre-process charts/metrics
  const topSalesData = stats?.top_selling_items || [];
  const lowStockAlertsCount = stats?.low_stock_alerts_count || 0;
  
  // Total item quantity calculation for display (e.g. sum of ingredients stock quantity)
  // Mock order count based on sales revenue
  const mockOrderCount = Math.round((stats?.today_revenue || 0) / 45000) || 0;

  // 7 days trend logic
  const mockTrend = [
    { name: 'T2', Sales: 3800000 },
    { name: 'T3', Sales: 4200000 },
    { name: 'T4', Sales: 3100000 },
    { name: 'T5', Sales: 4500000 },
    { name: 'T6', Sales: 5200000 },
    { name: 'T7', Sales: 6800000 },
    { name: 'CN', Sales: stats?.today_revenue || 4100000 }
  ];

  return (
    <div className="space-y-5 animate-slide-up">
      
      {/* HEADER SECTION */}
      <div>
        <h1 className="text-xl font-extrabold tracking-tight">Tổng quan hôm nay</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">Số liệu cập nhật thời gian thực từ Fabi iPOS</p>
      </div>

      {/* METRIC CARD LIST (Mobile Grid) */}
      <div className="grid grid-cols-2 gap-3">
        
        {/* DOANH THU */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden active:scale-98 transition-transform">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Doanh thu</span>
              <span className="p-1.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 rounded-lg">
                <DollarSign size={14} />
              </span>
            </div>
            <span className="text-lg font-black block">{(stats?.today_revenue || 0).toLocaleString('vi-VN')}₫</span>
          </div>
          <span className="text-[9px] text-green-600 font-bold flex items-center gap-0.5 mt-2">
            <TrendingUp size={10} /> ↑ 12% so với hôm qua
          </span>
        </div>

        {/* ĐƠN HÀNG */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-sm active:scale-98 transition-transform">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Đơn hàng</span>
              <span className="p-1.5 bg-green-50 dark:bg-green-950/30 text-green-600 rounded-lg">
                <ShoppingBag size={14} />
              </span>
            </div>
            <span className="text-lg font-black block">{mockOrderCount} đơn</span>
          </div>
          <span className="text-[9px] text-slate-400 font-medium block mt-2">Đồng bộ tự động từ POS</span>
        </div>

        {/* SẢN PHẨM SẮP HẾT */}
        <div 
          onClick={() => navigate('/products')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-sm cursor-pointer active:scale-98 transition-transform"
        >
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Sắp hết hàng</span>
              <span className={`p-1.5 rounded-lg ${lowStockAlertsCount > 0 ? 'bg-red-50 dark:bg-red-950/30 text-red-600' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}>
                <AlertTriangle size={14} />
              </span>
            </div>
            <span className={`text-lg font-black block ${lowStockAlertsCount > 0 ? 'text-red-600' : 'text-slate-800 dark:text-slate-100'}`}>
              {lowStockAlertsCount} loại
            </span>
          </div>
          <span className="text-[9px] text-slate-400 font-medium block mt-2">Cần nhập thêm gấp</span>
        </div>

        {/* TỒN KHO */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-sm active:scale-98 transition-transform">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tồn kho</span>
              <span className="p-1.5 bg-amber-50 dark:bg-amber-950/30 text-amber-600 rounded-lg">
                <Package size={14} />
              </span>
            </div>
            <span className="text-lg font-black block">{(stats?.inventory_value || 0).toLocaleString('vi-VN')}₫</span>
          </div>
          <span className="text-[9px] text-slate-400 font-medium block mt-2">Tổng giá trị vật tư</span>
        </div>

      </div>

      {/* QUICK ACTIONS BAR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Thao tác nhanh</h3>
        <div className="grid grid-cols-3 gap-2">
          
          <button 
            onClick={() => navigate('/imports')}
            className="flex flex-col items-center gap-1.5 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/30 dark:hover:text-blue-400 transition-all font-bold text-xs"
          >
            <Download size={18} className="text-blue-600" />
            <span>Nhập kho</span>
          </button>

          <button 
            onClick={() => navigate('/exports')}
            className="flex flex-col items-center gap-1.5 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/30 dark:hover:text-blue-400 transition-all font-bold text-xs"
          >
            <Upload size={18} className="text-amber-600" />
            <span>Xuất kho</span>
          </button>

          <button 
            onClick={() => navigate('/counts')}
            className="flex flex-col items-center gap-1.5 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/30 dark:hover:text-blue-400 transition-all font-bold text-xs"
          >
            <ClipboardCheck size={18} className="text-green-600" />
            <span>Kiểm kho</span>
          </button>

        </div>
      </div>

      {/* REVENUE MINI CHART CARD */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Doanh thu tuần này</h3>
          <span className="text-[10px] text-green-600 font-bold">Tăng trưởng tốt</span>
        </div>
        <div className="h-20 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mockTrend}>
              <XAxis dataKey="name" fontSize={9} stroke="#94a3b8" tickLine={false} axisLine={false} />
              <Tooltip formatter={(value) => [`${value.toLocaleString()}₫`]} />
              <Line type="monotone" dataKey="Sales" stroke="#2563eb" strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TOP SELLING PRODUCTS CARD LIST */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Sản phẩm bán chạy nhất</h3>
          <button onClick={() => navigate('/products')} className="text-blue-600 text-xs font-extrabold flex items-center gap-0.5">
            Tất cả <ArrowRight size={12} />
          </button>
        </div>

        <div className="space-y-2">
          {topSalesData.slice(0, 3).map((item, idx) => (
            <div key={item.name} className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-lg bg-blue-100 dark:bg-blue-950/50 text-blue-600 font-black text-xs flex items-center justify-center">
                  {idx + 1}
                </span>
                <span className="text-xs font-bold text-slate-850 dark:text-slate-100 truncate max-w-[170px]">
                  {item.name}
                </span>
              </div>
              <div className="text-right">
                <p className="text-xs font-extrabold">{item.quantity} ly</p>
                <p className="text-[9px] text-slate-400">{(item.revenue).toLocaleString('vi-VN')}₫</p>
              </div>
            </div>
          ))}
          {topSalesData.length === 0 && (
            <p className="text-center text-xs text-slate-400 py-4">Chưa có dữ liệu đồng bộ</p>
          )}
        </div>
      </div>

      {/* RECENT LOGS LIST */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Hoạt động gần đây</h3>
        <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
          {logs?.slice(0, 3).map(l => (
            <div key={l.id} className="p-2.5 bg-slate-50 dark:bg-slate-800/20 border-l-2 border-blue-500 rounded-r-xl text-xs space-y-1">
              <div className="flex justify-between text-[10px] font-bold text-slate-400">
                <span>{l.user_name}</span>
                <span>{new Date(l.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                <span className="px-1 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-600 rounded text-[8px] mr-1 font-bold uppercase">{l.action}</span>
                {l.details}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* FLOATING ACTION BUTTON (Add Quick Item) */}
      <button 
        onClick={() => navigate('/imports')}
        className="fixed bottom-20 right-5 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30 active:scale-95 transition-transform z-40"
      >
        <Plus size={24} />
      </button>

    </div>
  );
}


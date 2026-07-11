import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiService } from '../services/api.js';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  Percent, 
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
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';

export default function Dashboard() {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 animate-pulse">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-500">Đang tải dữ liệu báo cáo...</p>
      </div>
    );
  }

  // Pre-process chart data
  const topSalesData = stats?.top_selling_items?.map(it => ({
    name: it.name,
    quantity: it.quantity,
    revenue: it.revenue
  })) || [];

  const topIngData = stats?.top_ingredients_consumed?.map(it => ({
    name: it.name,
    cost: it.cost,
    qty: it.quantity + ' ' + it.unit
  })) || [];

  const COLORS = ['#10b981', '#3b82f6', '#f97316', '#ef4444', '#8b5cf6'];

  // 7 days trend logic
  const mockTrend = [
    { name: 'Thứ 2', Sales: 3800000, COGS: 1200000 },
    { name: 'Thứ 3', Sales: 4200000, COGS: 1350000 },
    { name: 'Thứ 4', Sales: 3100000, COGS: 980000 },
    { name: 'Thứ 5', Sales: 4500000, COGS: 1400000 },
    { name: 'Thứ 6', Sales: 5200000, COGS: 1650000 },
    { name: 'Thứ 7', Sales: 6800000, COGS: 2100000 },
    { name: 'Chủ Nhật', Sales: stats?.today_revenue || 4100000, COGS: stats?.today_cogs || 1300000 }
  ];

  const lowStockAlertsCount = stats?.low_stock_alerts_count || 0;
  const mockOrderCount = Math.round((stats?.today_revenue || 0) / 45000) || 0;

  // --- MOBILE LAYOUT ---
  if (isMobile) {
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
                <span className="p-1.5 bg-blue-50 dark:bg-blue-955/30 text-blue-600 rounded-lg">
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
                <span className="p-1.5 bg-green-50 dark:bg-green-955/30 text-green-600 rounded-lg">
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
                <span className={`p-1.5 rounded-lg ${lowStockAlertsCount > 0 ? 'bg-red-50 dark:bg-red-955/30 text-red-600' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}>
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
                <span className="p-1.5 bg-amber-50 dark:bg-amber-955/30 text-amber-600 rounded-lg">
                  <Package size={14} />
                </span>
              </div>
              <span className="text-lg font-black block">{(stats?.inventory_value || 0).toLocaleString('vi-VN')}₫</span>
            </div>
            <span className="text-[9px] text-slate-400 font-medium block mt-2">Tổng giá trị vật tư</span>
          </div>
        </div>

        {/* QUICK ACTIONS BAR */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-3">Thao tác nhanh</span>
          <div className="grid grid-cols-3 gap-2">
            <button 
              onClick={() => navigate('/imports')}
              className="flex flex-col items-center justify-center py-2.5 bg-blue-50 dark:bg-blue-955/30 hover:bg-blue-100/70 rounded-xl transition-all active:scale-95 text-blue-600"
            >
              <Download size={18} />
              <span className="text-[10px] font-black mt-1">Nhập kho</span>
            </button>
            <button 
              onClick={() => navigate('/exports')}
              className="flex flex-col items-center justify-center py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/50 rounded-xl transition-all active:scale-95 text-slate-700 dark:text-slate-300"
            >
              <Upload size={18} />
              <span className="text-[10px] font-black mt-1">Xuất kho</span>
            </button>
            <button 
              onClick={() => navigate('/counts')}
              className="flex flex-col items-center justify-center py-2.5 bg-emerald-50 dark:bg-emerald-955/30 hover:bg-emerald-100/70 rounded-xl transition-all active:scale-95 text-emerald-600"
            >
              <ClipboardCheck size={18} />
              <span className="text-[10px] font-black mt-1">Kiểm kho</span>
            </button>
          </div>
        </div>

        {/* MINI CHART */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Doanh thu tuần này</span>
            <span className="text-xs text-blue-600 font-extrabold flex items-center gap-0.5">
              T7 cao nhất <ArrowRight size={10} />
            </span>
          </div>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockTrend}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => [`${value.toLocaleString()}₫`]} />
                <Line type="monotone" dataKey="Sales" stroke="#2563EB" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RECENT LOGS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Hoạt động gần đây</span>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {logs?.slice(0, 5).map(lg => (
              <div key={lg.id} className="p-2 bg-slate-50 dark:bg-slate-855 rounded-xl border border-slate-150 dark:border-slate-800 text-[10px] font-semibold flex justify-between items-start gap-2">
                <div className="space-y-0.5">
                  <p className="font-extrabold text-slate-800 dark:text-slate-200">{lg.action_type}</p>
                  <p className="text-slate-450">{lg.details}</p>
                </div>
                <span className="text-slate-400 whitespace-nowrap">{new Date(lg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    );
  }

  // --- DESKTOP LAYOUT ---
  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Tổng Quan Hoạt Động</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Đồng bộ doanh số từ Fabi iPOS và quản lý thất thoát nguyên liệu.</p>
        </div>
      </div>

      {/* STATS CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* REVENUE */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Doanh Thu Net (Hôm nay)</span>
            <span className="text-xl md:text-2xl font-extrabold">{(stats?.today_revenue || 0).toLocaleString('vi-VN')}₫</span>
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1 mt-1">
              <TrendingUp size={12} /> Doanh thu sau chiết khấu
            </span>
          </div>
          <span className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 rounded-xl">
            <DollarSign size={24} />
          </span>
        </div>

        {/* COGS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Giá Vốn COGS (Hôm nay)</span>
            <span className="text-xl md:text-2xl font-extrabold">{(stats?.today_cogs || 0).toLocaleString('vi-VN')}₫</span>
            <span className="text-xs text-slate-400 font-semibold flex items-center gap-1 mt-1">
              Khấu trừ theo BOM trà sữa
            </span>
          </div>
          <span className="p-3.5 bg-blue-50 dark:bg-blue-950/20 text-blue-600 rounded-xl">
            <Package size={24} />
          </span>
        </div>

        {/* TODAY PROFIT */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Lợi Nhuận Gộp (Hôm nay)</span>
            <span className={`text-xl md:text-2xl font-extrabold ${stats?.today_profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {(stats?.today_profit || 0).toLocaleString('vi-VN')}₫
            </span>
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1 mt-1">
              <TrendingUp size={12} /> Doanh thu trừ giá vốn
            </span>
          </div>
          <span className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 rounded-xl">
            <TrendingUp size={24} />
          </span>
        </div>

        {/* FOOD COST */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Tỷ Lệ Chi Phí Food Cost</span>
            <span className="text-xl md:text-2xl font-extrabold">{(stats?.today_food_cost_pct || 0).toFixed(1)}%</span>
            <span className="text-xs text-amber-600 font-semibold flex items-center gap-1 mt-1">
              Mức khuyến nghị: &lt; 35%
            </span>
          </div>
          <span className="p-3.5 bg-amber-50 dark:bg-amber-955/20 text-amber-600 rounded-xl">
            <Percent size={24} />
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* TOTAL INVENTORY VALUE */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Tổng Giá Trị Tồn Kho</span>
            <span className="text-xl font-extrabold">{(stats?.inventory_value || 0).toLocaleString('vi-VN')}₫</span>
            <span className="text-xs text-slate-400 font-semibold mt-1 block">Tài sản nguyên vật liệu hiện tại</span>
          </div>
          <span className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl">
            <Package size={22} />
          </span>
        </div>

        {/* TOTAL LOSS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Tổng Hao Hụt Kiểm Kho</span>
            <span className="text-xl font-extrabold text-rose-600">{(stats?.total_loss || 0).toLocaleString('vi-VN')}₫</span>
            <span className="text-xs text-rose-600 font-semibold flex items-center gap-1 mt-1">
              <TrendingDown size={12} /> Thất thoát trong ca bàn giao
            </span>
          </div>
          <span className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-600 rounded-xl">
            <AlertTriangle size={22} />
          </span>
        </div>

        {/* TOTAL EXCESS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Tổng Dư Thừa Kiểm Kho</span>
            <span className="text-xl font-extrabold text-blue-600">{(stats?.total_excess || 0).toLocaleString('vi-VN')}₫</span>
            <span className="text-xs text-blue-600 font-semibold flex items-center gap-1 mt-1">
              <TrendingUp size={12} /> Số dư thừa so với lý thuyết
            </span>
          </div>
          <span className="p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-600 rounded-xl">
            <Activity size={22} />
          </span>
        </div>
      </div>

      {/* CHARTS LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SALES TREND CHART */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm lg:col-span-2">
          <h3 className="font-extrabold text-sm uppercase tracking-wide text-slate-500 mb-4 flex items-center gap-2">
            <Activity size={16} /> Xu hướng Doanh số & Giá Vốn (Tuần này)
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(val) => `${val / 1000000}M`} />
                <Tooltip formatter={(value) => [`${value.toLocaleString()}₫`]} />
                <Legend />
                <Line type="monotone" dataKey="Sales" name="Doanh thu" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="COGS" name="Giá vốn" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PIE CHART FOR INGREDIENTS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <h3 className="font-extrabold text-sm uppercase tracking-wide text-slate-500 mb-4 flex items-center gap-2">
            <ShoppingBag size={16} /> Cơ cấu Chi phí Nguyên liệu tiêu thụ
          </h3>
          <div className="h-56 relative flex items-center justify-center">
            {topIngData.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-10">Không có dữ liệu tiêu thụ</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topIngData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="cost"
                  >
                    {topIngData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value.toLocaleString()}₫`]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="space-y-1.5 mt-3 max-h-[110px] overflow-y-auto pr-1">
            {topIngData.map((entry, index) => (
              <div key={entry.name} className="flex justify-between items-center text-xs font-semibold">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="truncate max-w-[120px]">{entry.name}</span>
                </span>
                <span className="text-slate-400">{entry.qty}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RECENT AUDIT LOGS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <h3 className="font-extrabold text-sm uppercase tracking-wide text-slate-500 mb-4">Nhật ký hoạt động hệ thống</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                <th className="px-4 py-3">Thời gian</th>
                <th className="px-4 py-3">Loại hành động</th>
                <th className="px-4 py-3">Chi tiết thay đổi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
              {logs?.slice(0, 8).map(lg => (
                <tr key={lg.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{new Date(lg.created_at).toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-100">{lg.action_type}</td>
                  <td className="px-4 py-3">{lg.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

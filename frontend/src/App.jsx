import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from './store/useStore.js';
import { ApiService } from './services/api.js';
import { useQuery } from '@tanstack/react-query';
import { 
  LayoutDashboard, 
  Boxes, 
  FileSpreadsheet, 
  Download, 
  Upload, 
  ClipboardCheck, 
  FileBarChart, 
  Users, 
  Sliders, 
  Sun, 
  Moon, 
  Bell, 
  ShieldAlert, 
  Menu, 
  ChevronDown, 
  Wifi, 
  WifiOff,
  LogOut,
  Search,
  X,
  Home
} from 'lucide-react';

// Pages imports
import Dashboard from './pages/Dashboard.jsx';
import Products from './pages/Products.jsx';
import Recipes from './pages/Recipes.jsx';
import Imports from './pages/Imports.jsx';
import Exports from './pages/Exports.jsx';
import Counts from './pages/Counts.jsx';
import Reports from './pages/Reports.jsx';
import UsersPage from './pages/Users.jsx';
import Settings from './pages/Settings.jsx';
import Login from './pages/Login.jsx';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const { 
    theme, 
    setTheme, 
    currentUser, 
    setCurrentUser, 
    logout,
    storeName, 
    isOffline, 
    setOffline 
  } = useStore();

  // Apply dark mode on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Periodically check if backend comes online or sync states
  const { data: dashData } = useQuery({
    queryKey: ['dashboardData'],
    queryFn: () => ApiService.getDashboard(),
    refetchInterval: 15000 
  });

  // Keep stores online/offline status in sync with ApiService
  useEffect(() => {
    if (ApiService.isOffline() !== isOffline) {
      setOffline(ApiService.isOffline());
    }
  }, [dashData, isOffline]);

  // Navigation Items
  const navigationItems = [
    { name: 'Tổng quan', path: '/', icon: Home, roles: ['admin', 'manager'] },
    { name: 'Sản phẩm iPOS', path: '/products', icon: Boxes, roles: ['admin', 'manager'] },
    { name: 'Định lượng (BOM)', path: '/recipes', icon: FileSpreadsheet, roles: ['admin', 'manager'] },
    { name: 'Nhập kho', path: '/imports', icon: Download, roles: ['admin', 'manager', 'staff'] },
    { name: 'Xuất kho', path: '/exports', icon: Upload, roles: ['admin', 'manager', 'staff'] },
    { name: 'Kiểm kho cuối ca', path: '/counts', icon: ClipboardCheck, roles: ['admin', 'manager', 'staff'] },
    { name: 'Báo cáo tài chính', path: '/reports', icon: FileBarChart, roles: ['admin', 'manager'] },
    { name: 'Nhân viên', path: '/users', icon: Users, roles: ['admin'] },
    { name: 'Cài đặt', path: '/settings', icon: Sliders, roles: ['admin'] }
  ];

  // Route security gate: Redirect if user role has no permission to view active path
  useEffect(() => {
    if (!currentUser) return;
    const activeItem = navigationItems.find(item => item.path === location.pathname);
    if (activeItem && !activeItem.roles.includes(currentUser.role)) {
      if (currentUser.role === 'staff') {
        navigate('/counts');
      } else {
        navigate('/');
      }
    }
  }, [currentUser, location.pathname]);

  const activeAlerts = dashData?.low_stock_alerts || [];

  if (!currentUser) {
    return <Login />;
  }

  // Handle global search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    // Redirect to products/ingredients page with search query
    navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
    setSearchOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      
      {/* HEADER (Sticky 60px) */}
      <header className="sticky top-0 z-40 h-[60px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between shadow-sm">
        
        {/* Left Side: App Brand / Store Title */}
        <div className="flex items-center gap-2">
          {!searchOpen && (
            <Link to="/" className="flex items-center gap-1.5 select-none">
              <span className="p-1.5 bg-blue-600 rounded-xl text-white shadow-md shadow-blue-500/25">
                <Boxes size={18} />
              </span>
              <span className="font-extrabold text-sm tracking-wide text-slate-800 dark:text-slate-100 uppercase hidden xs:inline">iPOS KHO</span>
            </Link>
          )}
          
          {/* Online/Offline Status (dot on mobile) */}
          <div className="flex items-center">
            {isOffline ? (
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse ml-1" title="Ngoại tuyến" />
            ) : (
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 ml-1" title="Trực tuyến" />
            )}
          </div>
        </div>

        {/* Middle/Flexible Area: Collapsible Search Bar */}
        <div className="flex-1 max-w-xs mx-3">
          {searchOpen ? (
            <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full animate-fade-in">
              <input
                autoFocus
                type="text"
                placeholder="Tìm sản phẩm, nguyên liệu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-8 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 text-xs rounded-xl focus:outline-none focus:border-blue-500 font-semibold"
              />
              <button 
                type="button" 
                onClick={() => setSearchOpen(false)}
                className="absolute right-2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            </form>
          ) : (
            <button 
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-xl w-full border border-slate-200/50 dark:border-slate-800/30 font-semibold active:scale-98 transition-transform"
            >
              <Search size={13} />
              <span>Tìm kiếm...</span>
            </button>
          )}
        </div>

        {/* Right Side: Theme, Notifications, Avatar */}
        <div className="flex items-center gap-2">
          
          {/* Theme Toggler */}
          <button 
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all active:scale-95"
          >
            {theme === 'dark' ? <Sun size={17} className="text-yellow-400" /> : <Moon size={17} />}
          </button>

          {/* Notifications Icon & Count */}
          <div className="relative">
            <button 
              onClick={() => setNotifOpen(!notifOpen)}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all relative active:scale-95"
            >
              <Bell size={17} />
              {activeAlerts.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-600 text-white text-[8px] font-extrabold rounded-full flex items-center justify-center border border-white dark:border-slate-900">
                  {activeAlerts.length}
                </span>
              )}
            </button>

            {/* Notifications Dropdown Panel */}
            {notifOpen && (
              <>
                <div className="fixed inset-0 z-45" onClick={() => setNotifOpen(false)} />
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl shadow-xl z-50 p-4 animate-slide-up">
                  <h4 className="font-extrabold text-xs border-b border-slate-100 dark:border-slate-800 pb-2 mb-2 flex justify-between items-center text-slate-400 uppercase tracking-wider">
                    <span>Cảnh báo hết hàng ({activeAlerts.length})</span>
                  </h4>
                  
                  <div className="max-height-[240px] overflow-y-auto space-y-2 pr-1 no-scrollbar">
                    {activeAlerts.length === 0 ? (
                      <p className="text-center text-xs text-slate-400 py-6">Mọi nguyên liệu đều an toàn.</p>
                    ) : (
                      activeAlerts.map(a => (
                        <div key={a.id} className="flex gap-2.5 p-2 bg-rose-50 dark:bg-rose-950/10 rounded-xl border border-rose-100/50 dark:border-rose-950/20 text-xs">
                          <ShieldAlert size={14} className="text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-200">{a.name}</p>
                            <p className="text-slate-400 mt-0.5">Tồn: <span className="font-bold text-rose-600">{a.stock} {a.unit}</span> (Min: {a.min})</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User Avatar & Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-extrabold text-xs shadow-md shadow-blue-500/15 active:scale-95 transition-transform"
            >
              {currentUser.fullname.charAt(0).toUpperCase()}
            </button>

            {roleMenuOpen && (
              <>
                <div className="fixed inset-0 z-45" onClick={() => setRoleMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl shadow-xl z-50 overflow-hidden animate-slide-up">
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                    <p className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">{currentUser.fullname}</p>
                    <p className="text-[9px] text-slate-400 font-extrabold uppercase mt-0.5 tracking-wider">
                      {currentUser.role === 'manager' ? 'Trưởng Ca' : currentUser.role === 'staff' ? 'Nhân Viên' : 'Admin'}
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      logout();
                      setRoleMenuOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2 transition-colors"
                  >
                    <LogOut size={13} />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </>
            )}
          </div>

        </div>
      </header>

      {/* VIEW AREA */}
      <main className="flex-1 overflow-y-auto pb-20 no-scrollbar">
        <div className="max-w-md mx-auto w-full px-4 py-4 space-y-4">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/recipes" element={<Recipes />} />
            <Route path="/imports" element={<Imports />} />
            <Route path="/exports" element={<Exports />} />
            <Route path="/counts" element={<Counts />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </main>

      {/* MOBILE BOTTOM NAVIGATION (Fixed at bottom) */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex justify-around items-center z-45 px-1 shadow-[0_-3px_12px_rgba(0,0,0,0.03)]">
        
        {/* Tab 1: Dashboard */}
        <Link 
          to="/"
          className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-extrabold transition-all ${
            location.pathname === '/' 
              ? 'text-blue-600 dark:text-blue-400 scale-105' 
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
          }`}
        >
          <Home size={18} className={location.pathname === '/' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          <span className="mt-0.5">Tổng quan</span>
        </Link>

        {/* Tab 2: Kiểm kho */}
        <Link 
          to="/counts"
          className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-extrabold transition-all ${
            location.pathname === '/counts' 
              ? 'text-blue-600 dark:text-blue-400 scale-105' 
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
          }`}
        >
          <ClipboardCheck size={18} className={location.pathname === '/counts' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          <span className="mt-0.5">Kiểm kho</span>
        </Link>

        {/* Tab 3: Nhập hàng */}
        <Link 
          to="/imports"
          className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-extrabold transition-all ${
            location.pathname === '/imports' 
              ? 'text-blue-600 dark:text-blue-400 scale-105' 
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
          }`}
        >
          <Download size={18} className={location.pathname === '/imports' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          <span className="mt-0.5">Nhập hàng</span>
        </Link>

        {/* Tab 4: Báo cáo */}
        <Link 
          to="/reports"
          className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-extrabold transition-all ${
            location.pathname === '/reports' 
              ? 'text-blue-600 dark:text-blue-400 scale-105' 
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
          }`}
        >
          <FileBarChart size={18} className={location.pathname === '/reports' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          <span className="mt-0.5">Báo cáo</span>
        </Link>

        {/* Tab 5: Cài đặt */}
        <Link 
          to="/settings"
          className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-extrabold transition-all ${
            location.pathname === '/settings' 
              ? 'text-blue-600 dark:text-blue-400 scale-105' 
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
          }`}
        >
          <Sliders size={18} className={location.pathname === '/settings' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          <span className="mt-0.5">Cài đặt</span>
        </Link>

      </nav>

    </div>
  );
}


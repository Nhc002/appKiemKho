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
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  // Listen to screen resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // Handle global search submit (used in mobile header search)
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
    setSearchOpen(false);
  };

  const getBottomNavItems = () => {
    if (currentUser.role === 'staff') {
      return [
        { name: 'Nhập kho', path: '/imports', icon: Download },
        { name: 'Xuất kho', path: '/exports', icon: Upload },
        { name: 'Kiểm kho', path: '/counts', icon: ClipboardCheck }
      ];
    } else {
      return [
        { name: 'Tổng quan', path: '/', icon: Home },
        { name: 'Sản phẩm', path: '/products', icon: Boxes },
        { name: 'Nhập kho', path: '/imports', icon: Download },
        { name: 'Kiểm kho', path: '/counts', icon: ClipboardCheck }
      ];
    }
  };

  // --- MOBILE LAYOUT ---
  if (isMobile) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-955 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
        
        {/* HEADER (Sticky 60px) */}
        <header className="sticky top-0 z-40 h-[60px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between shadow-sm">
          
          <div className="flex items-center gap-2">
            {!searchOpen && (
              <Link to="/" className="flex items-center gap-1.5 select-none">
                <span className="p-1.5 bg-blue-600 rounded-xl text-white shadow-md shadow-blue-500/25">
                  <Boxes size={18} />
                </span>
                <span className="font-extrabold text-sm tracking-wide text-slate-800 dark:text-slate-100 uppercase hidden xs:inline">iPOS KHO</span>
              </Link>
            )}
            
            <div className="flex items-center">
              {isOffline ? (
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse ml-1" title="Ngoại tuyến" />
              ) : (
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 ml-1" title="Trực tuyến" />
              )}
            </div>
          </div>

          {/* Collapsible Search Bar */}
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
                  className="absolute right-2 text-slate-400 hover:text-slate-655"
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

          {/* Theme, Notifications, Profile */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all active:scale-95"
            >
              {theme === 'dark' ? <Sun size={17} className="text-yellow-400" /> : <Moon size={17} />}
            </button>

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

              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-45" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-855 rounded-2xl shadow-xl z-50 p-4 animate-slide-up">
                    <h4 className="font-extrabold text-xs border-b border-slate-100 dark:border-slate-800 pb-2 mb-2 flex justify-between items-center text-slate-400 uppercase tracking-wider">
                      <span>Cảnh báo hết hàng ({activeAlerts.length})</span>
                    </h4>
                    <div className="max-height-[240px] overflow-y-auto space-y-2 pr-1 no-scrollbar">
                      {activeAlerts.length === 0 ? (
                        <p className="text-center text-xs text-slate-400 py-6">Mọi nguyên liệu đều an toàn.</p>
                      ) : (
                        activeAlerts.map(a => (
                          <div key={a.id} className="flex gap-2.5 p-2 bg-rose-50 dark:bg-rose-955/10 rounded-xl border border-rose-100/50 dark:border-rose-955/20 text-xs">
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
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-855 rounded-2xl shadow-xl z-50 overflow-hidden animate-slide-up">
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

        {/* MOBILE BOTTOM NAVIGATION */}
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex justify-around items-center z-45 px-1 shadow-[0_-3px_12px_rgba(0,0,0,0.03)]">
          {getBottomNavItems().map(item => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link 
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-extrabold transition-all ${
                  isActive 
                    ? 'text-blue-600 dark:text-blue-400 scale-105' 
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
                }`}
              >
                <Icon size={18} className={isActive ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
                <span className="mt-0.5">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    );
  }

  // --- DESKTOP LAYOUT ---
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors duration-200">
      
      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transform transition-transform duration-300 ease-in-out md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-0 -left-64 md:left-0'}`}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-emerald-600 rounded-lg text-white">
              <Boxes size={22} />
            </span>
            <span className="font-extrabold text-lg tracking-wider">iPOS INVENTORY</span>
          </div>
          <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
            &times;
          </button>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto space-y-1">
          {navigationItems.map((item) => {
            const hasAccess = item.roles.includes(currentUser.role);
            if (!hasAccess) return null;

            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${isActive ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/35' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 text-center text-xs text-slate-500">
          <span>Phiên bản 2.0.0 &copy; 2026</span>
        </div>
      </aside>

      {/* OVERLAY FOR MOBILE SIDEBAR */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col md:ml-64 min-h-screen">
        
        {/* HEADER */}
        <header className="sticky top-0 z-30 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between shadow-sm">
          
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <span className="font-bold text-base md:text-lg truncate max-w-[200px] md:max-w-md">{storeName}</span>
            
            {/* ONLINE / OFFLINE BADGE */}
            {isOffline ? (
              <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-955/30 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-900/50 animate-pulse">
                <WifiOff size={12} />
                <span className="hidden sm:inline">Ngoại tuyến (IndexedDB)</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-955/30 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-900/50">
                <Wifi size={12} />
                <span className="hidden sm:inline">Trực tuyến</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            
            {/* Theme Switcher */}
            <button 
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            >
              {theme === 'dark' ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} />}
            </button>

            {/* Low stock notifications */}
            <div className="relative">
              <button 
                onClick={() => setNotifOpen(!notifOpen)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors relative"
              >
                <Bell size={18} />
                {activeAlerts.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-600 rounded-full border-2 border-white dark:border-slate-900" />
                )}
              </button>

              {/* Notification drop list */}
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 p-4 animate-fade-in">
                    <h4 className="font-bold text-sm border-b border-slate-100 dark:border-slate-800 pb-2 mb-2 flex justify-between items-center">
                      <span>Cảnh báo hết nguyên liệu</span>
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 text-xs font-bold rounded-full">{activeAlerts.length}</span>
                    </h4>
                    
                    <div className="max-height-[280px] overflow-y-auto space-y-2 pr-1">
                      {activeAlerts.length === 0 ? (
                        <p className="text-center text-xs text-slate-400 py-4">Tất cả nguyên liệu đều ở mức an toàn.</p>
                      ) : (
                        activeAlerts.map(a => (
                          <div key={a.id} className="flex gap-3 p-2 bg-rose-50 dark:bg-rose-950/10 rounded-lg border border-rose-100 dark:border-rose-950/20 text-xs">
                            <ShieldAlert size={14} className="text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold text-slate-800 dark:text-slate-200">{a.name}</p>
                              <p className="text-slate-400 mt-0.5">Hiện có: <span className="font-bold text-rose-600">{a.stock} {a.unit}</span> (Tối thiểu: {a.min})</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* User Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-full bg-slate-50 dark:bg-slate-900 hover:border-emerald-500 transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                  {currentUser.fullname.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:flex flex-col text-xs pr-1">
                  <span className="font-bold text-slate-800 dark:text-slate-200">{currentUser.fullname}</span>
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">
                    {currentUser.role === 'manager' ? 'Trưởng Ca' : currentUser.role === 'staff' ? 'Nhân Viên' : 'Admin'}
                  </span>
                </div>
                <ChevronDown size={12} className="text-slate-400" />
              </button>

              {roleMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setRoleMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                      <p className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">{currentUser.fullname}</p>
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase mt-0.5 tracking-wider">
                        {currentUser.role === 'manager' ? 'Trưởng Ca' : currentUser.role === 'staff' ? 'Nhân Viên' : 'Admin'}
                      </p>
                    </div>
                    <button 
                      onClick={() => {
                        logout();
                        setRoleMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-rose-50 dark:hover:bg-rose-955/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2 transition-colors"
                    >
                      <LogOut size={14} />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </>
              )}
            </div>

          </div>
        </header>

        {/* VIEW AREA */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto pb-24 md:pb-6">
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
        </main>
      </div>

    </div>
  );
}

import React, { useState } from 'react';
import { useStore } from '../store/useStore.js';
import { Lock, User, Eye, EyeOff, Boxes, AlertCircle } from 'lucide-react';

const DEFAULT_USERS = [
  { id: 'usr-1', username: 'admin', fullname: 'Nguyễn Quản Trị', role: 'admin', password: 'admin123', phone: '0988888888', email: 'admin@beverage.com', active: true },
  { id: 'usr-2', username: 'manager', fullname: 'Trần Cửa Hàng Trưởng', role: 'manager', password: 'manager123', phone: '0977777777', email: 'manager@beverage.com', active: true },
  { id: 'usr-3', username: 'staff', fullname: 'Lê Nhân Viên Kho', role: 'staff', password: 'staff123', phone: '0966666666', email: 'staff@beverage.com', active: true }
];

export default function Login() {
  const { login, storeName } = useStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      // Get latest users list from localStorage or fallback
      const savedUsers = localStorage.getItem('kho_users');
      const users = savedUsers ? JSON.parse(savedUsers) : DEFAULT_USERS;

      const matchedUser = users.find(
        (u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password
      );

      if (matchedUser) {
        if (!matchedUser.active) {
          setError('Tài khoản này đã bị khóa hoặc ngừng kích hoạt.');
          setIsLoading(false);
          return;
        }
        login(matchedUser);
      } else {
        setError('Tên đăng nhập hoặc mật khẩu không chính xác.');
        setIsLoading(false);
      }
    }, 600); // Small delay for nice transition & feel
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.12),rgba(255,255,255,0))] px-4 select-none animate-fade-in">
      
      {/* Background elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="w-full max-w-md">
        
        {/* LOGO */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3.5 bg-emerald-600 rounded-2xl text-white shadow-xl shadow-emerald-500/20 mb-3.5">
            <Boxes size={32} className="animate-pulse" />
          </div>
          <h1 className="font-extrabold text-2xl tracking-wider text-slate-100 uppercase">iPOS INVENTORY</h1>
          <p className="text-slate-400 text-xs mt-1 font-semibold text-center max-w-[280px]">
            {storeName}
          </p>
        </div>

        {/* LOGIN CARD */}
        <div className="bg-slate-950/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden transition-all duration-300">
          
          <h2 className="text-xl font-bold text-slate-100 mb-6">Đăng nhập hệ thống</h2>

          {error && (
            <div className="mb-5 p-3.5 bg-rose-950/20 border border-rose-900/50 rounded-2xl flex items-start gap-2.5 text-xs text-rose-400 font-semibold">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tên đăng nhập</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  required
                  placeholder="nhanvien_kho, admin..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-3 bg-slate-900/60 border border-slate-800 text-slate-100 rounded-2xl text-sm focus:outline-none focus:border-emerald-500 focus:bg-slate-900 transition-all font-semibold"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mật khẩu</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                  <Lock size={16} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-10 pr-10 py-3 bg-slate-900/60 border border-slate-800 text-slate-100 rounded-2xl text-sm focus:outline-none focus:border-emerald-500 focus:bg-slate-900 transition-all font-semibold font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/35 transition-all text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang đăng nhập...</span>
                </>
              ) : (
                <span>Đăng Nhập</span>
              )}
            </button>

          </form>

          {/* Quick accounts help tip */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 text-[10px] text-slate-500 space-y-1.5 leading-relaxed font-semibold">
            <p className="text-slate-400 uppercase tracking-wider text-[9px] mb-1 font-bold">Tài khoản mẫu để thử nghiệm:</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-1.5 bg-slate-900/40 rounded-xl border border-slate-800/50">
                <span className="text-rose-400 block font-bold">Admin</span>
                <span className="block text-[9px] text-slate-400">admin / admin123</span>
              </div>
              <div className="p-1.5 bg-slate-900/40 rounded-xl border border-slate-800/50">
                <span className="text-amber-400 block font-bold">Trưởng ca</span>
                <span className="block text-[9px] text-slate-400">manager / manager123</span>
              </div>
              <div className="p-1.5 bg-slate-900/40 rounded-xl border border-slate-800/50">
                <span className="text-blue-400 block font-bold">Nhân viên</span>
                <span className="block text-[9px] text-slate-400">staff / staff123</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

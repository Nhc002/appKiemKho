import { create } from 'zustand';
import { ApiService } from '../services/api.js';

export const useStore = create((set) => ({
  theme: localStorage.getItem('kho_theme') || 'light',
  currentUser: JSON.parse(localStorage.getItem('kho_current_user')) || null,
  
  // Store Settings
  storeName: 'Đá Xay & Trà Sữa Tươi Cát Tường',
  address: '120 Lý Thường Kiệt, Q.10, TP.HCM',
  phone: '0901234567',
  warningBuffer: 5,
  taxRate: 8,
  
  // Online/Offline status
  isOffline: false,

  setTheme: (theme) => {
    localStorage.setItem('kho_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme });
  },

  setCurrentUser: (user) => {
    if (user) {
      localStorage.setItem('kho_current_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('kho_current_user');
    }
    set({ currentUser: user });
  },

  login: (user) => {
    localStorage.setItem('kho_current_user', JSON.stringify(user));
    set({ currentUser: user });
  },

  logout: () => {
    localStorage.removeItem('kho_current_user');
    set({ currentUser: null });
  },

  setSettings: (settings) => {
    set({
      storeName: settings.store_name || 'Đá Xay & Trà Sữa Tươi Cát Tường',
      address: settings.address || '',
      phone: settings.phone || '',
      warningBuffer: Number(settings.warning_level) || 5,
      taxRate: Number(settings.tax_rate) || 8
    });
  },

  setOffline: (offline) => {
    ApiService.setOffline(offline);
    set({ isOffline: offline });
  }
}));

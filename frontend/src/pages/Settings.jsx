import React, { useState } from 'react';
import { useStore } from '../store/useStore.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiService } from '../services/api.js';
import { db } from '../db.js';
import { 
  Save, 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  Trash2,
  Settings as SettingsIcon,
  Store,
  Info 
} from 'lucide-react';

export default function Settings() {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);

  const { 
    storeName, 
    address, 
    phone, 
    warningBuffer, 
    taxRate, 
    setSettings 
  } = useStore();

  const [formData, setFormData] = useState({
    store_name: storeName,
    address: address,
    phone: phone,
    warning_level: warningBuffer,
    tax_rate: taxRate
  });

  const { data: logs = [], refetch: refetchLogs } = useQuery({
    queryKey: ['settingsLogs'],
    queryFn: () => ApiService.getLogs()
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    setSettings(formData);
    alert('Đã cập nhật cấu hình hệ thống thành công!');
  };

  // Fabi manual sync mutation
  const syncMutation = useMutation({
    mutationFn: () => ApiService.syncFabi(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      refetchLogs();
      alert(`Đồng bộ thành công! Kết xuất: ${data.total_sales_count} đơn hàng, tạo mới ${data.new_products_created} món chưa có định lượng.`);
    },
    onError: (err) => {
      alert('Đồng bộ thất bại: ' + err.message);
    },
    onSettled: () => {
      setSyncing(false);
    }
  });

  const handleManualSync = () => {
    setSyncing(true);
    syncMutation.mutate();
  };

  // Backup Database: Export Dexie tables as JSON
  const handleBackupDB = async () => {
    try {
      const backupData = {};
      const tables = ['suppliers', 'ingredients', 'products', 'recipes', 'recipe_items', 'imports', 'import_items', 'exports', 'export_items', 'counts', 'count_items', 'sales', 'sale_items', 'logs'];
      
      for (const t of tables) {
        backupData[t] = await db.table(t).toArray();
      }

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fabi_inventory_backup_${new Date().toISOString().substring(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert('Sao lưu dữ liệu IndexedDB thành công!');
    } catch (err) {
      alert('Lỗi sao lưu: ' + err.message);
    }
  };

  // Restore Database: Import JSON into Dexie
  const handleRestoreDB = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (confirm('Cảnh báo! Quá trình khôi phục sẽ ghi đè và xóa hoàn toàn toàn bộ dữ liệu kiểm kho, định lượng và doanh thu hiện tại. Tiếp tục?')) {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const parsed = JSON.parse(evt.target.result);
          const tables = ['suppliers', 'ingredients', 'products', 'recipes', 'recipe_items', 'imports', 'import_items', 'exports', 'export_items', 'counts', 'count_items', 'sales', 'sale_items', 'logs'];
          
          // Basic validation
          const keys = Object.keys(parsed);
          const isValid = tables.some(t => keys.includes(t));
          if (!isValid) throw new Error('Định dạng tệp phục hồi không chính xác.');

          // Wipe database and add table data
          for (const t of tables) {
            await db.table(t).clear();
            if (parsed[t] && parsed[t].length > 0) {
              await db.table(t).bulkAdd(parsed[t]);
            }
          }

          alert('Khôi phục cơ sở dữ liệu IndexedDB thành công! Ứng dụng sẽ tự động tải lại.');
          window.location.reload();
        } catch (err) {
          alert('Lỗi phục hồi dữ liệu: ' + err.message);
        }
      };
      reader.readAsText(file);
    }
    e.target.value = ''; // reset file input
  };

  const handleResetSampleData = async () => {
    if (confirm('Xác nhận đặt lại toàn bộ hệ thống về trạng thái ban đầu của quán nước? Tất cả đơn hàng đồng bộ và phiếu xuất nhập tự tạo sẽ bị xóa sạch.')) {
      await db.delete();
      alert('Đang xóa và tạo lại dữ liệu mẫu của quán...');
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Cài Đặt Hệ Thống</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Quản lý thiết lập cửa hàng, đồng bộ iPOS và quản trị dữ liệu.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT: STORE INFO FORM */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 lg:col-span-2">
          <h3 className="font-extrabold text-sm uppercase tracking-wide text-slate-400 flex items-center gap-2">
            <Store size={16} /> Thiết lập thông tin cửa hàng
          </h3>
          
          <form onSubmit={handleSaveSettings} className="space-y-4">
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500">Tên cửa hàng / Thương hiệu *</label>
              <input 
                type="text" 
                name="store_name"
                value={formData.store_name}
                onChange={handleInputChange}
                className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-semibold"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">Số điện thoại liên hệ</label>
                <input 
                  type="text" 
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">Địa chỉ quán nước</label>
                <input 
                  type="text" 
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">Thuế VAT (%) *</label>
                <input 
                  type="number" 
                  name="tax_rate"
                  value={formData.tax_rate}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-semibold"
                  min="0"
                  max="100"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">Mức Cảnh Báo Kho (độ chênh tối thiểu) *</label>
                <input 
                  type="number" 
                  name="warning_level"
                  value={formData.warning_level}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-semibold"
                  min="0"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/25 transition-all text-xs flex items-center gap-1.5"
            >
              <Save size={14} /> Lưu cài đặt cửa hàng
            </button>

          </form>
        </div>

        {/* RIGHT: DATA MANAGEMENT */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm uppercase tracking-wide text-slate-400 flex items-center gap-2">
            <Database size={16} /> Quản trị cơ sở dữ liệu
          </h3>
          
          <div className="space-y-3">
            
            {/* Sync trigger */}
            <button 
              onClick={handleManualSync}
              disabled={syncing}
              className="w-full flex items-center justify-between p-3 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-emerald-500 bg-slate-50 dark:bg-slate-900 hover:bg-white dark:hover:bg-slate-900 transition-colors text-left"
            >
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                  Đồng bộ thủ công
                </p>
                <p className="text-[10px] text-slate-400">Đồng bộ doanh số Fabi iPOS tức thì</p>
              </div>
              <RefreshCw size={16} className={`text-slate-400 ${syncing ? 'animate-spin' : ''}`} />
            </button>

            {/* Backup */}
            <button 
              onClick={handleBackupDB}
              className="w-full flex items-center justify-between p-3 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-emerald-500 bg-slate-50 dark:bg-slate-900 hover:bg-white dark:hover:bg-slate-900 transition-colors text-left"
            >
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Tải bản sao lưu</p>
                <p className="text-[10px] text-slate-400">Xuất toàn bộ IndexedDB thành file .json</p>
              </div>
              <Download size={16} className="text-slate-400" />
            </button>

            {/* Restore */}
            <div className="relative">
              <input 
                type="file" 
                id="restore-db-input"
                accept=".json"
                onChange={handleRestoreDB}
                className="hidden"
              />
              <button 
                onClick={() => document.getElementById('restore-db-input').click()}
                className="w-full flex items-center justify-between p-3 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-emerald-500 bg-slate-50 dark:bg-slate-900 hover:bg-white dark:hover:bg-slate-900 transition-colors text-left"
              >
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Khôi phục từ tệp</p>
                  <p className="text-[10px] text-slate-400">Tải file .json để ghi đè cơ sở dữ liệu</p>
                </div>
                <Upload size={16} className="text-slate-400" />
              </button>
            </div>

            {/* Wipe */}
            <button 
              onClick={handleResetSampleData}
              className="w-full flex items-center justify-between p-3 border border-rose-200 dark:border-rose-950/20 rounded-xl hover:bg-rose-50/20 dark:hover:bg-rose-950/10 transition-colors text-left group"
            >
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-rose-600">Đặt lại dữ liệu mẫu gốc</p>
                <p className="text-[10px] text-rose-400">Xóa dữ liệu cũ, nạp lại kho mẫu</p>
              </div>
              <Trash2 size={16} className="text-rose-400 group-hover:text-rose-600" />
            </button>

          </div>
        </div>

      </div>

      {/* SYSTEM AUDIT LOG PANEL */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="font-extrabold text-sm uppercase tracking-wide text-slate-400 flex items-center gap-2">
          <Info size={16} /> Toàn bộ nhật ký hoạt động hệ thống
        </h3>
        
        <div className="overflow-x-auto max-h-[350px] overflow-y-auto pr-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                <th className="px-5 py-3">Thời gian</th>
                <th className="px-5 py-3">Nhân viên</th>
                <th className="px-5 py-3">Hành động</th>
                <th className="px-5 py-3">Chi tiết hoạt động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
              {logs.map(l => (
                <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="px-5 py-3 font-mono text-slate-400">{new Date(l.timestamp).toLocaleString('vi-VN')}</td>
                  <td className="px-5 py-3 font-bold">{l.user_name}</td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded font-bold uppercase text-[9px]">
                      {l.action}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-200">{l.details}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">Không có lịch sử hoạt động.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

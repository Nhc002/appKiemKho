import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiService } from '../services/api.js';
import { 
  Plus, 
  Trash2, 
  Download, 
  History, 
  Eye, 
  Calendar, 
  User, 
  FileText,
  X,
  PlusCircle
} from 'lucide-react';

export default function Imports() {
  const queryClient = useQueryClient();
  const [cart, setCart] = useState([]);
  const [supplierId, setSupplierId] = useState('');
  const [note, setNote] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedImport, setSelectedImport] = useState(null);

  // Fetch lists
  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => ApiService.getIngredients()
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => ApiService.getSuppliers()
  });

  const { data: importsList = [] } = useQuery({
    queryKey: ['imports'],
    queryFn: () => ApiService.getImports()
  });

  // Mutation to submit import
  const importMutation = useMutation({
    mutationFn: (data) => ApiService.createImport(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['imports'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
      
      setCart([]);
      setNote('');
      setSupplierId('');
      alert('Nhập kho thành công! Đã tăng số lượng nguyên liệu tương ứng.');
    },
    onError: (err) => {
      alert('Lỗi nhập kho: ' + err.message);
    }
  });

  // Add initial empty row if cart is empty
  React.useEffect(() => {
    if (cart.length === 0 && ingredients.length > 0) {
      handleAddRow();
    }
  }, [ingredients]);

  const handleAddRow = () => {
    if (ingredients.length === 0) return;
    const defaultIng = ingredients[0];
    setCart([
      ...cart,
      {
        rowId: 'row-' + Date.now() + Math.random().toString(36).substring(2, 4),
        ingredient_id: defaultIng.id,
        quantity: 1,
        unit: defaultIng.unit,
        unit_cost: defaultIng.cost_price,
        total_cost: defaultIng.cost_price
      }
    ]);
  };

  const handleRemoveRow = (rowId) => {
    if (cart.length <= 1) {
      alert('Phiếu nhập phải có ít nhất 1 dòng nguyên vật liệu!');
      return;
    }
    setCart(cart.filter(r => r.rowId !== rowId));
  };

  const handleItemChange = (rowId, field, value) => {
    setCart(cart.map(r => {
      if (r.rowId !== rowId) return r;
      
      const updated = { ...r, [field]: value };
      
      if (field === 'ingredient_id') {
        const ing = ingredients.find(i => i.id === Number(value));
        if (ing) {
          updated.unit = ing.unit;
          updated.unit_cost = ing.cost_price;
        }
      }

      // Re-calculate row total
      const q = field === 'quantity' ? Number(value) : updated.quantity;
      const c = field === 'unit_cost' ? Number(value) : updated.unit_cost;
      updated.total_cost = q * c;

      return updated;
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!supplierId) {
      alert('Vui lòng chọn nhà cung cấp!');
      return;
    }

    const hasInvalid = cart.some(r => !r.ingredient_id || r.quantity <= 0 || r.unit_cost < 0);
    if (hasInvalid) {
      alert('Vui lòng kiểm tra lại số lượng hoặc giá trị nhập kho của nguyên liệu!');
      return;
    }

    const totalCost = cart.reduce((sum, r) => sum + r.total_cost, 0);

    importMutation.mutate({
      supplier_id: Number(supplierId),
      total_cost: totalCost,
      note: note,
      user_id: 'usr-1', // Mock user id
      items: cart.map(r => ({
        ingredient_id: Number(r.ingredient_id),
        quantity: Number(r.quantity),
        unit_cost: Number(r.unit_cost),
        total_cost: r.total_cost
      }))
    });
  };

  const totalItems = cart.reduce((sum, r) => sum + Number(r.quantity), 0);
  const totalCost = cart.reduce((sum, r) => sum + r.total_cost, 0);

  return (
    <div className="space-y-4 animate-slide-up pb-32">
      
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Nhập kho vật tư</h1>
          <p className="text-xs text-slate-500">Tăng số lượng tồn kho nguyên liệu</p>
        </div>
        <button 
          onClick={() => setHistoryOpen(true)}
          className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs font-bold flex items-center gap-1 active:scale-95 transition-transform"
        >
          <History size={14} />
          <span>Lịch sử</span>
        </button>
      </div>

      {/* METADATA FORM CARD */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nhà cung cấp *</label>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-500 h-[46px]"
          >
            <option value="">-- Chọn nhà cung cấp --</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ghi chú phiếu nhập</label>
          <input 
            type="text"
            placeholder="Ví dụ: Nhập kho bổ sung đầu tuần..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-500 h-[46px]"
          />
        </div>
      </div>

      {/* CART ITEMS CARD LIST */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chi tiết nguyên vật liệu</span>
          <button 
            onClick={handleAddRow}
            className="text-xs font-bold text-blue-600 flex items-center gap-0.5 active:scale-95 transition-all"
          >
            <PlusCircle size={14} /> Thêm dòng
          </button>
        </div>

        {cart.map((row, idx) => (
          <div key={row.rowId} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3 relative">
            <div className="flex justify-between items-center">
              <span className="w-5 h-5 rounded-lg bg-blue-100 dark:bg-blue-950/50 text-blue-600 font-black text-xs flex items-center justify-center">
                {idx + 1}
              </span>
              <button 
                onClick={() => handleRemoveRow(row.rowId)}
                className="p-1 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Nguyên liệu</label>
              <select 
                value={row.ingredient_id}
                onChange={(e) => handleItemChange(row.rowId, 'ingredient_id', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-755 rounded-xl text-xs font-bold h-[44px]"
              >
                {ingredients.map(ing => (
                  <option key={ing.id} value={ing.id}>{ing.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Số lượng ({row.unit})</label>
                <input 
                  type="number" 
                  min="1"
                  value={row.quantity}
                  onChange={(e) => handleItemChange(row.rowId, 'quantity', e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-755 rounded-xl text-xs font-black text-center h-[44px]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Giá nhập (₫)</label>
                <input 
                  type="number" 
                  min="0"
                  value={row.unit_cost}
                  onChange={(e) => handleItemChange(row.rowId, 'unit_cost', e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-755 rounded-xl text-xs font-black text-right h-[44px]"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold">Thành tiền dòng:</span>
              <span className="text-xs font-black text-slate-850 dark:text-slate-100">{row.total_cost.toLocaleString('vi-VN')}₫</span>
            </div>
          </div>
        ))}
      </div>

      {/* STICKY BOTTOM ACTIONS */}
      <div className="fixed bottom-16 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 shadow-xl z-30 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-slate-500">Tổng chi nhập kho:</span>
          <span className="text-lg font-black text-emerald-600">{totalCost.toLocaleString('vi-VN')}₫</span>
        </div>
        <button
          onClick={handleSubmit}
          disabled={importMutation.isPending}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/15 h-[44px] active:scale-98 transition-transform"
        >
          <Download size={14} />
          <span>Xác nhận nhập kho</span>
        </button>
      </div>

      {/* MODAL: HISTORY */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl border-t sm:border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-lg overflow-hidden animate-slide-up max-h-[85vh] flex flex-col">
            
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto my-3 sm:hidden" onClick={() => setHistoryOpen(false)} />

            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
                <History size={16} /> Lịch sử phiếu nhập
              </h3>
              <button 
                onClick={() => { setHistoryOpen(false); setSelectedImport(null); }}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold hidden sm:block"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              
              {!selectedImport ? (
                <div className="space-y-2">
                  {importsList.map(imp => (
                    <div 
                      key={imp.id}
                      onClick={() => setSelectedImport(imp)}
                      className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/60 rounded-xl flex justify-between items-center cursor-pointer active:scale-98 transition-all"
                    >
                      <div className="space-y-1">
                        <p className="text-xs font-black">Phiếu nhập #{imp.id}</p>
                        <p className="text-[10px] text-slate-400">{new Date(imp.created_at || '').toLocaleString('vi-VN')}</p>
                        <p className="text-[10px] text-slate-450 font-bold">NCC: {suppliers.find(s => s.id === imp.supplier_id)?.name || 'Khác'}</p>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <span className="text-xs font-black text-emerald-600">
                          +{imp.total_cost.toLocaleString('vi-VN')}₫
                        </span>
                        <Eye size={12} className="text-slate-400" />
                      </div>
                    </div>
                  ))}
                  {importsList.length === 0 && (
                    <p className="text-center text-slate-400 py-6 text-xs">Chưa có lịch sử nhập kho.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <button 
                    onClick={() => setSelectedImport(null)}
                    className="text-xs font-bold text-blue-600 flex items-center gap-1 mb-2"
                  >
                    &larr; Quay lại danh sách
                  </button>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-850/50 space-y-1">
                    <p className="text-xs font-black text-blue-600 uppercase">Chi tiết phiếu #{selectedImport.id}</p>
                    <p className="text-[10px] text-slate-400">Thời gian: {new Date(selectedImport.created_at || '').toLocaleString('vi-VN')}</p>
                    <p className="text-[10px] text-slate-400">Nhà cung cấp: {suppliers.find(s => s.id === selectedImport.supplier_id)?.name || 'Khác'}</p>
                    <p className="text-[10px] text-slate-400">Ghi chú: {selectedImport.note || 'Không có.'}</p>
                  </div>

                  <div className="space-y-2">
                    {selectedImport.items?.map(it => {
                      const ingName = ingredients.find(i => i.id === it.ingredient_id)?.name || `Nguyên liệu #${it.ingredient_id}`;
                      const ingUnit = ingredients.find(i => i.id === it.ingredient_id)?.unit || 'đơn vị';
                      return (
                        <div key={it.ingredient_id} className="p-2.5 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-xl flex justify-between items-center text-xs">
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-100">{ingName}</p>
                            <p className="text-[10px] text-slate-400">Giá: {it.unit_cost.toLocaleString('vi-VN')}₫ / SL: {it.quantity} {ingUnit}</p>
                          </div>
                          <span className="font-black text-emerald-600">
                            +{it.total_cost.toLocaleString('vi-VN')}₫
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-955 border-t border-slate-200 dark:border-slate-800 flex gap-3">
              <button 
                onClick={() => { setHistoryOpen(false); setSelectedImport(null); }}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 text-white text-xs font-bold rounded-xl"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

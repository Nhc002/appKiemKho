import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiService } from '../services/api.js';
import { 
  Plus, 
  Trash2, 
  Upload, 
  History, 
  Eye, 
  Calendar, 
  User, 
  FileText,
  X,
  PlusCircle
} from 'lucide-react';

export default function Exports() {
  const queryClient = useQueryClient();
  const [cart, setCart] = useState([]);
  const [note, setNote] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedExport, setSelectedExport] = useState(null);

  // Fetch lists
  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => ApiService.getIngredients()
  });

  const { data: exportsList = [] } = useQuery({
    queryKey: ['exports'],
    queryFn: () => ApiService.getExports()
  });

  // Mutation to submit export
  const exportMutation = useMutation({
    mutationFn: (data) => ApiService.createExport(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['exports'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
      
      setCart([]);
      setNote('');
      alert('Xuất kho thành công! Đã khấu trừ lượng hàng tồn tương ứng.');
    },
    onError: (err) => {
      alert('Lỗi xuất kho: ' + err.message);
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
        reason: 'Waste', // default: Hao hụt/Pha chế
        unit_cost: defaultIng.cost_price,
        total_cost: defaultIng.cost_price,
        stockError: false
      }
    ]);
  };

  const handleRemoveRow = (rowId) => {
    if (cart.length <= 1) {
      alert('Phiếu xuất phải có ít nhất 1 dòng nguyên vật liệu!');
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

      // Stock check
      const targetIngId = field === 'ingredient_id' ? Number(value) : updated.ingredient_id;
      const ingObj = ingredients.find(i => i.id === targetIngId);
      if (ingObj && q > ingObj.current_stock) {
        updated.stockError = true;
      } else {
        updated.stockError = false;
      }

      return updated;
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    let hasStockError = false;
    let errorMessage = '';

    for (const r of cart) {
      if (!r.ingredient_id || r.quantity <= 0) {
        errorMessage = 'Vui lòng kiểm tra lại thông tin nguyên liệu xuất kho!';
        hasStockError = true;
        break;
      }

      const ing = ingredients.find(i => i.id === Number(r.ingredient_id));
      if (ing && r.quantity > ing.current_stock) {
        errorMessage = `Nguyên liệu "${ing.name}" trong kho chỉ còn {ing.current_stock} {ing.unit}. Không đủ để xuất {r.quantity}!`;
        hasStockError = true;
        break;
      }
    }

    if (hasStockError) {
      alert(errorMessage);
      return;
    }

    const totalValue = cart.reduce((sum, r) => sum + r.total_cost, 0);

    exportMutation.mutate({
      note: note,
      user_id: 'usr-1', // Mock user id
      total_value: totalValue,
      items: cart.map(r => ({
        ingredient_id: Number(r.ingredient_id),
        quantity: Number(r.quantity),
        reason: r.reason,
        unit_cost: Number(r.unit_cost),
        total_cost: r.total_cost
      }))
    });
  };

  const totalItems = cart.reduce((sum, r) => sum + Number(r.quantity), 0);
  const totalValue = cart.reduce((sum, r) => sum + r.total_cost, 0);

  const translateReason = (r) => {
    const map = {
      'Sale': 'Bán hàng',
      'Waste': 'Hao hụt / Pha chế',
      'Internal Use': 'Tiêu dùng nội bộ',
      'Damaged': 'Hủy hỏng / Hết hạn',
      'Other': 'Lý do khác'
    };
    return map[r] || r;
  };

  return (
    <div className="space-y-4 animate-slide-up pb-32">
      
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Xuất kho vật tư</h1>
          <p className="text-xs text-slate-500">Khấu trừ số lượng tồn kho nguyên liệu</p>
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
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ghi chú phiếu xuất</label>
          <input 
            type="text"
            placeholder="Ví dụ: Xuất hủy hàng hỏng hết hạn..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-500 h-[46px]"
          />
        </div>
      </div>

      {/* CART ITEMS CARD LIST */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chi tiết nguyên vật liệu xuất</span>
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
              <span className="w-5 h-5 rounded-lg bg-blue-100 dark:bg-blue-955/50 text-blue-600 font-black text-xs flex items-center justify-center">
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
                  <option key={ing.id} value={ing.id}>{ing.name} (Tồn: {ing.current_stock})</option>
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
                  className={`w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-black text-center h-[44px] ${row.stockError ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : 'border-slate-200 dark:border-slate-755'}`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Lý do</label>
                <select 
                  value={row.reason}
                  onChange={(e) => handleItemChange(row.rowId, 'reason', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-755 rounded-xl text-xs font-bold h-[44px]"
                >
                  <option value="Waste">Hao hụt / Pha chế</option>
                  <option value="Internal Use">Tiêu dùng nội bộ</option>
                  <option value="Damaged">Hủy hàng / Hỏng hóc</option>
                  <option value="Other">Lý do khác</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold">Trị giá vốn dòng:</span>
              <span className="text-xs font-black text-slate-850 dark:text-slate-100">{row.total_cost.toLocaleString('vi-VN')}₫</span>
            </div>
          </div>
        ))}
      </div>

      {/* STICKY BOTTOM ACTIONS */}
      <div className="fixed bottom-16 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 shadow-xl z-30 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-slate-500">Tổng trị giá vốn:</span>
          <span className="text-lg font-black text-blue-650">{totalValue.toLocaleString('vi-VN')}₫</span>
        </div>
        <button
          onClick={handleSubmit}
          disabled={exportMutation.isPending}
          className="w-full py-3 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md h-[44px] active:scale-98 transition-transform"
        >
          <Upload size={14} />
          <span>Xác nhận xuất kho</span>
        </button>
      </div>

      {/* MODAL: HISTORY */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl border-t sm:border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-lg overflow-hidden animate-slide-up max-h-[85vh] flex flex-col">
            
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto my-3 sm:hidden" onClick={() => setHistoryOpen(false)} />

            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
                <History size={16} /> Lịch sử phiếu xuất
              </h3>
              <button 
                onClick={() => { setHistoryOpen(false); setSelectedExport(null); }}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold hidden sm:block"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              
              {!selectedExport ? (
                <div className="space-y-2">
                  {exportsList.map(exp => (
                    <div 
                      key={exp.id}
                      onClick={() => setSelectedExport(exp)}
                      className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/60 rounded-xl flex justify-between items-center cursor-pointer active:scale-98 transition-all"
                    >
                      <div className="space-y-1">
                        <p className="text-xs font-black">Phiếu xuất #{exp.id}</p>
                        <p className="text-[10px] text-slate-400">{new Date(exp.created_at || '').toLocaleString('vi-VN')}</p>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <span className="text-xs font-black text-blue-600">
                          {exp.total_value.toLocaleString('vi-VN')}₫
                        </span>
                        <Eye size={12} className="text-slate-400" />
                      </div>
                    </div>
                  ))}
                  {exportsList.length === 0 && (
                    <p className="text-center text-slate-400 py-6 text-xs">Chưa có lịch sử xuất kho.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <button 
                    onClick={() => setSelectedExport(null)}
                    className="text-xs font-bold text-blue-600 flex items-center gap-1 mb-2"
                  >
                    &larr; Quay lại danh sách
                  </button>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-850/50 space-y-1">
                    <p className="text-xs font-black text-blue-600 uppercase">Chi tiết phiếu #{selectedExport.id}</p>
                    <p className="text-[10px] text-slate-400">Thời gian: {new Date(selectedExport.created_at || '').toLocaleString('vi-VN')}</p>
                    <p className="text-[10px] text-slate-400">Ghi chú: {selectedExport.note || 'Không có.'}</p>
                  </div>

                  <div className="space-y-2">
                    {selectedExport.items?.map(it => {
                      const ingName = ingredients.find(i => i.id === it.ingredient_id)?.name || `Nguyên liệu #${it.ingredient_id}`;
                      const ingUnit = ingredients.find(i => i.id === it.ingredient_id)?.unit || 'đơn vị';
                      return (
                        <div key={it.ingredient_id} className="p-2.5 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-xl flex justify-between items-center text-xs">
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-100">{ingName}</p>
                            <p className="text-[10px] text-slate-400">Giá vốn: {it.unit_cost.toLocaleString('vi-VN')}₫ | SL: {it.quantity} {ingUnit}</p>
                            <p className="text-[9px] text-slate-450">Lý do: {translateReason(it.reason)}</p>
                          </div>
                          <span className="font-black text-blue-600">
                            {it.total_cost.toLocaleString('vi-VN')}₫
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
                onClick={() => { setHistoryOpen(false); setSelectedExport(null); }}
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

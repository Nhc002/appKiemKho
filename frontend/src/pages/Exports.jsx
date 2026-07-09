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
  FileText 
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

      // Stock check: quantity cannot exceed current stock
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
        errorMessage = `Nguyên liệu "${ing.name}" trong kho chỉ còn ${ing.current_stock} ${ing.unit}. Không đủ để xuất ${r.quantity}!`;
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
    <div className="space-y-6 animate-fade-in">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Xuất Kho Vật Tư</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Xuất nguyên vật liệu pha chế ngoài doanh số iPOS (Hủy hỏng, tiêu hao, dùng thử...).</p>
        </div>
        <button 
          onClick={() => setHistoryOpen(true)}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition-colors bg-white dark:bg-slate-900"
        >
          <History size={16} /> Lịch sử xuất
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT: CART BUILDER */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm uppercase tracking-wide text-slate-400">Chi tiết sản phẩm xuất</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="px-4 py-3">Nguyên liệu</th>
                  <th className="px-4 py-3 text-center w-24">Số lượng</th>
                  <th className="px-4 py-3 w-20">Đơn vị</th>
                  <th className="px-4 py-3 w-40">Lý do</th>
                  <th className="px-4 py-3 text-right w-28">Đơn giá vốn</th>
                  <th className="px-4 py-3 text-right w-32">Thành tiền</th>
                  <th className="px-4 py-3 text-center w-16">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold">
                {cart.map(row => {
                  const activeIng = ingredients.find(i => i.id === Number(row.ingredient_id));
                  return (
                    <tr key={row.rowId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-2">
                        <select 
                          value={row.ingredient_id}
                          onChange={(e) => handleItemChange(row.rowId, 'ingredient_id', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs focus:outline-none focus:border-emerald-500 font-semibold"
                        >
                          {ingredients.map(ing => (
                            <option key={ing.id} value={ing.id}>{ing.name} (Tồn: {ing.current_stock})</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <input 
                          type="number" 
                          min="1"
                          value={row.quantity}
                          onChange={(e) => handleItemChange(row.rowId, 'quantity', e.target.value)}
                          className={`w-full px-2 py-1.5 border rounded-lg text-xs focus:outline-none focus:emerald-500 text-center font-bold ${row.stockError ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/20' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'}`}
                        />
                      </td>
                      <td className="px-4 py-2 text-slate-400 font-bold">{row.unit}</td>
                      <td className="px-4 py-2">
                        <select 
                          value={row.reason}
                          onChange={(e) => handleItemChange(row.rowId, 'reason', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs focus:outline-none focus:border-emerald-500 font-semibold"
                        >
                          <option value="Waste">Hao hụt / Pha chế</option>
                          <option value="Internal Use">Tiêu dùng nội bộ</option>
                          <option value="Damaged">Hủy hàng / Hỏng hóc</option>
                          <option value="Other">Lý do khác</option>
                        </select>
                      </td>
                      <td className="px-4 py-2 text-right text-slate-400">
                        {(row.unit_cost || 0).toLocaleString('vi-VN')}₫
                      </td>
                      <td className="px-4 py-2 text-right text-slate-800 dark:text-slate-100 font-bold">
                        {row.total_cost.toLocaleString('vi-VN')}₫
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button 
                          onClick={() => handleRemoveRow(row.rowId)}
                          className="p-1.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button 
            onClick={handleAddRow}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all bg-white dark:bg-slate-900"
          >
            <Plus size={14} /> Thêm dòng xuất
          </button>
        </div>

        {/* RIGHT: METADATA & SUBMIT */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 h-fit sticky top-20">
          <h3 className="font-extrabold text-sm uppercase tracking-wide text-slate-400">Thông tin phiếu</h3>
          
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500">Ghi chú phiếu xuất</label>
            <textarea
              rows={4}
              placeholder="Nhập ghi chú xuất kho (Ví dụ: Xuất hủy gói bột béo hết hạn sử dụng...)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs focus:outline-none focus:border-emerald-500 transition-all"
            />
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2 text-xs font-semibold">
            <div className="flex justify-between">
              <span className="text-slate-400">Tổng số lượng xuất:</span>
              <span className="font-extrabold text-slate-800 dark:text-slate-100">{totalItems} đơn vị</span>
            </div>
            
            <div className="flex justify-between items-center border-t border-dashed border-slate-100 dark:border-slate-800 pt-3 mt-1">
              <span className="font-bold text-sm text-slate-500">Tổng trị giá vốn:</span>
              <span className="font-extrabold text-xl text-blue-600">{totalValue.toLocaleString('vi-VN')}₫</span>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={exportMutation.isPending}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-850 dark:hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg transition-all text-sm flex items-center justify-center gap-2"
          >
            <Upload size={16} /> Xác nhận xuất kho
          </button>
        </div>

      </div>

      {/* MODAL: HISTORY */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-scale-up">
            
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-extrabold text-lg flex items-center gap-2"><History /> Lịch sử xuất kho</h3>
              <button className="text-slate-400 hover:text-slate-600 text-xl font-bold" onClick={() => setHistoryOpen(false)}>&times;</button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              
              {/* Main table history list */}
              {!selectedExport ? (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="px-5 py-3">Mã phiếu</th>
                        <th className="px-5 py-3">Ngày xuất</th>
                        <th className="px-5 py-3">Người xuất</th>
                        <th className="px-5 py-3 text-right">Tổng giá trị vốn</th>
                        <th className="px-5 py-3">Ghi chú</th>
                        <th className="px-5 py-3 text-center">Chi tiết</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                      {exportsList.map(exp => (
                        <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="px-5 py-3 font-bold text-slate-800 dark:text-slate-100">#{exp.id}</td>
                          <td className="px-5 py-3">{new Date(exp.created_at || '').toLocaleString('vi-VN')}</td>
                          <td className="px-5 py-3">Nhân viên kho</td>
                          <td className="px-5 py-3 text-right text-blue-600 font-bold">{exp.total_value.toLocaleString('vi-VN')}₫</td>
                          <td className="px-5 py-3 text-slate-400 max-w-[150px] truncate">{exp.note || '-'}</td>
                          <td className="px-5 py-3 text-center">
                            <button 
                              onClick={() => setSelectedExport(exp)}
                              className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-emerald-600 hover:text-white transition-colors"
                            >
                              <Eye size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {exportsList.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400">Không có dữ liệu phiếu xuất kho.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                
                // Detailed single invoice view
                <div className="space-y-5 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                  <button 
                    onClick={() => setSelectedExport(null)}
                    className="text-xs font-bold text-emerald-600 hover:underline mb-2 block"
                  >
                    &larr; Quay lại danh sách
                  </button>

                  <div className="flex flex-col sm:flex-row justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                    <div>
                      <h4 className="font-extrabold text-base text-blue-600">HÓA ĐƠN XUẤT KHO VẬT TƯ</h4>
                      <span className="text-xs text-slate-400">Phiếu xuất ID: #{selectedExport.id}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-2 sm:mt-0 space-y-1">
                      <p className="flex items-center gap-1.5"><Calendar size={13} /> <strong>Thời gian xuất:</strong> {new Date(selectedExport.created_at || '').toLocaleString('vi-VN')}</p>
                      <p className="flex items-center gap-1.5"><User size={13} /> <strong>Thực hiện:</strong> Lê Nhân Viên Kho</p>
                    </div>
                  </div>

                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="px-4 py-2.5">Nguyên liệu</th>
                        <th className="px-4 py-2.5 text-center">Số lượng</th>
                        <th className="px-4 py-2.5">Đơn vị</th>
                        <th className="px-4 py-2.5">Lý do</th>
                        <th className="px-4 py-2.5 text-right">Đơn giá vốn</th>
                        <th className="px-4 py-2.5 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold">
                      {selectedExport.items?.map(it => {
                        const ingName = ingredients.find(i => i.id === it.ingredient_id)?.name || `Nguyên liệu #${it.ingredient_id}`;
                        const ingUnit = ingredients.find(i => i.id === it.ingredient_id)?.unit || 'đơn vị';
                        return (
                          <tr key={it.ingredient_id}>
                            <td className="px-4 py-3 font-bold">{ingName}</td>
                            <td className="px-4 py-3 text-center">{it.quantity}</td>
                            <td className="px-4 py-3 text-slate-400">{ingUnit}</td>
                            <td><span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px]">{translateReason(it.reason)}</span></td>
                            <td className="px-4 py-3 text-right">{it.unit_cost.toLocaleString('vi-VN')}₫</td>
                            <td className="px-4 py-3 text-right text-blue-600 font-bold">{it.total_cost.toLocaleString('vi-VN')}₫</td>
                          </tr>
                        );
                      })}
                      <tr className="bg-slate-50 dark:bg-slate-900/50 font-bold">
                        <td colSpan={5} className="px-4 py-3 uppercase">TỔNG GIÁ TRỊ VỐN TIÊU HAO:</td>
                        <td className="px-4 py-3 text-right text-blue-600 font-extrabold text-sm">{selectedExport.total_value.toLocaleString('vi-VN')}₫</td>
                      </tr>
                    </tbody>
                  </table>

                  <p className="text-xs"><strong>Ghi chú:</strong> {selectedExport.note || 'Không có.'}</p>
                </div>
              )}

            </div>
            
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button 
                onClick={() => setHistoryOpen(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold rounded-xl"
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

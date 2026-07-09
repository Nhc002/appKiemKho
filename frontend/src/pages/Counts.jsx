import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiService } from '../services/api.js';
import { 
  ClipboardCheck, 
  History, 
  Eye, 
  Search,
  Calendar,
  User,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function Counts() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [note, setNote] = useState('');
  const [countItems, setCountItems] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedCount, setSelectedCount] = useState(null);

  // Fetch lists
  const { data: ingredients = [], isLoading: ingLoading } = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => ApiService.getIngredients()
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => ApiService.getProducts()
  });

  const { data: recipes = [] } = useQuery({
    queryKey: ['recipes'],
    queryFn: () => ApiService.getRecipes()
  });

  const { data: imports = [] } = useQuery({
    queryKey: ['imports'],
    queryFn: () => ApiService.getImports()
  });

  const { data: exportsList = [] } = useQuery({
    queryKey: ['exports'],
    queryFn: () => ApiService.getExports()
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => ApiService.getSales()
  });

  const { data: countsList = [] } = useQuery({
    queryKey: ['counts'],
    queryFn: () => ApiService.getCounts()
  });

  // Compile expected inventory list on load
  useEffect(() => {
    if (ingredients.length === 0) return;

    // Find date of last count
    const lastCount = countsList.length > 0 ? countsList[0] : null;
    const boundaryDate = lastCount ? new Date(lastCount.created_at || lastCount.date) : new Date(0);

    const compiledItems = ingredients.map(ing => {
      // 1. Calculate Imports since last count
      let importedQty = 0;
      imports.forEach(imp => {
        if (new Date(imp.created_at || '') > boundaryDate) {
          const item = imp.items?.find(it => it.ingredient_id === ing.id);
          if (item) importedQty += Number(item.quantity);
        }
      });

      // 2. Calculate Exports since last count
      let exportedQty = 0;
      exportsList.forEach(exp => {
        if (new Date(exp.created_at || '') > boundaryDate) {
          const item = exp.items?.find(it => it.ingredient_id === ing.id);
          if (item) exportedQty += Number(item.quantity);
        }
      });

      // 3. Calculate Recipe BOM Consumption since last count
      let consumedQty = 0;
      sales.forEach(sale => {
        if (new Date(sale.created_at || '') > boundaryDate) {
          sale.items?.forEach(saleItem => {
            const recipe = recipes.find(r => r.product_id === saleItem.product_id && r.active);
            if (recipe && recipe.items) {
              const recItem = recipe.items.find(ri => ri.ingredient_id === ing.id);
              if (recItem) {
                consumedQty += Number(recItem.quantity) * Number(saleItem.quantity_sold);
              }
            }
          });
        }
      });

      // 4. Calculate Beginning Stock
      let beginning = ing.current_stock;
      if (lastCount) {
        const lastItem = lastCount.items?.find(it => it.ingredient_id === ing.id);
        beginning = lastItem ? Number(lastItem.actual_stock) : ing.current_stock;
      } else {
        // If no last count, estimate beginning stock
        beginning = ing.current_stock - importedQty + exportedQty + consumedQty;
      }

      // Expected stock is identical to ing.current_stock
      const expected = ing.current_stock;

      return {
        ingredient_id: ing.id,
        name: ing.name,
        unit: ing.unit,
        cost_price: ing.cost_price,
        beginning: Number(beginning.toFixed(2)),
        imported: Number(importedQty.toFixed(2)),
        exported: Number((exportedQty + consumedQty).toFixed(2)), // sum recipe + export
        recipe_consumption: Number(consumedQty.toFixed(2)),
        other_export: Number(exportedQty.toFixed(2)),
        expected: Number(expected.toFixed(2)),
        actual: Number(expected.toFixed(2)), // Prefill actual with expected to save time
        difference: 0,
        difference_cost: 0
      };
    });

    setCountItems(compiledItems);
  }, [ingredients, imports, exportsList, sales, countsList, recipes]);

  // Mutation to submit count sheet
  const countMutation = useMutation({
    mutationFn: (data) => ApiService.createCount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['counts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
      
      setNote('');
      alert('Đã hoàn tất kiểm kê kho và lưu báo cáo thành công!');
    },
    onError: (err) => {
      alert('Lỗi lưu kiểm kho: ' + err.message);
    }
  });

  const handleActualChange = (ingId, valueStr) => {
    const value = Number(valueStr) || 0;
    setCountItems(countItems.map(item => {
      if (item.ingredient_id !== ingId) return item;
      
      const diff = value - item.expected;
      const diffCost = diff * item.cost_price;

      return {
        ...item,
        actual: value,
        difference: Number(diff.toFixed(2)),
        difference_cost: Number(diffCost.toFixed(2))
      };
    }));
  };

  const handleSubmitCount = () => {
    if (confirm('Xác nhận hoàn tất kiểm kho? Lượng hàng tồn thực tế đếm được sẽ được đồng bộ vào kho hệ thống.')) {
      const totalDiffCost = countItems.reduce((sum, r) => sum + r.difference_cost, 0);
      
      countMutation.mutate({
        user_id: 'usr-1', // Mock user id
        total_difference_cost: totalDiffCost,
        note: note,
        items: countItems.map(r => ({
          ingredient_id: r.ingredient_id,
          expected_stock: r.expected,
          actual_stock: r.actual,
          difference: r.difference,
          difference_cost: r.difference_cost
        }))
      });
    }
  };

  const handleExportCountExcel = () => {
    const data = countItems.map(item => ({
      'Tên Nguyên Liệu': item.name,
      'Tồn Đầu Ca': item.beginning,
      'Nhập Trong Ca': item.imported,
      'Tiêu Hao BOM': item.recipe_consumption,
      'Xuất Hủy Khác': item.other_export,
      'Tồn Lý Thuyết': item.expected,
      'Tồn Thực Tế': item.actual,
      'Đơn Vị': item.unit,
      'Chênh Lệch': item.difference,
      'Giá Trị Chênh Lệch (VND)': item.difference_cost
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Phiếu kiểm kho');
    XLSX.writeFile(workbook, `Phieu_Kiem_Kho_${Date.now()}.xlsx`);
  };

  // Filtered rows for search
  const filteredItems = countItems.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  // Sidebar cost totals calculations
  let totalLoss = 0;
  let totalExcess = 0;
  countItems.forEach(item => {
    if (item.difference_cost < 0) {
      totalLoss += Math.abs(item.difference_cost);
    } else if (item.difference_cost > 0) {
      totalExcess += item.difference_cost;
    }
  });

  const netDifference = totalExcess - totalLoss;

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Kiểm Kho Bàn Giao Cuối Ca</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Đối chiếu hàng tồn thực tế đếm được và tồn lý thuyết hệ thống tự động tính chênh lệch.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={handleExportCountExcel}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition-colors bg-white dark:bg-slate-900"
          >
            <FileSpreadsheet size={16} /> Xuất bảng kiểm
          </button>
          
          <button 
            onClick={() => setHistoryOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition-colors bg-white dark:bg-slate-900"
          >
            <History size={16} /> Lịch sử kiểm
          </button>
        </div>
      </div>

      {/* FILTER SEARCH */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Lọc nhanh nguyên vật liệu cần kiểm kê..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
          />
        </div>
      </div>

      {/* BIG COUNT WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT: PRODUCTS COUNT LIST */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm uppercase tracking-wide text-slate-400">Danh sách kiểm kê chi tiết</h3>
          
          {/* DESKTOP TABLE (Visible on medium screens and up) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="px-4 py-3">Nguyên liệu</th>
                  <th className="px-4 py-3 text-right">Tồn đầu ca</th>
                  <th className="px-4 py-3 text-right">Nhập trong ca</th>
                  <th className="px-4 py-3 text-right">Xuất/Tiêu hao</th>
                  <th className="px-4 py-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400">Lý thuyết</th>
                  <th className="px-4 py-3 text-center w-24">Tồn thực tế</th>
                  <th className="px-4 py-3 w-16">Đơn vị</th>
                  <th className="px-4 py-3 text-right w-24">Chênh lệch</th>
                  <th className="px-4 py-3 text-right w-28">Chênh lệch (VND)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold">
                {ingLoading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">Đang chuẩn bị bảng kiểm kê nguyên liệu...</td>
                  </tr>
                ) : filteredItems.map(row => {
                  let rowBgClass = 'bg-emerald-50/10 dark:bg-emerald-950/5';
                  let diffTextClass = 'text-slate-800 dark:text-slate-200';
                  
                  if (row.difference < 0) {
                    rowBgClass = 'bg-rose-50/40 dark:bg-rose-950/10';
                    diffTextClass = 'text-rose-600 dark:text-rose-400';
                  } else if (row.difference > 0) {
                    rowBgClass = 'bg-blue-50/40 dark:bg-blue-950/10';
                    diffTextClass = 'text-blue-600 dark:text-blue-400';
                  }

                  return (
                    <tr key={row.ingredient_id} className={`hover:bg-slate-100/30 transition-colors ${rowBgClass}`}>
                      <td className="px-4 py-3.5 font-bold text-slate-800 dark:text-slate-100">{row.name}</td>
                      <td className="px-4 py-3.5 text-right text-slate-400">{row.beginning}</td>
                      <td className="px-4 py-3.5 text-right text-slate-400">{row.imported}</td>
                      <td className="px-4 py-3.5 text-right text-slate-400">{row.exported}</td>
                      <td className="px-4 py-3.5 text-right font-extrabold text-slate-800 dark:text-slate-200">{row.expected}</td>
                      <td className="px-4 py-2">
                        <input 
                          type="number" 
                          step="0.01"
                          value={row.actual}
                          onChange={(e) => handleActualChange(row.ingredient_id, e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg text-xs focus:outline-none focus:border-emerald-500 text-center font-bold"
                        />
                      </td>
                      <td className="px-4 py-3.5 text-slate-400">{row.unit}</td>
                      <td className={`px-4 py-3.5 text-right font-extrabold ${diffTextClass}`}>
                        {row.difference > 0 ? '+' : ''}{row.difference}
                      </td>
                      <td className={`px-4 py-3.5 text-right font-extrabold ${diffTextClass}`}>
                        {row.difference_cost >= 0 ? '+' : ''}{row.difference_cost.toLocaleString('vi-VN')}₫
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* MOBILE LIST (Visible only on mobile screens) */}
          <div className="md:hidden space-y-4">
            {ingLoading ? (
              <p className="text-center text-slate-400 py-4 text-xs">Đang nạp dữ liệu kiểm kho...</p>
            ) : filteredItems.map(row => {
              let cardBorderClass = 'border-slate-150 dark:border-slate-800';
              let diffTextClass = 'text-slate-500';
              let diffLabel = 'Khớp';

              if (row.difference < 0) {
                cardBorderClass = 'border-rose-200 dark:border-rose-950 bg-rose-50/10 dark:bg-rose-950/5';
                diffTextClass = 'text-rose-600 dark:text-rose-400 font-bold';
                diffLabel = `Hao hụt: ${row.difference} ${row.unit} (-${Math.abs(row.difference_cost).toLocaleString('vi-VN')}₫)`;
              } else if (row.difference > 0) {
                cardBorderClass = 'border-blue-200 dark:border-blue-950 bg-blue-50/10 dark:bg-blue-950/5';
                diffTextClass = 'text-blue-600 dark:text-blue-400 font-bold';
                diffLabel = `Dư thừa: +${row.difference} ${row.unit} (+${row.difference_cost.toLocaleString('vi-VN')}₫)`;
              }

              return (
                <div key={row.ingredient_id} className={`p-4 border rounded-xl space-y-3 ${cardBorderClass}`}>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-100">{row.name}</span>
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded text-[10px] font-bold">{row.unit}</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-850 pb-2">
                    <div>
                      <span className="block text-[9px] uppercase text-slate-450">Tồn lý thuyết</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-xs">{row.expected}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase text-slate-450">Nhập trong ca</span>
                      <span className="text-slate-700 dark:text-slate-350 font-bold text-xs">{row.imported}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase text-slate-450">Xuất/Tiêu hao</span>
                      <span className="text-slate-700 dark:text-slate-350 font-bold text-xs">{row.exported}</span>
                    </div>
                  </div>

                  <div className="flex gap-4 items-center justify-between pt-1">
                    <div className="flex-1 max-w-[140px]">
                      <label className="text-[9px] uppercase font-bold text-slate-450 block mb-1">Thực tế đếm</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={row.actual}
                        onChange={(e) => handleActualChange(row.ingredient_id, e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs font-bold text-center focus:outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900"
                      />
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] uppercase font-bold text-slate-450 block mb-1">Hao hụt / Chênh lệch</span>
                      <span className={`text-[11px] ${diffTextClass}`}>{diffLabel}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredItems.length === 0 && !ingLoading && (
              <p className="text-center text-slate-400 py-8 text-xs">Không tìm thấy nguyên vật liệu.</p>
            )}
          </div>
        </div>

        {/* RIGHT: COUNT SUMMARY */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 h-fit sticky top-20">
          <h3 className="font-extrabold text-sm uppercase tracking-wide text-slate-400">Xác nhận bàn giao ca</h3>
          
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500">Ghi chú bàn giao</label>
              <textarea
                rows={4}
                placeholder="Ví dụ: Ca chiều bàn giao, hao hụt 0.05 chai siro đào do hỏng vòi bơm..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs focus:outline-none focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2.5 text-xs font-semibold">
            <div className="flex justify-between">
              <span className="text-slate-400">Hao hụt ròng (Thiếu hàng):</span>
              <span className="font-extrabold text-rose-600">-{totalLoss.toLocaleString('vi-VN')}₫</span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-400">Dư thừa ròng (Thừa hàng):</span>
              <span className="font-extrabold text-blue-600">+{totalExcess.toLocaleString('vi-VN')}₫</span>
            </div>
            
            <div className="flex justify-between items-center border-t border-dashed border-slate-100 dark:border-slate-800 pt-3 mt-1">
              <span className="font-bold text-sm text-slate-500">Số dư chênh lệch ròng:</span>
              <span className={`font-extrabold text-lg ${netDifference >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                {netDifference >= 0 ? '+' : ''}{netDifference.toLocaleString('vi-VN')}₫
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] text-slate-400 leading-normal flex gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>Xác nhận hoàn tất sẽ lưu lại lịch sử chênh lệch và đồng bộ số lượng tồn thực tế của quán vào cơ sở dữ liệu.</span>
          </div>

          <button
            onClick={handleSubmitCount}
            disabled={countMutation.isPending}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/25 transition-all text-sm flex items-center justify-center gap-2"
          >
            <ClipboardCheck size={16} /> Xác nhận & Bàn giao ca
          </button>
        </div>

      </div>

      {/* MODAL: HISTORY */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-scale-up">
            
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-extrabold text-lg flex items-center gap-2"><ClipboardCheck /> Lịch sử Kiểm Kho & Bàn Giao Ca</h3>
              <button className="text-slate-400 hover:text-slate-600 text-xl font-bold" onClick={() => setHistoryOpen(false)}>&times;</button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              
              {/* Main table history list */}
              {!selectedCount ? (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="px-5 py-3">Mã phiếu</th>
                        <th className="px-5 py-3">Ngày thực hiện</th>
                        <th className="px-5 py-3">Người kiểm đếm</th>
                        <th className="px-5 py-3 text-right">Chênh lệch giá trị</th>
                        <th className="px-5 py-3">Ghi chú bàn giao</th>
                        <th className="px-5 py-3 text-center">Chi tiết</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                      {countsList.map(cnt => {
                        const diffVal = cnt.total_difference_cost || 0;
                        let diffTextClass = 'text-slate-800 dark:text-slate-200';
                        if (diffVal < 0) diffTextClass = 'text-rose-600';
                        if (diffVal > 0) diffTextClass = 'text-blue-600';

                        return (
                          <tr key={cnt.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="px-5 py-3 font-bold text-slate-800 dark:text-slate-100">#{cnt.id}</td>
                            <td className="px-5 py-3">{new Date(cnt.created_at || cnt.date || '').toLocaleString('vi-VN')}</td>
                            <td className="px-5 py-3 font-bold">Lê Nhân Viên Kho</td>
                            <td className={`px-5 py-3 text-right font-bold ${diffTextClass}`}>{diffVal >= 0 ? '+' : ''}{diffVal.toLocaleString('vi-VN')}₫</td>
                            <td className="px-5 py-3 text-slate-400 max-w-[150px] truncate">{cnt.note || '-'}</td>
                            <td className="px-5 py-3 text-center">
                              <button 
                                onClick={() => setSelectedCount(cnt)}
                                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-emerald-600 hover:text-white transition-colors"
                              >
                                <Eye size={12} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {countsList.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400">Không có dữ liệu phiếu kiểm kho.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                
                // Detailed single count sheet view
                <div className="space-y-5 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                  <button 
                    onClick={() => setSelectedCount(null)}
                    className="text-xs font-bold text-emerald-600 hover:underline mb-2 block"
                  >
                    &larr; Quay lại danh sách
                  </button>

                  <div className="flex flex-col sm:flex-row justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                    <div>
                      <h4 className="font-extrabold text-base text-emerald-600">BIÊN BẢN KIỂM KÊ CUỐI CA CHI TIẾT</h4>
                      <span className="text-xs text-slate-400">Phiếu kiểm ID: #{selectedCount.id}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-2 sm:mt-0 space-y-1">
                      <p><strong>Thời gian kiểm:</strong> {new Date(selectedCount.created_at || selectedCount.date || '').toLocaleString('vi-VN')}</p>
                      <p><strong>Nhân viên ca:</strong> Lê Nhân Viên Kho</p>
                    </div>
                  </div>

                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="px-4 py-2.5">Nguyên liệu</th>
                        <th className="px-4 py-2.5 text-right">Lý thuyết</th>
                        <th className="px-4 py-2.5 text-right">Thực tế</th>
                        <th className="px-4 py-2.5">Đơn vị</th>
                        <th className="px-4 py-2.5 text-right">Chênh lệch</th>
                        <th className="px-4 py-2.5 text-right">Giá trị chênh lệch</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold">
                      {selectedCount.items?.map(it => {
                        const ing = ingredients.find(i => i.id === it.ingredient_id);
                        const ingName = ing ? ing.name : `Nguyên liệu #${it.ingredient_id}`;
                        const ingUnit = ing ? ing.unit : 'đơn vị';
                        
                        let rowBg = 'bg-emerald-50/10';
                        let diffColor = 'text-slate-800 dark:text-slate-200';
                        if (it.difference < 0) {
                          rowBg = 'bg-rose-50/30';
                          diffColor = 'text-rose-600';
                        } else if (it.difference > 0) {
                          rowBg = 'bg-blue-50/30';
                          diffColor = 'text-blue-600';
                        }

                        return (
                          <tr key={it.ingredient_id} className={rowBg}>
                            <td className="px-4 py-3 font-bold">{ingName}</td>
                            <td className="px-4 py-3 text-right">{it.expected_stock}</td>
                            <td className="px-4 py-3 text-right font-extrabold text-slate-800 dark:text-slate-100">{it.actual_stock}</td>
                            <td className="px-4 py-3 text-slate-400">{ingUnit}</td>
                            <td className={`px-4 py-3 text-right font-extrabold ${diffColor}`}>
                              {it.difference > 0 ? '+' : ''}{it.difference}
                            </td>
                            <td className={`px-4 py-3 text-right font-extrabold ${diffColor}`}>
                              {it.difference_cost >= 0 ? '+' : ''}{it.difference_cost.toLocaleString('vi-VN')}₫
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="bg-slate-50 dark:bg-slate-900/50 font-bold">
                        <td colSpan={5} className="px-4 py-3 uppercase">SỐ DƯ CHÊNH LỆCH RÒNG CA:</td>
                        <td className={`px-4 py-3 text-right font-extrabold text-sm ${selectedCount.total_difference_cost >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                          {selectedCount.total_difference_cost >= 0 ? '+' : ''}{selectedCount.total_difference_cost.toLocaleString('vi-VN')}₫
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <p className="text-xs"><strong>Ghi chú bàn giao:</strong> {selectedCount.note || 'Không có.'}</p>
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

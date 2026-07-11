import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiService } from '../services/api.js';
import { 
  ClipboardCheck, 
  History, 
  Eye, 
  Search,
  AlertCircle,
  FileSpreadsheet,
  TrendingDown,
  TrendingUp,
  CornerDownLeft,
  X,
  FileText
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

    // Deduplicate ingredients logic
    const seenNames = new Set();
    const uniqueCompiled = [];
    compiledItems.forEach(item => {
      if (!seenNames.has(item.name.toLowerCase())) {
        seenNames.add(item.name.toLowerCase());
        uniqueCompiled.push(item);
      }
    });

    setCountItems(uniqueCompiled);
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
    <div className="space-y-4 animate-slide-up pb-28">
      
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Kiểm kho bàn giao ca</h1>
          <p className="text-xs text-slate-500">Đối chiếu hàng tồn thực tế vs lý thuyết</p>
        </div>
        <div className="flex gap-1.5">
          <button 
            onClick={handleExportCountExcel}
            className="p-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-slate-655 active:scale-95 transition-transform"
          >
            <FileSpreadsheet size={15} />
          </button>
          <button 
            onClick={() => setHistoryOpen(true)}
            className="px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs font-bold flex items-center gap-1 active:scale-95 transition-transform"
          >
            <History size={13} />
            <span>Lịch sử</span>
          </button>
        </div>
      </div>

      {/* FILTER SEARCH BAR */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
        <input 
          type="text" 
          placeholder="Lọc nhanh nguyên vật liệu cần kiểm..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-blue-500 font-semibold"
        />
      </div>

      {/* CARD LIST GRID */}
      <div className="space-y-2.5">
        {ingLoading ? (
          <p className="text-center text-slate-400 py-6 text-xs animate-pulse">Đang nạp dữ liệu kiểm kho...</p>
        ) : filteredItems.map(row => {
          let cardBorderColor = "border-slate-200 dark:border-slate-800/80";
          let badgeColor = "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
          let badgeText = "Khớp";
          
          if (row.difference < 0) {
            cardBorderColor = "border-red-200 dark:border-red-950 bg-red-50/5 dark:bg-red-950/5";
            badgeColor = "bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400";
            badgeText = `Hao hụt -${Math.abs(row.difference)} ${row.unit}`;
          } else if (row.difference > 0) {
            cardBorderColor = "border-blue-200 dark:border-blue-950 bg-blue-50/5 dark:bg-blue-950/5";
            badgeColor = "bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400";
            badgeText = `Dư thừa +${row.difference} ${row.unit}`;
          }

          return (
            <div key={row.ingredient_id} className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm space-y-3 transition-colors ${cardBorderColor}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-100">📦 {row.name}</h3>
                  <span className="text-[10px] text-slate-400 mt-1 block">DVT: <span className="font-bold">{row.unit}</span></span>
                </div>
                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${badgeColor}`}>
                  {badgeText}
                </span>
              </div>

              {/* STATS MATRIX */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-850/60 p-2.5 rounded-xl text-[10px]">
                <div>
                  <span className="text-slate-400 block text-[8px] uppercase font-bold">Lý thuyết</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-100">{row.expected}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[8px] uppercase font-bold">Nhập ca</span>
                  <span className="font-bold text-slate-650">{row.imported}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[8px] uppercase font-bold">Tiêu hao / Xuất</span>
                  <span className="font-bold text-slate-650">{row.exported}</span>
                </div>
              </div>

              {/* INPUT COUNTER SECTION */}
              <div className="flex justify-between items-center pt-1.5 border-t border-slate-100 dark:border-slate-800">
                <div className="w-[140px]">
                  <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Số lượng đếm thực tế</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={row.actual}
                    onChange={(e) => handleActualChange(row.ingredient_id, e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-150 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-xl text-xs font-black text-center focus:outline-none focus:border-blue-500 focus:bg-white h-[40px]"
                  />
                </div>

                <div className="text-right">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Giá trị chênh lệch</span>
                  <span className={`text-xs font-black ${row.difference_cost < 0 ? 'text-red-600' : row.difference_cost > 0 ? 'text-blue-600' : 'text-slate-500'}`}>
                    {row.difference_cost > 0 ? '+' : ''}{row.difference_cost.toLocaleString('vi-VN')}₫
                  </span>
                </div>
              </div>

            </div>
          );
        })}
        {filteredItems.length === 0 && !ingLoading && (
          <p className="text-center text-slate-400 py-8 text-xs">Không có nguyên liệu nào.</p>
        )}
      </div>

      {/* STICKY BOTTOM DRAWER (Submit ca, Ghi chú) */}
      <div className="fixed bottom-16 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 shadow-xl z-30 space-y-3">
        <div className="flex gap-3 items-center justify-between">
          <div className="flex-1">
            <input 
              type="text"
              placeholder="Nhập ghi chú bàn giao ca..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-xl text-xs focus:outline-none focus:border-blue-500 h-[38px] font-semibold"
            />
          </div>
          <div className="text-right shrink-0">
            <span className="text-[8px] text-slate-400 uppercase font-extrabold block">Lệch ròng ca</span>
            <span className={`text-xs font-black ${netDifference >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {netDifference >= 0 ? '+' : ''}{netDifference.toLocaleString('vi-VN')}₫
            </span>
          </div>
        </div>

        <button 
          onClick={handleSubmitCount}
          disabled={countMutation.isPending}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/15 h-[44px] active:scale-98 transition-transform"
        >
          <ClipboardCheck size={14} />
          <span>Hoàn tất & Bàn giao ca</span>
        </button>
      </div>

      {/* POPUP HISTORY */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl border-t sm:border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-lg overflow-hidden animate-slide-up max-h-[85vh] flex flex-col">
            
            <div className="w-12 h-1.5 bg-slate-255 dark:bg-slate-800 rounded-full mx-auto my-3 sm:hidden" onClick={() => setHistoryOpen(false)} />

            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
                <History size={16} /> Lịch sử bàn giao ca
              </h3>
              <button 
                onClick={() => { setHistoryOpen(false); setSelectedCount(null); }}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold hidden sm:block"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              
              {!selectedCount ? (
                <div className="space-y-2">
                  {countsList.map(cnt => {
                    const diffVal = cnt.total_difference_cost || 0;
                    return (
                      <div 
                        key={cnt.id}
                        onClick={() => setSelectedCount(cnt)}
                        className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/60 rounded-xl flex justify-between items-center cursor-pointer active:scale-98 transition-all"
                      >
                        <div className="space-y-1">
                          <p className="text-xs font-black">Phiếu kiểm #{cnt.id}</p>
                          <p className="text-[10px] text-slate-400">{new Date(cnt.created_at || cnt.date || '').toLocaleString('vi-VN')}</p>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <span className={`text-xs font-black ${diffVal >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {diffVal >= 0 ? '+' : ''}{diffVal.toLocaleString('vi-VN')}₫
                          </span>
                          <Eye size={12} className="text-slate-400" />
                        </div>
                      </div>
                    );
                  })}
                  {countsList.length === 0 && (
                    <p className="text-center text-slate-400 py-6 text-xs">Chưa có lịch sử kiểm kê.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <button 
                    onClick={() => setSelectedCount(null)}
                    className="text-xs font-bold text-blue-600 flex items-center gap-1 mb-2"
                  >
                    &larr; Quay lại danh sách
                  </button>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-850/50 space-y-1">
                    <p className="text-xs font-black text-blue-600 uppercase">Chi tiết phiếu #{selectedCount.id}</p>
                    <p className="text-[10px] text-slate-400">Thời gian: {new Date(selectedCount.created_at || selectedCount.date || '').toLocaleString('vi-VN')}</p>
                    <p className="text-[10px] text-slate-400">Ghi chú: {selectedCount.note || 'Không có.'}</p>
                  </div>

                  <div className="space-y-2">
                    {selectedCount.items?.map(it => {
                      const ing = ingredients.find(i => i.id === it.ingredient_id);
                      const ingName = ing ? ing.name : `Nguyên liệu #${it.ingredient_id}`;
                      
                      return (
                        <div key={it.ingredient_id} className="p-2.5 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-xl flex justify-between items-center text-xs">
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-100">{ingName}</p>
                            <p className="text-[10px] text-slate-400">Sách: {it.expected_stock} | Thực: {it.actual_stock} {ing?.unit}</p>
                          </div>
                          <span className={`font-black ${it.difference < 0 ? 'text-red-600' : it.difference > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                            {it.difference > 0 ? '+' : ''}{it.difference_cost.toLocaleString('vi-VN')}₫
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
            
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex gap-3">
              <button 
                onClick={() => { setHistoryOpen(false); setSelectedCount(null); }}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold rounded-xl"
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

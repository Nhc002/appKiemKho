import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiService } from '../services/api.js';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { 
  Search, 
  FileDown, 
  Plus, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle,
  RefreshCw,
  Edit,
  Trash2,
  Layers,
  Archive,
  AlertTriangle,
  Heart
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function Products() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  
  // Navigation tabs: 'products' (Fabi) | 'ingredients' (Ingredients)
  const [activeSubTab, setActiveSubTab] = useState('products');
  
  // Filters state
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [syncing, setSyncing] = useState(false);

  // Modals state
  const [ingModalOpen, setIngModalOpen] = useState(false);
  const [editingIng, setEditingIng] = useState(null);

  // React Hook Form for Ingredient
  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm();

  // Read search query from URL params (e.g. from global search)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const query = params.get('search');
    if (query) {
      setSearch(query);
    }
  }, [location.search]);

  // Fetch lists
  const { data: products = [], isLoading: prodLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => ApiService.getProducts()
  });

  const { data: ingredients = [], isLoading: ingLoading } = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => ApiService.getIngredients()
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => ApiService.getSuppliers()
  });

  // Fabi sync mutation
  const syncMutation = useMutation({
    mutationFn: () => ApiService.syncFabi(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      alert(`Đồng bộ iPOS thành công! Kéo về ${data.total_sales_count} đơn hàng, phát hiện và tạo mới ${data.new_products_created} món.`);
    },
    onError: (err) => {
      alert('Đồng bộ thất bại: ' + err.message);
    },
    onSettled: () => {
      setSyncing(false);
    }
  });

  // Ingredient mutation
  const ingMutation = useMutation({
    mutationFn: (data) => ApiService.saveIngredient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      setIngModalOpen(false);
      setEditingIng(null);
      reset();
      alert('Đã lưu thông tin nguyên liệu kho thành công!');
    },
    onError: (err) => {
      alert('Lỗi lưu nguyên liệu: ' + err.message);
    }
  });

  const deleteIngMutation = useMutation({
    mutationFn: (id) => ApiService.deleteIngredient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      alert('Đã xóa nguyên liệu khỏi kho thành công!');
    },
    onError: (err) => {
      alert('Không thể xóa: ' + err.message);
    }
  });

  const handleManualSync = () => {
    setSyncing(true);
    syncMutation.mutate();
  };

  // Excel exports
  const handleExportProductsExcel = () => {
    const data = products.map(p => ({
      'Mã Sản Phẩm (iPOS ID)': p.item_id,
      'Tên Sản Phẩm': p.item_name,
      'Danh Mục': p.category || 'Món khác',
      'Giá Bán (VND)': p.price,
      'Định lượng BOM': p.recipe_missing ? 'Chưa cấu hình' : 'Đã cấu hình'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    Xcontent_to_sheet: XLSX.utils.book_append_sheet(workbook, worksheet, 'Sản phẩm Fabi');
    XLSX.writeFile(workbook, `Fabi_Products_${Date.now()}.xlsx`);
  };

  const handleExportIngredientsExcel = () => {
    const data = ingredients.map(i => ({
      'Tên Nguyên Liệu': i.name,
      'Đơn Vị': i.unit,
      'Giá Gốc Nhập': i.cost_price,
      'Tồn Kho Hiện Tại': i.current_stock,
      'Tồn Tối Thiểu': i.min_stock,
      'Nhà Cung Cấp': suppliers.find(s => s.id === i.supplier_id)?.name || 'Lẻ'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Nguyên vật liệu');
    XLSX.writeFile(workbook, `Nguyen_Vat_Lieu_${Date.now()}.xlsx`);
  };

  // Ingredient form controls
  const handleOpenIngModal = (ing = null) => {
    reset();
    if (ing) {
      setEditingIng(ing);
      setValue('name', ing.name);
      setValue('unit', ing.unit);
      setValue('cost_price', ing.cost_price);
      setValue('current_stock', ing.current_stock);
      setValue('min_stock', ing.min_stock);
      setValue('supplier_id', ing.supplier_id || '');
    } else {
      setEditingIng(null);
    }
    setIngModalOpen(true);
  };

  const handleSaveIngredient = (data) => {
    const submission = {
      ...data,
      cost_price: Number(data.cost_price),
      current_stock: Number(data.current_stock),
      min_stock: Number(data.min_stock),
      supplier_id: data.supplier_id ? Number(data.supplier_id) : undefined
    };
    if (editingIng) {
      submission.id = editingIng.id;
    }
    ingMutation.mutate(submission);
  };

  const handleDeleteIngredient = (id) => {
    if (confirm('Xác nhận xóa nguyên liệu này? Tất cả dữ liệu kho liên quan sẽ bị ảnh hưởng.')) {
      deleteIngMutation.mutate(id);
    }
  };

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  // Filtering logic
  const filteredProducts = products.filter(p => {
    const matchSearch = p.item_name.toLowerCase().includes(search.toLowerCase()) || p.item_id.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !category || p.category === category;
    const matchStatus = !status || 
      (status === 'missing' && p.recipe_missing) || 
      (status === 'configured' && !p.recipe_missing);
    return matchSearch && matchCategory && matchStatus;
  });

  // Deduplicate ingredients logic
  const seenIngNames = new Set();
  const uniqueIngredients = [];
  ingredients.forEach(i => {
    if (!seenIngNames.has(i.name.toLowerCase())) {
      seenIngNames.add(i.name.toLowerCase());
      uniqueIngredients.push(i);
    }
  });

  const filteredIngredients = uniqueIngredients.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-slide-up pb-10">
      
      {/* HEADER ROW */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Danh mục hàng hóa</h1>
          <p className="text-xs text-slate-500">Quản lý món Fabi và nguyên vật liệu</p>
        </div>
      </div>

      {/* SEGMENTED CONTROL (Tabs) */}
      <div className="bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl flex w-full">
        <button
          onClick={() => { setActiveSubTab('products'); setSearch(''); }}
          className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            activeSubTab === 'products'
              ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Layers size={14} />
          <span>Sản phẩm Fabi</span>
        </button>
        <button
          onClick={() => { setActiveSubTab('ingredients'); setSearch(''); }}
          className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            activeSubTab === 'ingredients'
              ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Archive size={14} />
          <span>Nguyên vật liệu</span>
        </button>
      </div>

      {/* FILTER CONTROLS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm space-y-3">
        
        {/* Collapsible search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input 
            type="text" 
            placeholder={activeSubTab === 'products' ? 'Tìm theo tên món hoặc mã...' : 'Tìm tên nguyên liệu...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:bg-white font-semibold transition-all"
          />
        </div>

        {activeSubTab === 'products' && (
          <div className="grid grid-cols-2 gap-2">
            <select 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 rounded-xl text-xs focus:outline-none focus:border-blue-500 font-semibold"
            >
              <option value="">Tất cả nhóm</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select 
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 rounded-xl text-xs focus:outline-none focus:border-blue-500 font-semibold"
            >
              <option value="">Trạng thái định lượng</option>
              <option value="missing">Chưa định lượng</option>
              <option value="configured">Đã định lượng</option>
            </select>
          </div>
        )}

        {/* Sync & Export actions */}
        <div className="flex gap-2">
          {activeSubTab === 'products' ? (
            <>
              <button 
                onClick={handleManualSync}
                disabled={syncing}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-md shadow-blue-500/15 disabled:opacity-50 transition-colors"
              >
                <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
                <span>Đồng bộ iPOS</span>
              </button>
              <button 
                onClick={handleExportProductsExcel}
                className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <FileDown size={14} />
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => handleOpenIngModal()}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-md shadow-blue-500/15 transition-colors"
              >
                <Plus size={13} />
                <span>Thêm nguyên liệu</span>
              </button>
              <button 
                onClick={handleExportIngredientsExcel}
                className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <FileDown size={14} />
              </button>
            </>
          )}
        </div>

      </div>

      {/* CARD LIST GRID */}
      <div className="space-y-2.5">
        
        {/* Products Card List */}
        {activeSubTab === 'products' && (
          <>
            {prodLoading ? (
              <p className="text-center text-slate-400 py-6 text-xs">Đang nạp món iPOS...</p>
            ) : filteredProducts.map(p => (
              <div key={p.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between gap-3 active:scale-98 transition-transform">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-100 leading-tight">🥤 {p.item_name}</h3>
                    <span className="text-[10px] text-slate-400 mt-1 block">Mã iPOS: <span className="font-mono">{p.item_id}</span></span>
                  </div>
                  <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-lg text-[9px] font-black uppercase">
                    {p.category || 'Món khác'}
                  </span>
                </div>

                <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800 pt-3">
                  <span className="text-xs font-black text-slate-700 dark:text-slate-300">{(p.price || 0).toLocaleString('vi-VN')}₫</span>
                  <div className="flex items-center gap-2">
                    {p.recipe_missing ? (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-lg text-[9px] font-extrabold">
                        <AlertCircle size={10} /> Thiếu định lượng
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 rounded-lg text-[9px] font-extrabold">
                        <CheckCircle size={10} /> Đủ định lượng
                      </span>
                    )}
                    <button 
                      onClick={() => navigate('/recipes', { state: { selectProductId: p.id } })}
                      className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-750 text-white rounded-xl text-[10px] font-bold flex items-center gap-0.5 transition-all"
                    >
                      <span>Định lượng</span>
                      <ArrowRight size={10} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filteredProducts.length === 0 && !prodLoading && (
              <p className="text-center text-slate-400 py-8 text-xs">Không tìm thấy sản phẩm nào.</p>
            )}
          </>
        )}

        {/* Ingredients Card List */}
        {activeSubTab === 'ingredients' && (
          <>
            {ingLoading ? (
              <p className="text-center text-slate-400 py-6 text-xs">Đang tải nguyên liệu...</p>
            ) : filteredIngredients.map(ing => {
              const isLow = ing.current_stock <= ing.min_stock;
              const isOut = ing.current_stock <= 0;
              let badgeColor = "bg-green-50 text-green-600 dark:bg-green-950/20 dark:text-green-400";
              let badgeText = "Đủ hàng";
              if (isOut) {
                badgeColor = "bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400";
                badgeText = "Hết hàng";
              } else if (isLow) {
                badgeColor = "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400";
                badgeText = "Sắp hết";
              }

              return (
                <div key={ing.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm flex flex-col gap-3 active:scale-98 transition-transform">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 leading-none">📦 {ing.name}</h3>
                      <span className="text-[10px] text-slate-400 mt-1 block">DVT: <span className="font-bold text-slate-600">{ing.unit}</span></span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${badgeColor}`}>
                      {badgeText}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2.5">
                    <p>Giá vốn: <span className="font-bold text-slate-800 dark:text-slate-200">{(ing.cost_price || 0).toLocaleString('vi-VN')}₫</span></p>
                    <p>Nhà CC: <span className="font-bold text-slate-700 dark:text-slate-350">{suppliers.find(s => s.id === ing.supplier_id)?.name || 'Lẻ'}</span></p>
                  </div>

                  <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800 pt-2.5 mt-0.5">
                    <span className="text-xs font-bold text-slate-500">
                      Tồn kho: <span className={`font-black text-sm ${isLow ? 'text-red-600' : 'text-slate-800 dark:text-slate-100'}`}>{ing.current_stock}</span> / Định mức: {ing.min_stock}
                    </span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleOpenIngModal(ing)}
                        className="p-2 bg-slate-100 hover:bg-blue-600 hover:text-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl transition-all active:scale-95"
                      >
                        <Edit size={12} />
                      </button>
                      <button 
                        onClick={() => handleDeleteIngredient(ing.id)}
                        className="p-2 bg-rose-50 hover:bg-rose-600 hover:text-white dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl transition-all active:scale-95"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredIngredients.length === 0 && !ingLoading && (
              <p className="text-center text-slate-400 py-8 text-xs">Không tìm thấy nguyên liệu nào.</p>
            )}
          </>
        )}

      </div>

      {/* MODAL: ADD / EDIT INGREDIENT (Swipeable bottom drawer style on mobile) */}
      {ingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-slide-up max-h-[90vh] flex flex-col">
            
            {/* Drawer swipe indicator on mobile */}
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto my-3 sm:hidden" onClick={() => setIngModalOpen(false)} />

            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-100">
                {editingIng ? `Sửa: ${editingIng.name}` : 'Thêm nguyên liệu kho mới'}
              </h3>
              <button 
                onClick={() => setIngModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold hidden sm:block"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit(handleSaveIngredient)} className="flex-1 overflow-y-auto pb-6">
              <div className="p-5 space-y-4">
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tên nguyên liệu *</label>
                  <input 
                    type="text" 
                    placeholder="Ví dụ: Trà Đen Lộc Phát (Gói 1kg)"
                    {...register('name', { required: true })}
                    className="w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:bg-white font-semibold transition-all h-[48px]"
                  />
                  {errors.name && <span className="text-[10px] text-rose-500 font-bold">Vui lòng điền tên nguyên liệu.</span>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">ĐVT *</label>
                    <input 
                      type="text" 
                      placeholder="Gói, Chai, Hộp..."
                      {...register('unit', { required: true })}
                      className="w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:bg-white font-semibold transition-all h-[48px]"
                    />
                    {errors.unit && <span className="text-[10px] text-rose-500 font-bold">Thiếu đơn vị.</span>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Giá nhập (₫) *</label>
                    <input 
                      type="number" 
                      placeholder="120000"
                      {...register('cost_price', { required: true, min: 0 })}
                      className="w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:bg-white font-semibold transition-all h-[48px]"
                    />
                    {errors.cost_price && <span className="text-[10px] text-rose-500 font-bold">Giá không hợp lệ.</span>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tồn ban đầu *</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      {...register('current_stock', { required: true, min: 0 })}
                      className="w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:bg-white font-semibold transition-all h-[48px]"
                      disabled={!!editingIng}
                    />
                    {errors.current_stock && <span className="text-[10px] text-rose-500 font-bold">Số lượng sai.</span>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Định mức tối thiểu *</label>
                    <input 
                      type="number" 
                      placeholder="5"
                      {...register('min_stock', { required: true, min: 0 })}
                      className="w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:bg-white font-semibold transition-all h-[48px]"
                    />
                    {errors.min_stock && <span className="text-[10px] text-rose-500 font-bold">Không hợp lệ.</span>}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nhà cung cấp</label>
                  <select 
                    {...register('supplier_id')}
                    className="w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-blue-500 font-semibold h-[48px]"
                  >
                    <option value="">Chọn nhà cung cấp</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

              </div>

              <div className="px-5 pt-2 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIngModalOpen(false)}
                  className="flex-1 py-3 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-350 bg-white dark:bg-slate-900 active:scale-95 transition-transform"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  disabled={ingMutation.isPending}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-transform"
                >
                  Lưu lại
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}

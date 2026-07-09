import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiService } from '../services/api.js';
import { useNavigate } from 'react-router-dom';
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
  Barcode,
  Layers,
  Archive
} from 'lucide-react';
import * as XLSX from 'xlsx';
import BarcodeScanner from '../components/BarcodeScanner.jsx';

export default function Products() {
  const navigate = useNavigate();
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
  const [scannerOpen, setScannerOpen] = useState(false);

  // React Hook Form for Ingredient
  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm();

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
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sản phẩm Fabi');
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

  const filteredIngredients = ingredients.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Danh Mục Hàng Hóa</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Quản lý món ăn kinh doanh đồng bộ từ Fabi iPOS và nguyên vật liệu lưu kho.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {activeSubTab === 'products' ? (
            <>
              <button 
                onClick={handleExportProductsExcel} 
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition-colors bg-white dark:bg-slate-900"
              >
                <FileDown size={16} /> Xuất Excel
              </button>
              <button 
                onClick={handleManualSync}
                disabled={syncing}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50"
              >
                <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} /> 
                {syncing ? 'Đang đồng bộ...' : 'Đồng bộ iPOS'}
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={handleExportIngredientsExcel} 
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition-colors bg-white dark:bg-slate-900"
              >
                <FileDown size={16} /> Xuất Excel
              </button>
              <button 
                onClick={() => handleOpenIngModal()}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/25 transition-all"
              >
                <Plus size={16} /> Thêm nguyên liệu
              </button>
            </>
          )}
        </div>
      </div>

      {/* TABS SWITCHER */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => { setActiveSubTab('products'); setSearch(''); }}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${activeSubTab === 'products' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          <Layers size={16} /> Món ăn bán ra (iPOS)
        </button>
        <button
          onClick={() => { setActiveSubTab('ingredients'); setSearch(''); }}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${activeSubTab === 'ingredients' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          <Archive size={16} /> Nguyên vật liệu kho
        </button>
      </div>

      {/* FILTER CONTROL CARD */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex flex-1 flex-wrap gap-3 w-full">
            
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder={activeSubTab === 'products' ? 'Tìm theo tên món hoặc mã iPOS...' : 'Tìm tên nguyên liệu...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
              />
            </div>

            {/* Product-only filters */}
            {activeSubTab === 'products' && (
              <>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-all font-semibold"
                >
                  <option value="">Tất cả danh mục</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                <select 
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-all font-semibold"
                >
                  <option value="">Trạng thái định lượng</option>
                  <option value="missing">Thiếu định lượng (BOM)</option>
                  <option value="configured">Đã định lượng (BOM)</option>
                </select>
              </>
            )}

          </div>
          
          <div className="text-xs font-bold text-slate-400">
            {activeSubTab === 'products' ? (
              <span>Hiển thị: {filteredProducts.length} / {products.length} món</span>
            ) : (
              <span>Hiển thị: {filteredIngredients.length} / {ingredients.length} nguyên liệu</span>
            )}
          </div>
        </div>
      </div>

      {/* DATA TABLE AREA */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        
        {/* TAB 1: FABI PRODUCTS TABLE */}
        {activeSubTab === 'products' && (
          <>
            {/* DESKTOP TABLE */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-xs">
                    <th className="px-6 py-4">Món ăn / Đồ uống</th>
                    <th className="px-6 py-4">Mã iPOS (item_id)</th>
                    <th className="px-6 py-4">Danh mục</th>
                    <th className="px-6 py-4 text-right">Giá bán iPOS</th>
                    <th className="px-6 py-4 text-center">Định lượng (BOM)</th>
                    <th className="px-6 py-4 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-semibold">
                  {prodLoading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">Đang nạp danh sách sản phẩm...</td>
                    </tr>
                  ) : filteredProducts.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-6 py-4 font-bold text-slate-850 dark:text-slate-100">{p.item_name}</td>
                      <td className="px-6 py-4 text-slate-400 font-mono text-xs">{p.item_id}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs">
                          {p.category || 'Món khác'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-700 dark:text-slate-350">{(p.price || 0).toLocaleString('vi-VN')}₫</td>
                      <td className="px-6 py-4 text-center">
                        {p.recipe_missing ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-lg text-xs">
                            <AlertCircle size={12} /> Thiếu BOM
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs">
                            <CheckCircle size={12} /> Đã có BOM
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => navigate('/recipes', { state: { selectProductId: p.id } })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-emerald-600 hover:text-white dark:bg-slate-800 rounded-lg text-xs transition-all"
                        >
                          <span>Định lượng</span> <ArrowRight size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredProducts.length === 0 && !prodLoading && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">Không tìm thấy sản phẩm nào khớp với bộ lọc.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* MOBILE LIST */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {prodLoading ? (
                <p className="text-center text-slate-400 py-6 text-xs">Đang tải sản phẩm...</p>
              ) : filteredProducts.map(p => (
                <div key={p.id} className="p-4 space-y-2 text-xs">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-sm text-slate-850 dark:text-slate-100">{p.item_name}</span>
                    <span className="px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-bold">
                      {p.category || 'Món khác'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Mã iPOS: <span className="font-mono">{p.item_id}</span></span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{(p.price || 0).toLocaleString('vi-VN')}₫</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    {p.recipe_missing ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-lg text-[10px] font-bold">
                        <AlertCircle size={10} /> Thiếu BOM
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-bold">
                        <CheckCircle size={10} /> Đã có BOM
                      </span>
                    )}
                    <button 
                      onClick={() => navigate('/recipes', { state: { selectProductId: p.id } })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold hover:bg-emerald-600 hover:text-white transition-all"
                    >
                      <span>Định lượng</span> <ArrowRight size={10} />
                    </button>
                  </div>
                </div>
              ))}
              {filteredProducts.length === 0 && !prodLoading && (
                <p className="text-center text-slate-450 py-8 text-xs">Không tìm thấy sản phẩm.</p>
              )}
            </div>
          </>
        )}

        {/* TAB 2: INGREDIENTS TABLE */}
        {activeSubTab === 'ingredients' && (
          <>
            {/* DESKTOP TABLE */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-xs">
                    <th className="px-6 py-4">Tên nguyên liệu</th>
                    <th className="px-6 py-4">Đơn vị tính</th>
                    <th className="px-6 py-4 text-right">Đơn giá vốn</th>
                    <th className="px-6 py-4 text-right">Tồn kho hiện tại</th>
                    <th className="px-6 py-4 text-right">Tồn tối thiểu</th>
                    <th className="px-6 py-4">Nhà cung cấp</th>
                    <th className="px-6 py-4 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-semibold">
                  {ingLoading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">Đang nạp danh sách nguyên vật liệu...</td>
                    </tr>
                  ) : filteredIngredients.map(ing => {
                    const isLow = ing.current_stock <= ing.min_stock;
                    
                    return (
                      <tr key={ing.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100">{ing.name}</td>
                        <td className="px-6 py-4 text-slate-400">{ing.unit}</td>
                        <td className="px-6 py-4 text-right text-slate-700 dark:text-slate-350">{(ing.cost_price || 0).toLocaleString('vi-VN')}₫</td>
                        <td className={`px-6 py-4 text-right font-extrabold ${isLow ? 'text-rose-600' : 'text-slate-800 dark:text-slate-100'}`}>
                          {ing.current_stock}
                          {isLow && <span className="text-[9px] font-extrabold bg-rose-100 text-rose-700 dark:bg-rose-950/20 px-1.5 py-0.5 ml-1.5 rounded-full uppercase">HẾT HÀNG</span>}
                        </td>
                        <td className="px-6 py-4 text-right text-slate-400">{ing.min_stock}</td>
                        <td className="px-6 py-4">{suppliers.find(s => s.id === ing.supplier_id)?.name || 'Lẻ'}</td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center gap-2">
                            <button 
                              onClick={() => handleOpenIngModal(ing)}
                              className="p-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white dark:bg-slate-800 rounded-lg text-slate-650 transition-colors"
                            >
                              <Edit size={13} />
                            </button>
                            <button 
                              onClick={() => handleDeleteIngredient(ing.id)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-600 hover:text-white dark:bg-rose-950/20 text-rose-600 rounded-lg transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredIngredients.length === 0 && !ingLoading && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">Không tìm thấy nguyên vật liệu nào khớp.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* MOBILE LIST */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {ingLoading ? (
                <p className="text-center text-slate-400 py-6 text-xs">Đang tải nguyên liệu...</p>
              ) : filteredIngredients.map(ing => {
                const isLow = ing.current_stock <= ing.min_stock;
                return (
                  <div key={ing.id} className="p-4 space-y-2 text-xs">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-100">{ing.name}</span>
                      <span className="text-slate-400">DVT: {ing.unit}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-slate-400">
                      <span>Đơn giá: <span className="font-bold text-slate-700 dark:text-slate-300">{(ing.cost_price || 0).toLocaleString('vi-VN')}₫</span></span>
                      <span>Nhà CC: <span className="font-bold text-slate-650">{suppliers.find(s => s.id === ing.supplier_id)?.name || 'Lẻ'}</span></span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <div className="flex items-center gap-2">
                        <span>Tồn: <span className={`font-extrabold ${isLow ? 'text-rose-600' : 'text-slate-800 dark:text-slate-100'}`}>{ing.current_stock}</span></span>
                        {isLow && <span className="text-[9px] font-extrabold bg-rose-100 text-rose-700 dark:bg-rose-950/20 px-1.5 py-0.5 rounded-full uppercase">Hết</span>}
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleOpenIngModal(ing)}
                          className="p-2 bg-slate-100 hover:bg-blue-650 hover:text-white dark:bg-slate-800 rounded-lg text-slate-650 transition-colors"
                        >
                          <Edit size={12} />
                        </button>
                        <button 
                          onClick={() => handleDeleteIngredient(ing.id)}
                          className="p-2 bg-rose-50 hover:bg-rose-600 hover:text-white dark:bg-rose-950/20 text-rose-600 rounded-lg transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredIngredients.length === 0 && !ingLoading && (
                <p className="text-center text-slate-450 py-8 text-xs">Không tìm thấy nguyên liệu.</p>
              )}
            </div>
          </>
        )}

      </div>

      {/* MODAL: ADD / EDIT INGREDIENT */}
      {ingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-scale-up">
            
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-extrabold text-base text-slate-850 dark:text-slate-100">
                {editingIng ? `Sửa nguyên liệu: ${editingIng.name}` : 'Thêm nguyên liệu kho mới'}
              </h3>
              <button 
                onClick={() => setIngModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit(handleSaveIngredient)}>
              <div className="p-6 space-y-4">
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Tên nguyên liệu *</label>
                  <input 
                    type="text" 
                    placeholder="Ví dụ: Trà Đen Lộc Phát (Gói 1kg)"
                    {...register('name', { required: true })}
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-semibold"
                  />
                  {errors.name && <span className="text-[10px] text-rose-500 font-bold">Vui lòng điền tên nguyên liệu.</span>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Đơn vị tính *</label>
                    <input 
                      type="text" 
                      placeholder="Gói, Chai, Hộp, Túi..."
                      {...register('unit', { required: true })}
                      className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-semibold"
                    />
                    {errors.unit && <span className="text-[10px] text-rose-500 font-bold">Đơn vị không hợp lệ.</span>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Đơn giá gốc nhập kho (₫) *</label>
                    <input 
                      type="number" 
                      placeholder="120000"
                      {...register('cost_price', { required: true, min: 0 })}
                      className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-semibold"
                    />
                    {errors.cost_price && <span className="text-[10px] text-rose-500 font-bold">Vui lòng điền giá gốc.</span>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Tồn kho ban đầu *</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      {...register('current_stock', { required: true, min: 0 })}
                      className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-semibold"
                      disabled={!!editingIng} // block stock modifications directly to enforce Import/Export logs
                    />
                    {errors.current_stock && <span className="text-[10px] text-rose-500 font-bold">Tồn kho không hợp lệ.</span>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Tồn tối thiểu (Cảnh báo) *</label>
                    <input 
                      type="number" 
                      placeholder="5"
                      {...register('min_stock', { required: true, min: 0 })}
                      className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-semibold"
                    />
                    {errors.min_stock && <span className="text-[10px] text-rose-500 font-bold">Tối thiểu không hợp lệ.</span>}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">Nhà cung cấp</label>
                  <select 
                    {...register('supplier_id')}
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs focus:outline-none focus:border-emerald-500 transition-all font-semibold"
                  >
                    <option value="">Chọn nhà cung cấp</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIngModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-350 bg-white dark:bg-slate-900"
                >
                  Hủy
                </button>
                
                <button 
                  type="submit"
                  disabled={ingMutation.isPending}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/25 flex items-center gap-1"
                >
                  Lưu nguyên liệu
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiService } from '../services/api.js';
import { useLocation } from 'react-router-dom';
import { 
  Plus, 
  Trash2, 
  Save, 
  AlertTriangle, 
  Calculator, 
  Percent,
  CheckCircle 
} from 'lucide-react';

export default function Recipes() {
  const queryClient = useQueryClient();
  const location = useLocation();

  // Selected product state
  const [selectedProductId, setSelectedProductId] = useState('');
  // Recipe items building state
  const [recipeItems, setRecipeItems] = useState([]);
  
  // Add new row state
  const [addIngId, setAddIngId] = useState('');
  const [addQty, setAddQty] = useState('');

  // Fetch data
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => ApiService.getProducts()
  });

  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => ApiService.getIngredients()
  });

  const { data: recipes = [] } = useQuery({
    queryKey: ['recipes'],
    queryFn: () => ApiService.getRecipes()
  });

  // Check if a product was passed through navigation state (e.g., redirected from Products page)
  useEffect(() => {
    if (location.state?.selectProductId) {
      setSelectedProductId(String(location.state.selectProductId));
    }
  }, [location.state]);

  // Load existing recipe when selected product changes
  useEffect(() => {
    if (!selectedProductId) {
      setRecipeItems([]);
      return;
    }
    
    const prodId = Number(selectedProductId);
    const recipe = recipes.find(r => r.product_id === prodId && r.active);
    
    if (recipe && recipe.items) {
      setRecipeItems(
        recipe.items.map(it => ({
          ingredient_id: it.ingredient_id,
          quantity: Number(it.quantity)
        }))
      );
    } else {
      setRecipeItems([]);
    }
  }, [selectedProductId, recipes]);

  // Mutation to save recipe
  const saveMutation = useMutation({
    mutationFn: ({ productId, items }) => ApiService.saveRecipe(productId, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
      
      alert('Đã lưu công thức định lượng (BOM) thành công!');
    },
    onError: (err) => {
      alert('Lỗi lưu định lượng: ' + err.message);
    }
  });

  const handleAddIngredient = (e) => {
    e.preventDefault();
    if (!addIngId || !addQty || Number(addQty) <= 0) {
      alert('Vui lòng chọn nguyên liệu và nhập số lượng định lượng hợp lệ!');
      return;
    }

    const ingId = Number(addIngId);
    const qty = Number(addQty);

    // Check duplicate
    if (recipeItems.some(it => it.ingredient_id === ingId)) {
      alert('Nguyên liệu này đã có trong công thức! Vui lòng xóa dòng cũ trước khi thêm.');
      return;
    }

    setRecipeItems([...recipeItems, { ingredient_id: ingId, quantity: qty }]);
    setAddIngId('');
    setAddQty('');
  };

  const handleRemoveItem = (ingId) => {
    setRecipeItems(recipeItems.filter(it => it.ingredient_id !== ingId));
  };

  const handleSaveRecipe = () => {
    if (!selectedProductId) return;
    saveMutation.mutate({
      productId: Number(selectedProductId),
      items: recipeItems
    });
  };

  // Calculations for selected item
  const selectedProduct = products.find(p => p.id === Number(selectedProductId));
  
  let totalBomCost = 0;
  recipeItems.forEach(it => {
    const ing = ingredients.find(i => i.id === it.ingredient_id);
    if (ing) {
      totalBomCost += it.quantity * ing.cost_price;
    }
  });

  const productPrice = selectedProduct?.price || 0;
  const foodCostPct = productPrice > 0 ? (totalBomCost / productPrice) * 100 : 0;
  const profitMargin = productPrice - totalBomCost;

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Công Thức Định Lượng (BOM)</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Cấu hình chi tiết nguyên vật liệu pha chế cho từng cốc nước bán ra từ iPOS.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT: Product Selector & Recipe summary */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* PRODUCT SELECTOR */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400">Chọn món định lượng</h3>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500">Sản phẩm iPOS</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-all font-semibold"
              >
                <option value="">-- Chọn một món ăn / đồ uống --</option>
                {products.map(p => (
                  <option 
                    key={p.id} 
                    value={p.id}
                    className={p.recipe_missing ? 'text-rose-500 font-bold' : 'text-slate-800 dark:text-slate-200'}
                  >
                    {p.item_name} {p.recipe_missing ? ' (Chưa có BOM)' : ' (Đã có BOM)'}
                  </option>
                ))}
              </select>
            </div>

            {selectedProduct && selectedProduct.recipe_missing && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-950/30 rounded-xl flex gap-3 text-xs text-rose-700 dark:text-rose-400">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <p className="font-semibold leading-relaxed">Món này chưa được thiết lập công thức định lượng (BOM). Doanh số bán ra của món này sẽ không tự động trừ nguyên liệu kho cho đến khi cấu hình.</p>
              </div>
            )}
            
            {selectedProduct && !selectedProduct.recipe_missing && (
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-950/30 rounded-xl flex gap-3 text-xs text-emerald-700 dark:text-emerald-400">
                <CheckCircle size={16} className="shrink-0 mt-0.5" />
                <p className="font-semibold leading-relaxed">Đã cấu hình định lượng thành công. Hệ thống tự động trừ kho nguyên liệu khi đồng bộ doanh số bán ra.</p>
              </div>
            )}
          </div>

          {/* FINANCIAL SUMMARY */}
          {selectedProduct && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Calculator size={16} /> Chỉ số dự tính Food Cost
              </h3>
              
              <div className="divide-y divide-slate-100 dark:divide-slate-800 space-y-3">
                
                <div className="flex justify-between items-center text-xs font-semibold py-1.5 first:pt-0">
                  <span className="text-slate-400">Giá bán iPOS:</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-100">{(selectedProduct.price || 0).toLocaleString('vi-VN')}₫</span>
                </div>

                <div className="flex justify-between items-center text-xs font-semibold py-2">
                  <span className="text-slate-400">Chi phí nguyên liệu (BOM Cost):</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-100">{totalBomCost.toLocaleString('vi-VN')}₫</span>
                </div>

                <div className="flex justify-between items-center text-xs font-semibold py-2">
                  <span className="text-slate-400">Tỷ lệ Food Cost của món:</span>
                  <span className={`font-extrabold text-sm ${foodCostPct > 35 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {foodCostPct.toFixed(1)}%
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs font-semibold py-2 last:pb-0">
                  <span className="text-slate-400">Biên lợi nhuận gộp ước tính:</span>
                  <span className="font-extrabold text-emerald-600">{profitMargin.toLocaleString('vi-VN')}₫</span>
                </div>

              </div>
            </div>
          )}

        </div>

        {/* RIGHT: Recipe Ingredients List builder */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
          <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4">
            <h3 className="font-extrabold text-base">
              {selectedProduct ? `Chi tiết định lượng: ${selectedProduct.item_name}` : 'Chi tiết công thức định lượng'}
            </h3>
            {selectedProduct && (
              <button 
                onClick={handleSaveRecipe}
                className="flex items-center gap-1.5 px-4.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-emerald-600/25 transition-all"
              >
                <Save size={14} /> Lưu công thức
              </button>
            )}
          </div>

          {!selectedProductId ? (
            <div className="py-20 text-center text-slate-400 font-semibold">
              Vui lòng chọn một sản phẩm ở cột bên trái để bắt đầu thiết lập công thức định lượng.
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Form to add item */}
              <form onSubmit={handleAddIngredient} className="bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px] space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase">Nguyên liệu</label>
                  <select 
                    value={addIngId}
                    onChange={(e) => setAddIngId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs focus:outline-none focus:border-emerald-500 font-semibold"
                  >
                    <option value="">-- Chọn nguyên liệu --</option>
                    {ingredients.map(ing => (
                      <option key={ing.id} value={ing.id}>{ing.name} (Tồn: {ing.current_stock} {ing.unit})</option>
                    ))}
                  </select>
                </div>

                <div className="w-28 space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase">Số lượng sử dụng</label>
                  <input 
                    type="number" 
                    step="0.0001"
                    min="0.0001"
                    placeholder="0.120"
                    value={addQty}
                    onChange={(e) => setAddQty(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs focus:outline-none focus:border-emerald-500 text-center font-bold"
                  />
                </div>

                <div className="w-20 text-slate-400 font-bold text-xs pb-3 shrink-0">
                  {addIngId ? ingredients.find(i => i.id === Number(addIngId))?.unit : ''}
                </div>

                <button 
                  type="submit"
                  className="px-4.5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shrink-0"
                >
                  <Plus size={14} /> Thêm
                </button>
              </form>

              {/* Table of items */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="px-5 py-3">Nguyên liệu</th>
                      <th className="px-5 py-3 text-center">Định lượng (BOM Qty)</th>
                      <th className="px-5 py-3">Đơn vị</th>
                      <th className="px-5 py-3 text-right">Đơn giá vốn</th>
                      <th className="px-5 py-3 text-right">Thành tiền</th>
                      <th className="px-5 py-3 text-center">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                    {recipeItems.map(item => {
                      const ing = ingredients.find(i => i.id === item.ingredient_id);
                      if (!ing) return null;

                      const itemCost = item.quantity * ing.cost_price;

                      return (
                        <tr key={item.ingredient_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="px-5 py-3 font-bold text-slate-800 dark:text-slate-100">{ing.name}</td>
                          <td className="px-5 py-3 text-center font-bold text-slate-800 dark:text-slate-200">{item.quantity}</td>
                          <td className="px-5 py-3 text-slate-400">{ing.unit}</td>
                          <td className="px-5 py-3 text-right">{(ing.cost_price || 0).toLocaleString('vi-VN')}₫</td>
                          <td className="px-5 py-3 text-right text-emerald-600 font-bold">{itemCost.toLocaleString('vi-VN')}₫</td>
                          <td className="px-5 py-3 text-center">
                            <button 
                              onClick={() => handleRemoveItem(item.ingredient_id)}
                              className="p-1.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {recipeItems.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">Công thức trống. Hãy thêm nguyên liệu ở ô phía trên.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}

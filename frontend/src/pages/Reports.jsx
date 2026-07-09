import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiService } from '../services/api.js';
import { 
  FileDown, 
  Printer, 
  BarChart2, 
  Calendar, 
  DollarSign, 
  Layers 
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import * as XLSX from 'xlsx';

export default function Reports() {
  const [type, setType] = useState('inventory');
  const [range, setRange] = useState('month');

  // Fetch all databases for reports compile
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => ApiService.getProducts()
  });

  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => ApiService.getIngredients()
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

  const { data: counts = [] } = useQuery({
    queryKey: ['counts'],
    queryFn: () => ApiService.getCounts()
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => ApiService.getSuppliers()
  });

  // Calculate Date Filters
  const getFilterDates = () => {
    let start = new Date(0);
    const end = new Date();
    const today = new Date();

    if (range === 'today') {
      start = new Date(today.setHours(0, 0, 0, 0));
    } else if (range === 'week') {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(today.setDate(diff));
      start.setHours(0, 0, 0, 0);
    } else if (range === 'month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    }
    return { start, end };
  };

  const { start, end } = getFilterDates();

  // Excel export wrapper using SheetJS
  const handleExportExcel = () => {
    const tableElement = document.getElementById('report-table-el');
    if (!tableElement) return;

    const workbook = XLSX.utils.table_to_book(tableElement, { sheet: 'Báo cáo' });
    XLSX.writeFile(workbook, `Bao_Cao_${type}_${Date.now()}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  // Compile Report Contents
  let reportTitle = '';
  let chartTitle = '';
  let tableHeaders = [];
  let tableRows = [];
  let totalValueLabel = '';
  
  let chartData = [];
  const COLORS = ['#10b981', '#3b82f6', '#f97316', '#ef4444', '#8b5cf6', '#ec4899', '#eab308'];

  if (type === 'inventory') {
    reportTitle = 'BÁO CÁO GIÁ TRỊ TỒN KHO CHI TIẾT';
    chartTitle = 'Cơ cấu giá trị tồn kho theo nhóm nguyên liệu';
    tableHeaders = ['Tên nguyên liệu', 'Tồn kho hiện tại', 'Đơn vị', 'Đơn giá vốn', 'Tổng giá trị tồn', 'Mức tồn tối thiểu', 'Trạng thái'];
    
    let totalInv = 0;
    const catMap = {};

    ingredients.forEach(i => {
      const val = i.current_stock * i.cost_price;
      totalInv += val;

      const isLow = i.current_stock <= i.min_stock;
      const statusText = isLow ? 'Cảnh báo hết' : 'An toàn';
      
      tableRows.push({
        id: i.id,
        cells: [
          i.name,
          i.current_stock,
          i.unit,
          i.cost_price.toLocaleString('vi-VN') + '₫',
          val.toLocaleString('vi-VN') + '₫',
          i.min_stock,
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isLow ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>{statusText}</span>
        ]
      });

      // compile chart grouping
      const cat = i.unit || 'Nguyên liệu khác';
      catMap[cat] = (catMap[cat] || 0) + val;
    });

    chartData = Object.keys(catMap).map(key => ({ name: key, value: catMap[key] }));
    totalValueLabel = `Tổng giá trị tài sản tồn kho: ${totalInv.toLocaleString('vi-VN')}₫`;
  } 
  
  else if (type === 'imports') {
    reportTitle = 'BÁO CÁO PHIẾU NHẬP KHO NGUYÊN LIỆU';
    chartTitle = 'Giá trị mua hàng theo nhà cung cấp';
    tableHeaders = ['Mã phiếu', 'Ngày thực hiện', 'Nhà cung cấp', 'Số mặt hàng', 'Tổng chi phí nhập', 'Ghi chú'];
    
    let totalImp = 0;
    const supMap = {};

    imports.forEach(imp => {
      const impDate = new Date(imp.created_at || '');
      if (impDate >= start && impDate <= end) {
        totalImp += imp.total_cost;
        const supName = suppliers.find(s => s.id === imp.supplier_id)?.name || 'Nhà cung cấp lẻ';
        
        tableRows.push({
          id: imp.id,
          cells: [
            `#${imp.id}`,
            impDate.toLocaleString('vi-VN'),
            supName,
            imp.items?.length || 0,
            imp.total_cost.toLocaleString('vi-VN') + '₫',
            imp.note || '-'
          ]
        });

        supMap[supName] = (supMap[supName] || 0) + imp.total_cost;
      }
    });

    chartData = Object.keys(supMap).map(key => ({ name: key, value: supMap[key] }));
    totalValueLabel = `Tổng chi nhập kho trong kỳ: ${totalImp.toLocaleString('vi-VN')}₫`;
  }

  else if (type === 'exports') {
    reportTitle = 'BÁO CÁO PHIẾU XUẤT KHO VÀ HAO HỤT';
    chartTitle = 'Cơ cấu lý do hao hụt xuất kho';
    tableHeaders = ['Mã phiếu', 'Ngày xuất', 'Nhân viên thực hiện', 'Số mặt hàng', 'Giá trị vốn tiêu hao', 'Ghi chú'];

    let totalExp = 0;
    const reasonMap = {};

    exportsList.forEach(exp => {
      const expDate = new Date(exp.created_at || '');
      if (expDate >= start && expDate <= end) {
        totalExp += exp.total_value;

        tableRows.push({
          id: exp.id,
          cells: [
            `#${exp.id}`,
            expDate.toLocaleString('vi-VN'),
            'Lê Nhân Viên Kho',
            exp.items?.length || 0,
            exp.total_value.toLocaleString('vi-VN') + '₫',
            exp.note || '-'
          ]
        });

        exp.items?.forEach(it => {
          const reasonText = it.reason === 'Waste' ? 'Hao hụt/Hủy hỏng' : it.reason === 'Internal Use' ? 'Nội bộ' : 'Khác';
          reasonMap[reasonText] = (reasonMap[reasonText] || 0) + (it.total_cost || it.quantity * it.unit_cost);
        });
      }
    });

    chartData = Object.keys(reasonMap).map(key => ({ name: key, value: reasonMap[key] }));
    totalValueLabel = `Tổng giá trị vốn xuất tiêu hao: ${totalExp.toLocaleString('vi-VN')}₫`;
  }

  else if (type === 'counts') {
    reportTitle = 'BÁO CÁO CHÊNH LỆCH KIỂM KHO';
    chartTitle = 'Chênh lệch kiểm kho theo đợt kiểm kê';
    tableHeaders = ['Mã kiểm kho', 'Thời gian bàn giao', 'Nhân viên ca', 'Tổng chênh lệch dư', 'Tổng chênh lệch hụt', 'Số dư chênh lệch ròng'];

    let netDiff = 0;

    counts.forEach(cnt => {
      const cntDate = new Date(cnt.created_at || cnt.date);
      if (cntDate >= start && cntDate <= end) {
        let cntLoss = 0;
        let cntExcess = 0;
        
        cnt.items?.forEach(it => {
          if (it.difference_cost < 0) cntLoss += Math.abs(it.difference_cost);
          if (it.difference_cost > 0) cntExcess += it.difference_cost;
        });

        const cntNet = cntExcess - cntLoss;
        netDiff += cntNet;

        tableRows.push({
          id: cnt.id,
          cells: [
            `#${cnt.id}`,
            cntDate.toLocaleString('vi-VN'),
            'Lê Nhân Viên Kho',
            `+${cntExcess.toLocaleString('vi-VN')}₫`,
            `-${cntLoss.toLocaleString('vi-VN')}₫`,
            <span className={`font-bold ${cntNet >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
              {cntNet >= 0 ? '+' : ''}{cntNet.toLocaleString('vi-VN')}₫
            </span>
          ]
        });

        chartData.push({
          name: `Phiếu #${cnt.id}`,
          value: cntNet
        });
      }
    });

    totalValueLabel = `Số dư ròng chênh lệch kiểm kê: ${netDiff >= 0 ? '+' : ''}${netDiff.toLocaleString('vi-VN')}₫`;
  }

  return (
    <div className="space-y-6 animate-fade-in print:bg-white print:text-black">
      
      {/* HEADER (Hidden in Print) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Báo Cáo Thống Kê</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Phân tích chuyên sâu chi phí nguyên liệu, giá trị tồn kho và hao hụt ca.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={handlePrint}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold bg-white dark:bg-slate-900"
          >
            <Printer size={16} /> In PDF
          </button>
          
          <button 
            onClick={handleExportExcel}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/25 transition-all"
          >
            <FileDown size={16} /> Xuất Excel báo cáo
          </button>
        </div>
      </div>

      {/* FILTER CONTROLS (Hidden in Print) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm print:hidden">
        <div className="flex flex-wrap gap-4 items-center">
          
          <div className="space-y-1.5 flex-1 min-w-[200px]">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase flex items-center gap-1"><Layers size={10} /> Phân hệ báo cáo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-all font-semibold"
            >
              <option value="inventory">Báo cáo tồn kho hiện tại</option>
              <option value="imports">Báo cáo nhập kho nguyên liệu</option>
              <option value="exports">Báo cáo xuất kho & hao hụt</option>
              <option value="counts">Báo cáo chênh lệch kiểm kho</option>
            </select>
          </div>

          <div className="space-y-1.5 w-48">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase flex items-center gap-1"><Calendar size={10} /> Kỳ báo cáo</label>
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-all font-semibold"
            >
              <option value="today">Hôm nay</option>
              <option value="week">Tuần này</option>
              <option value="month">Tháng này</option>
              <option value="all">Tất cả thời gian</option>
            </select>
          </div>

          <div className="self-end pb-1.5 text-xs font-bold text-slate-400">
            Từ: {start.toLocaleDateString('vi-VN')} đến: {end.toLocaleDateString('vi-VN')}
          </div>

        </div>
      </div>

      {/* CHARTS CONTAINER (Hidden in Print) */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm lg:col-span-2">
            <h3 className="font-extrabold text-sm uppercase tracking-wide text-slate-500 mb-4 flex items-center gap-2">
              <BarChart2 size={16} /> {chartTitle}
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <Tooltip formatter={(value) => [`${value.toLocaleString()}₫`]} />
                  <Bar dataKey="value" name="Giá trị (VND)" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <h3 className="font-extrabold text-sm uppercase tracking-wide text-slate-500 mb-4 flex items-center gap-2">
              <Layers size={16} /> Tỷ trọng cơ cấu
            </h3>
            <div className="h-44 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value.toLocaleString()}₫`]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 mt-2 max-h-[100px] overflow-y-auto pr-1">
              {chartData.map((entry, index) => (
                <div key={entry.name} className="flex justify-between items-center text-[11px] font-semibold">
                  <span className="flex items-center gap-2 truncate max-w-[150px]">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="truncate">{entry.name}</span>
                  </span>
                  <span className="text-slate-500">{entry.value.toLocaleString('vi-VN')}₫</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* REPORT PRINT HEADER (Only visible in Print) */}
      <div className="hidden print:block text-center border-b pb-4 mb-6">
        <h2 className="font-extrabold text-xl">ĐÁ XAY & TRÀ SỮA TƯƠI CÁT TƯỜNG</h2>
        <p className="text-xs text-slate-500 mt-1">120 Lý Thường Kiệt, Q.10, TP.HCM | SĐT: 0901234567</p>
        <hr className="my-3 border-black" />
        <h3 className="font-extrabold text-lg tracking-wide uppercase mt-4">{reportTitle}</h3>
        <p className="text-xs text-slate-400 mt-1">Kỳ báo cáo: Từ {start.toLocaleDateString('vi-VN')} đến {end.toLocaleDateString('vi-VN')}</p>
      </div>

      {/* DYNAMIC REPORT DATA TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden print:border-0 print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse print:text-black print:border" id="report-table-el">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider print:bg-slate-100 print:text-black print:border-b">
                {tableHeaders.map((h, idx) => (
                  <th key={idx} className="px-5 py-3.5 print:border-r last:print:border-0">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold print:text-black">
              {tableRows.map(row => (
                <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 print:hover:bg-white print:border-b">
                  {row.cells.map((cell, idx) => (
                    <td key={idx} className="px-5 py-3 print:border-r last:print:border-0">{cell}</td>
                  ))}
                </tr>
              ))}
              <tr className="bg-slate-50 dark:bg-slate-900/50 font-extrabold text-sm border-t border-slate-200 dark:border-slate-800 print:bg-slate-100 print:border-t-2">
                <td colSpan={tableHeaders.length - 2} className="px-5 py-4 flex items-center gap-2"><DollarSign size={16} /> KẾT LUẬN TỔNG HỢP:</td>
                <td colSpan={2} className="px-5 py-4 text-right text-emerald-600 dark:text-emerald-400 font-extrabold text-base print:text-black">
                  {totalValueLabel.split(': ')[1]}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

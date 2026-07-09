/**
 * Core Application Logic for Beverage Shop Inventory Management
 * Handles routing, UI rendering, calculations, charting, Excel import/export,
 * barcode scanner integration, and permission security.
 */

const App = {
  currentUser: null,
  activeTab: 'dashboard',
  theme: 'light',
  
  // Cart variables
  importCart: [],
  exportCart: [],
  
  // Charts instances
  movementChart: null,
  reportChart: null,
  reportPieChart: null,
  
  // Scanner state
  html5QrScanner: null,
  scannerTargetInputId: null,

  // INIT
  init() {
    // Load state
    this.theme = localStorage.getItem('kho_theme') || 'light';
    document.documentElement.setAttribute('data-theme', this.theme);
    this.updateThemeIcon();

    // Check user session
    this.currentUser = DB.getCurrentUser();
    if (!this.currentUser) {
      // Default to admin if somehow empty
      const adminUser = DB.getUsers().find(u => u.role === 'admin');
      DB.setCurrentUser(adminUser);
      this.currentUser = adminUser;
    }

    // Bind event listeners
    this.initEventListeners();

    // Load initial UI
    this.refreshUserUI();
    this.switchTab(this.activeTab);
    
    // Auto alerts check
    this.checkLowStockAlerts();
  },

  initEventListeners() {
    // Listen for theme changes, global search, and escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
    });

    // Close dropdowns if click outside
    document.addEventListener('click', (e) => {
      const popover = document.getElementById('role-switcher-popover');
      const dropdown = document.getElementById('user-dropdown');
      if (popover && popover.style.display === 'block' && !e.target.closest('.user-dropdown')) {
        popover.style.display = 'none';
      }

      const notifDropdown = document.getElementById('notif-dropdown');
      if (notifDropdown && notifDropdown.style.display === 'block' && !e.target.closest('#notif-btn')) {
        notifDropdown.style.display = 'none';
      }
    });
  },

  // USER PERMISSIONS & ROLE SWAPPER
  refreshUserUI() {
    if (!this.currentUser) return;
    
    // Header user info
    document.getElementById('header-user-name').innerText = this.currentUser.fullname;
    document.getElementById('header-user-role').innerText = this.currentUser.role.toUpperCase();
    document.getElementById('header-user-avatar').innerText = this.currentUser.fullname.charAt(0).toUpperCase();

    // Apply role-based sidebar restrictions
    const menuItems = document.querySelectorAll('.sidebar-menu li');
    menuItems.forEach(item => {
      const tab = item.getAttribute('data-tab');
      if (this.isTabRestricted(tab, this.currentUser.role)) {
        item.style.display = 'none';
      } else {
        item.style.display = 'block';
      }
    });

    // Show greetings on dashboard
    const hours = new Date().getHours();
    let greet = 'Chào buổi sáng!';
    if (hours >= 12 && hours < 18) greet = 'Chào buổi chiều!';
    if (hours >= 18) greet = 'Chào buổi tối!';
    document.getElementById('dash-greeting').innerText = `${greet}, ${this.currentUser.fullname}`;
  },

  isTabRestricted(tab, role) {
    if (role === 'admin') return false; // Admin has full access
    
    if (role === 'manager') {
      // Manager has access to everything except users-management & general settings
      return (tab === 'users' || tab === 'settings');
    }
    
    if (role === 'staff') {
      // Staff only has access to Import, Export, Counts, Settings (just for backup, but hide settings tab for them anyway)
      return (tab === 'dashboard' || tab === 'products' || tab === 'reports' || tab === 'users' || tab === 'settings');
    }
    
    return true;
  },

  toggleRoleSwitcher() {
    const popover = document.getElementById('role-switcher-popover');
    popover.style.display = popover.style.display === 'none' ? 'block' : 'none';
  },

  changeRole(userId) {
    const users = DB.getUsers();
    const user = users.find(u => u.id === userId);
    if (user) {
      DB.setCurrentUser(user);
      this.currentUser = user;
      this.refreshUserUI();
      this.showToast(`Đã chuyển sang vai trò: ${user.fullname} (${user.role.toUpperCase()})`, 'success');
      
      // Redirect to a visible tab if current is hidden
      if (this.isTabRestricted(this.activeTab, user.role)) {
        if (user.role === 'staff') {
          this.switchTab('counts');
        } else {
          this.switchTab('dashboard');
        }
      } else {
        this.switchTab(this.activeTab); // Reload active tab with new permissions
      }
    }
    document.getElementById('role-switcher-popover').style.display = 'none';
  },

  // ROUTING & TAB SWITCHER
  switchTab(tabId) {
    if (this.isTabRestricted(tabId, this.currentUser.role)) {
      this.showToast('Bạn không có quyền truy cập vào phân hệ này!', 'error');
      return;
    }

    this.activeTab = tabId;
    
    // Update sidebar UI
    const menuItems = document.querySelectorAll('.sidebar-menu li');
    menuItems.forEach(item => {
      if (item.getAttribute('data-tab') === tabId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Toggle view elements
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(sec => {
      if (sec.id === `${tabId}-section`) {
        sec.classList.add('active');
      } else {
        sec.classList.remove('active');
      }
    });

    // Close sidebar on mobile after tab switch
    document.getElementById('app-sidebar').classList.remove('active');

    // Trigger tab specific load actions
    this.onTabLoaded(tabId);
  },

  onTabLoaded(tabId) {
    if (tabId === 'dashboard') {
      this.renderDashboard();
    } else if (tabId === 'products') {
      this.renderProducts();
    } else if (tabId === 'imports') {
      this.renderImports();
    } else if (tabId === 'exports') {
      this.renderExports();
    } else if (tabId === 'counts') {
      this.renderCounts();
    } else if (tabId === 'reports') {
      this.renderReports();
    } else if (tabId === 'users') {
      this.renderUsers();
    } else if (tabId === 'settings') {
      this.renderSettings();
    }
  },

  toggleSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    sidebar.classList.toggle('active');
  },

  // THEME (Light/Dark)
  toggleTheme() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', this.theme);
    localStorage.setItem('kho_theme', this.theme);
    this.updateThemeIcon();
    
    // Re-render charts to look nice in dark mode
    if (this.activeTab === 'dashboard') {
      this.renderDashboardCharts();
    } else if (this.activeTab === 'reports') {
      this.renderReportCharts();
    }
  },

  updateThemeIcon() {
    const icon = document.getElementById('theme-icon');
    if (this.theme === 'dark') {
      icon.className = 'fa-solid fa-sun';
      icon.style.color = '#eab308';
    } else {
      icon.className = 'fa-solid fa-moon';
      icon.style.color = 'var(--text-main)';
    }
  },

  // GLOBAL SEARCH BAR
  handleGlobalSearch(query) {
    if (!query) return;
    
    // Search is dynamic based on what tab we are in
    if (this.activeTab === 'products') {
      document.getElementById('prod-search-input').value = query;
      this.filterProducts();
    } else if (this.activeTab === 'counts') {
      document.getElementById('count-search-input').value = query;
      this.filterCountProducts(query);
    } else {
      // If we are elsewhere, redirect to products tab and search there
      if (this.currentUser.role !== 'staff') {
        this.switchTab('products');
        document.getElementById('prod-search-input').value = query;
        this.filterProducts();
      } else {
        this.switchTab('counts');
        document.getElementById('count-search-input').value = query;
        this.filterCountProducts(query);
      }
    }
  },

  // TOAST ALERTS
  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-circle-exclamation';
    if (type === 'warning') icon = 'fa-triangle-exclamation';

    toast.innerHTML = `
      <i class="fa-solid ${icon}"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    
    // Remove toast after 3.5s
    setTimeout(() => {
      toast.style.animation = 'slideIn 0.3s reverse';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3200);
  },

  // LOW STOCK SYSTEM ALERTS
  checkLowStockAlerts() {
    const products = DB.getProducts();
    const settings = DB.getSettings();
    const warningBuffer = Number(settings.warning_level) || 0;
    
    const lowStockItems = products.filter(p => p.current_stock <= (p.min_stock + warningBuffer));
    const badge = document.getElementById('notif-badge');
    const notifCount = document.getElementById('notif-count');
    const notifList = document.getElementById('notif-list');
    
    if (lowStockItems.length > 0) {
      badge.style.display = 'block';
      notifCount.innerText = lowStockItems.length;
      
      notifList.innerHTML = lowStockItems.map(p => {
        const isCritical = p.current_stock <= p.min_stock;
        return `
          <div class="alert-item" style="border-left-color: ${isCritical ? 'var(--red)' : 'var(--orange)'}; background-color: ${isCritical ? 'var(--red-light)' : 'var(--orange-light)'};">
            <div class="alert-item-details">
              <span class="alert-item-title">${p.name}</span>
              <span class="alert-item-sub">Tối thiểu: ${p.min_stock} ${p.unit} - Hiện tại: ${p.current_stock}</span>
            </div>
            <span class="alert-item-qty" style="color: ${isCritical ? 'var(--red)' : 'var(--orange)'}">${p.current_stock} ${p.unit}</span>
          </div>
        `;
      }).join('');
    } else {
      badge.style.display = 'none';
      notifCount.innerText = '0';
      notifList.innerHTML = '<div style="color:var(--text-muted); font-size:13px; text-align:center; padding:20px;">Không có nguyên vật liệu cảnh báo.</div>';
    }
  },

  toggleNotifDropdown() {
    const dropdown = document.getElementById('notif-dropdown');
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
  },

  // ==========================================
  // 1. DASHBOARD TAB
  // ==========================================
  renderDashboard() {
    const products = DB.getProducts();
    const settings = DB.getSettings();
    const warningBuffer = Number(settings.warning_level) || 0;

    // Total cost and items
    let totalValue = 0;
    let totalItems = products.length;
    products.forEach(p => {
      totalValue += (Number(p.current_stock) || 0) * (Number(p.cost_price) || 0);
    });

    document.getElementById('stat-total-value').innerText = totalValue.toLocaleString('vi-VN') + '₫';
    document.getElementById('stat-total-items').innerText = `${totalItems} nguyên liệu`;

    // Today's imports / exports
    const todayStr = new Date().toISOString().substring(0, 10);
    const imports = DB.getImports();
    const exports = DB.getExports();

    let todayImportValue = 0;
    let todayImportCount = 0;
    imports.forEach(imp => {
      if (imp.date.substring(0, 10) === todayStr) {
        todayImportValue += imp.total_cost;
        todayImportCount++;
      }
    });

    let todayExportValue = 0;
    let todayExportCount = 0;
    exports.forEach(exp => {
      if (exp.date.substring(0, 10) === todayStr) {
        todayExportValue += exp.total_value || 0;
        todayExportCount++;
      }
    });

    document.getElementById('stat-today-imports').innerText = todayImportValue.toLocaleString('vi-VN') + '₫';
    document.getElementById('stat-today-imports-count').innerText = `${todayImportCount} phiếu nhập`;
    document.getElementById('stat-today-exports').innerText = todayExportValue.toLocaleString('vi-VN') + '₫';
    document.getElementById('stat-today-exports-count').innerText = `${todayExportCount} phiếu xuất`;

    // Low stock warnings count
    const lowStockCount = products.filter(p => p.current_stock <= (p.min_stock + warningBuffer)).length;
    document.getElementById('stat-low-stock').innerText = lowStockCount;

    // Compute end of shift differences totals (net discrepancy costs)
    const counts = DB.getCounts();
    let totalLoss = 0; // Negative sum
    let totalExcess = 0; // Positive sum
    counts.forEach(cnt => {
      cnt.items.forEach(item => {
        const diffCost = Number(item.difference_cost) || 0;
        if (diffCost < 0) {
          totalLoss += Math.abs(diffCost);
        } else if (diffCost > 0) {
          totalExcess += diffCost;
        }
      });
    });

    document.getElementById('stat-total-loss').innerText = '-' + totalLoss.toLocaleString('vi-VN') + '₫';
    document.getElementById('stat-total-excess').innerText = '+' + totalExcess.toLocaleString('vi-VN') + '₫';
    
    const netDiff = totalExcess - totalLoss;
    const netDiffEl = document.getElementById('stat-net-difference');
    const netDiffSub = document.getElementById('stat-net-diff-sub');
    
    netDiffEl.innerText = (netDiff >= 0 ? '+' : '') + netDiff.toLocaleString('vi-VN') + '₫';
    if (netDiff > 0) {
      netDiffEl.style.color = 'var(--blue)';
      netDiffSub.innerText = 'Dư thừa ròng (Thu nhập chênh lệch)';
      netDiffSub.className = 'stat-sub positive';
    } else if (netDiff < 0) {
      netDiffEl.style.color = 'var(--red)';
      netDiffSub.innerText = 'Hao hụt ròng (Thất thoát quỹ kho)';
      netDiffSub.className = 'stat-sub negative';
    } else {
      netDiffEl.style.color = 'var(--text-main)';
      netDiffSub.innerText = 'Khớp hoàn toàn';
      netDiffSub.className = 'stat-sub neutral';
    }

    // Render Dashboard Charts
    this.renderDashboardCharts();

    // Render low stock list right inside dashboard
    const dashLowStockList = document.getElementById('dashboard-low-stock-list');
    const lowStockProducts = products.filter(p => p.current_stock <= (p.min_stock + warningBuffer));
    if (lowStockProducts.length === 0) {
      dashLowStockList.innerHTML = '<div style="text-align:center; color:var(--text-muted); font-size:13px; padding-top:40px;">Tất cả nguyên vật liệu đều ở mức an toàn!</div>';
    } else {
      dashLowStockList.innerHTML = lowStockProducts.map(p => {
        const isCritical = p.current_stock <= p.min_stock;
        return `
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding:10px 0;">
            <div style="display:flex; flex-direction:column;">
              <span style="font-weight:600; font-size:14px;">${p.name}</span>
              <span style="font-size:11px; color:var(--text-muted);">NCC: ${this.getSupplierName(p.supplier_id)}</span>
            </div>
            <div style="text-align:right;">
              <span class="badge ${isCritical ? 'badge-red' : 'badge-orange'}">${p.current_stock} / tối thiểu ${p.min_stock} ${p.unit}</span>
            </div>
          </div>
        `;
      }).join('');
    }

    // Render recent logs (max 5 lines)
    const logs = DB.getLogs().slice(0, 5);
    const logTbody = document.getElementById('dashboard-log-tbody');
    logTbody.innerHTML = logs.map(l => `
      <tr>
        <td style="font-size:12px; font-weight:500; color:var(--text-muted);">${new Date(l.timestamp).toLocaleString('vi-VN')}</td>
        <td><strong>${l.user_name}</strong></td>
        <td><span class="badge badge-blue" style="font-size:10px;">${l.action}</span></td>
        <td style="font-size:13px;">${l.details}</td>
      </tr>
    `).join('');
    
    if (logs.length === 0) {
      logTbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">Chưa có ghi chép nhật ký nào.</td></tr>';
    }
  },

  renderDashboardCharts() {
    const isDark = this.theme === 'dark';
    const textColors = isDark ? '#94a3b8' : '#64748b';
    const gridColors = isDark ? '#1e293b' : '#e2e8f0';

    // Sum imports/exports for last 7 days
    const labels = [];
    const importData = [];
    const exportData = [];
    
    const imports = DB.getImports();
    const exports = DB.getExports();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().substring(0, 10);
      
      // format label: DD/MM
      const label = `${d.getDate()}/${d.getMonth() + 1}`;
      labels.push(label);
      
      // sum values
      let impSum = 0;
      imports.forEach(imp => {
        if (imp.date.substring(0, 10) === dateStr) impSum += imp.total_cost;
      });
      importData.push(impSum);

      let expSum = 0;
      exports.forEach(exp => {
        if (exp.date.substring(0, 10) === dateStr) expSum += exp.total_value || 0;
      });
      exportData.push(expSum);
    }

    if (this.movementChart) this.movementChart.destroy();
    
    const ctx = document.getElementById('movementChart').getContext('2d');
    this.movementChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Giá trị Nhập (₫)',
            data: importData,
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34, 197, 94, 0.05)',
            borderWidth: 3,
            tension: 0.3,
            fill: true
          },
          {
            label: 'Giá trị Xuất (₫)',
            data: exportData,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.05)',
            borderWidth: 3,
            tension: 0.3,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: textColors, font: { family: 'Outfit', size: 12 } }
          }
        },
        scales: {
          x: {
            grid: { color: gridColors },
            ticks: { color: textColors, font: { family: 'Outfit' } }
          },
          y: {
            grid: { color: gridColors },
            ticks: { 
              color: textColors, 
              font: { family: 'Outfit' },
              callback: function(value) {
                return value >= 1000 ? (value / 1000) + 'k' : value;
              }
            }
          }
        }
      }
    });
  },

  // ==========================================
  // 2. PRODUCT MANAGEMENT TAB
  // ==========================================
  renderProducts() {
    // Populate filter selectors
    const categories = DB.getCategories();
    const suppliers = DB.getSuppliers();
    
    const catSelect = document.getElementById('prod-filter-category');
    catSelect.innerHTML = '<option value="">-- Tất cả danh mục --</option>' + 
      categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    const supSelect = document.getElementById('prod-filter-supplier');
    supSelect.innerHTML = '<option value="">-- Tất cả nhà cung cấp --</option>' + 
      suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

    // Trigger full rendering of products list
    this.filterProducts();
  },

  filterProducts() {
    const products = DB.getProducts();
    const query = document.getElementById('prod-search-input').value.toLowerCase().trim();
    const catId = document.getElementById('prod-filter-category').value;
    const supId = document.getElementById('prod-filter-supplier').value;
    const stockStatus = document.getElementById('prod-filter-stock').value;
    
    const settings = DB.getSettings();
    const warningBuffer = Number(settings.warning_level) || 0;

    const filtered = products.filter(p => {
      // 1. Name or barcode search
      const matchQuery = !query || p.name.toLowerCase().includes(query) || (p.barcode && p.barcode.includes(query));
      // 2. Category
      const matchCat = !catId || p.category_id === catId;
      // 3. Supplier
      const matchSup = !supId || p.supplier_id === supId;
      // 4. Stock level
      let matchStock = true;
      if (stockStatus === 'low') {
        matchStock = p.current_stock <= (p.min_stock + warningBuffer) && p.current_stock > 0;
      } else if (stockStatus === 'out') {
        matchStock = p.current_stock <= 0;
      } else if (stockStatus === 'ok') {
        matchStock = p.current_stock > (p.min_stock + warningBuffer);
      }

      return matchQuery && matchCat && matchSup && matchStock;
    });

    // Update count indicator
    document.getElementById('prod-count-val').innerText = filtered.length;

    // Render table
    const tbody = document.getElementById('products-tbody');
    tbody.innerHTML = filtered.map(p => {
      const isOut = p.current_stock <= 0;
      const isLow = p.current_stock <= (p.min_stock + warningBuffer);
      
      let stockClass = 'badge-green';
      if (isOut) stockClass = 'badge-red';
      else if (isLow) stockClass = 'badge-orange';

      // Mock image or circular avatar with initials
      const imgHtml = p.image 
        ? `<img src="${p.image}" style="width:36px; height:36px; border-radius:6px; object-fit:cover; border:1px solid var(--border);">`
        : `<div style="width:36px; height:36px; border-radius:6px; background-color:var(--primary-light); color:var(--primary); font-weight:700; display:flex; align-items:center; justify-content:center; font-size:13px;">${p.name.substring(0,2).toUpperCase()}</div>`;

      // Check if user has permission to edit/delete (Admin/Manager only, Staff cannot edit/delete products)
      const actionHtml = (this.currentUser.role === 'staff')
        ? `<span style="font-size:12px; color:var(--text-muted);">N/A</span>`
        : `
          <button class="btn btn-light btn-icon" onclick="App.editProduct('${p.id}')" title="Chỉnh sửa"><i class="fa-solid fa-pen" style="font-size:11px;"></i></button>
          <button class="btn btn-danger btn-icon" onclick="App.deleteProduct('${p.id}')" title="Xóa"><i class="fa-solid fa-trash" style="font-size:11px;"></i></button>
        `;

      return `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap:10px;">
              ${imgHtml}
              <div style="display:flex; flex-direction:column;">
                <span style="font-weight:600;">${p.name}</span>
                <span style="font-size:11px; color:var(--text-muted);">${p.id}</span>
              </div>
            </div>
          </td>
          <td><span class="badge badge-blue" style="text-transform:none;">${this.getCategoryName(p.category_id)}</span></td>
          <td>${p.unit}</td>
          <td style="text-align:right;">${p.beginning_stock}</td>
          <td style="text-align:right; font-weight:800;">
            <span class="badge ${stockClass}">${p.current_stock}</span>
          </td>
          <td style="text-align:right; color:var(--text-muted);">${p.min_stock}</td>
          <td style="text-align:right; font-weight:600;">${p.cost_price.toLocaleString('vi-VN')}₫</td>
          <td>${this.getSupplierName(p.supplier_id)}</td>
          <td style="font-family:monospace; font-size:12px;">${p.barcode || '-'}</td>
          <td style="text-align:center;">
            <div style="display:flex; gap:6px; justify-content:center;">
              ${actionHtml}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:var(--text-muted); padding:30px;">Không tìm thấy sản phẩm nào khớp với điều kiện lọc.</td></tr>`;
    }
  },

  // Helpers to get relations
  getCategoryName(id) {
    const c = DB.getCategories().find(item => item.id === id);
    return c ? c.name : 'Khác';
  },

  getSupplierName(id) {
    const s = DB.getSuppliers().find(item => item.id === id);
    return s ? s.name : 'Nhà cung cấp lẻ';
  },

  // PRODUCT DIALOG
  openProductModal(prodId = null) {
    // Populate Select elements inside modal
    const catSelect = document.getElementById('prod-category');
    catSelect.innerHTML = DB.getCategories().map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    const supSelect = document.getElementById('prod-supplier');
    supSelect.innerHTML = DB.getSuppliers().map(s => `<option value="${s.id}">${s.name}</option>`).join('');

    const form = document.getElementById('product-form');
    form.reset();
    document.getElementById('prod-id').value = '';
    document.getElementById('prod-image-preview-container').style.display = 'none';

    if (prodId) {
      // Edit mode
      const p = DB.getProducts().find(item => item.id === prodId);
      if (p) {
        document.getElementById('product-modal-title').innerText = 'Chỉnh sửa thông tin sản phẩm';
        document.getElementById('prod-id').value = p.id;
        document.getElementById('prod-name').value = p.name;
        document.getElementById('prod-category').value = p.category_id;
        document.getElementById('prod-supplier').value = p.supplier_id;
        document.getElementById('prod-unit').value = p.unit;
        document.getElementById('prod-barcode').value = p.barcode || '';
        document.getElementById('prod-beginning').value = p.beginning_stock;
        document.getElementById('prod-beginning').disabled = true; // Cannot edit beginning stock after creation to preserve logs
        document.getElementById('prod-min').value = p.min_stock;
        document.getElementById('prod-cost').value = p.cost_price;
        document.getElementById('prod-selling').value = p.selling_price || '';
        document.getElementById('prod-image-url').value = p.image || '';
        document.getElementById('prod-note').value = p.note || '';

        if (p.image) {
          const imgPreview = document.getElementById('prod-image-preview');
          imgPreview.src = p.image;
          document.getElementById('prod-image-preview-container').style.display = 'block';
        }
      }
    } else {
      // Add mode
      document.getElementById('product-modal-title').innerText = 'Thêm sản phẩm mới';
      document.getElementById('prod-beginning').disabled = false;
    }

    document.getElementById('product-modal').classList.add('active');
  },

  closeProductModal() {
    document.getElementById('product-modal').classList.remove('active');
  },

  generateMockProductImage() {
    // Generate beautiful random food/beverage ingredient image URL from Unsplash
    const queries = ['beverage', 'tea', 'coffee', 'milk', 'fruit', 'sugar', 'packaging'];
    const randomQuery = queries[Math.floor(Math.random() * queries.length)];
    const mockUrl = `https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=400&auto=format&fit=crop`; // random default coffee photo
    document.getElementById('prod-image-url').value = mockUrl;
    
    const imgPreview = document.getElementById('prod-image-preview');
    imgPreview.src = mockUrl;
    document.getElementById('prod-image-preview-container').style.display = 'block';
  },

  saveProduct(e) {
    e.preventDefault();
    const id = document.getElementById('prod-id').value;
    
    const prodData = {
      name: document.getElementById('prod-name').value.trim(),
      category_id: document.getElementById('prod-category').value,
      supplier_id: document.getElementById('prod-supplier').value,
      unit: document.getElementById('prod-unit').value.trim(),
      barcode: document.getElementById('prod-barcode').value.trim(),
      beginning_stock: Number(document.getElementById('prod-beginning').value) || 0,
      min_stock: Number(document.getElementById('prod-min').value) || 0,
      cost_price: Number(document.getElementById('prod-cost').value) || 0,
      selling_price: Number(document.getElementById('prod-selling').value) || 0,
      image: document.getElementById('prod-image-url').value.trim(),
      note: document.getElementById('prod-note').value.trim()
    };

    if (id) {
      prodData.id = id;
    }

    try {
      DB.saveProduct(prodData);
      this.closeProductModal();
      this.renderProducts();
      this.checkLowStockAlerts();
      this.showToast('Lưu sản phẩm thành công!', 'success');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  deleteProduct(id) {
    if (confirm('Bạn có chắc chắn muốn xóa sản phẩm này? Nhật ký giao dịch sẽ không bị ảnh hưởng nhưng sản phẩm sẽ bị ẩn.')) {
      try {
        if (DB.deleteProduct(id)) {
          this.renderProducts();
          this.checkLowStockAlerts();
          this.showToast('Đã xóa sản phẩm khỏi kho!', 'success');
        }
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    }
  },

  // EXCEL EXPORT (Products list)
  exportProductsToExcel() {
    const products = DB.getProducts();
    const data = products.map(p => ({
      'Mã Sản Phẩm': p.id,
      'Tên Sản Phẩm': p.name,
      'Danh Mục': this.getCategoryName(p.category_id),
      'Nhà Cung Cấp': this.getSupplierName(p.supplier_id),
      'Đơn Vị Tính': p.unit,
      'Tồn Đầu Kỳ': p.beginning_stock,
      'Tồn Kho Hiện Tại': p.current_stock,
      'Tồn Kho Tối Thiểu': p.min_stock,
      'Giá Nhập (VND)': p.cost_price,
      'Giá Bán (VND)': p.selling_price || 0,
      'Mã Vạch / Barcode': p.barcode || '',
      'Ghi Chú': p.note || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sản Phẩm');
    
    // Trigger download
    XLSX.writeFile(workbook, `Danh_Sach_San_Pham_Kho_${Date.now()}.xlsx`);
    DB.log('Xuất Excel', 'Xuất danh sách sản phẩm ra tệp Excel');
    this.showToast('Đã xuất Excel thành công!', 'success');
  },

  // EXCEL IMPORT (Products list)
  triggerExcelImport() {
    document.getElementById('excel-file-input').click();
  },

  handleExcelImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawJson = XLSX.utils.sheet_to_json(sheet);

        if (rawJson.length === 0) {
          throw new Error('Tệp Excel trống hoặc không đúng cấu trúc.');
        }

        // Fetch current categories & suppliers for mapping or automatic insertion
        const categories = DB.getCategories();
        const suppliers = DB.getSuppliers();

        let importedCount = 0;

        rawJson.forEach(row => {
          // Normalize spreadsheet column titles
          const name = row['Tên Sản Phẩm'] || row['Tên'] || row['name'];
          if (!name) return; // Skip invalid row

          // Map or create category
          const catName = row['Danh Mục'] || row['Category'] || 'Khác';
          let cat = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
          if (!cat) {
            cat = DB.saveCategory({ name: catName, description: 'Danh mục tự tạo từ Excel' });
            categories.push(cat); // Add to local memory pool to avoid duplications inside loop
          }

          // Map or create supplier
          const supName = row['Nhà Cung Cấp'] || row['Supplier'] || 'Nhà cung cấp lẻ';
          let sup = suppliers.find(s => s.name.toLowerCase() === supName.toLowerCase());
          if (!sup) {
            sup = DB.saveSupplier({ name: supName, note: 'Nhà cung cấp tự tạo từ Excel' });
            suppliers.push(sup);
          }

          const beginningStock = Number(row['Tồn Đầu Kỳ'] || row['Tồn Đầu'] || row['beginning_stock']) || 0;
          const minStock = Number(row['Tồn Kho Tối Thiểu'] || row['Tồn Tối Thiểu'] || row['min_stock']) || 5;
          const costPrice = Number(row['Giá Nhập (VND)'] || row['Giá Nhập'] || row['cost_price']) || 0;
          const sellingPrice = Number(row['Giá Bán (VND)'] || row['Giá Bán'] || row['selling_price']) || 0;
          const unit = row['Đơn Vị Tính'] || row['Đơn Vị'] || row['unit'] || 'Cái';
          const barcode = String(row['Mã Vạch / Barcode'] || row['Barcode'] || row['Mã Vạch'] || '').trim();
          const note = row['Ghi Chú'] || row['note'] || '';

          const newProd = {
            name: name,
            category_id: cat.id,
            supplier_id: sup.id,
            unit: unit,
            beginning_stock: beginningStock,
            current_stock: beginningStock,
            min_stock: minStock,
            cost_price: costPrice,
            selling_price: sellingPrice,
            barcode: barcode,
            note: note,
            image: ''
          };

          // Save to localstorage
          DB.saveProduct(newProd);
          importedCount++;
        });

        this.renderProducts();
        this.checkLowStockAlerts();
        this.showToast(`Đã nhập thành công ${importedCount} sản phẩm từ file Excel!`, 'success');
        DB.log('Nhập Excel', `Nhập ${importedCount} sản phẩm mới từ tệp Excel tải lên`);
      } catch (err) {
        this.showToast('Lỗi nhập Excel: ' + err.message, 'error');
      }
      
      // Reset input element value to allow re-uploading same file name
      document.getElementById('excel-file-input').value = '';
    };

    reader.readAsArrayBuffer(file);
  },

  // CATEGORIES MODAL MANAGEMENT
  openCategoryModal() {
    this.renderCategoryModalTable();
    document.getElementById('category-form').reset();
    document.getElementById('cat-id').value = '';
    document.getElementById('category-modal').classList.add('active');
  },
  closeCategoryModal() {
    document.getElementById('category-modal').classList.remove('active');
  },
  renderCategoryModalTable() {
    const list = DB.getCategories();
    const tbody = document.getElementById('modal-category-tbody');
    tbody.innerHTML = list.map(c => `
      <tr>
        <td><strong>${c.name}</strong></td>
        <td style="color:var(--text-muted);">${c.description || '-'}</td>
        <td style="text-align:center;">
          <button class="btn btn-danger btn-icon" onclick="App.deleteCategory('${c.id}')"><i class="fa-solid fa-trash" style="font-size:10px;"></i></button>
        </td>
      </tr>
    `).join('');
  },
  saveCategory(e) {
    e.preventDefault();
    const cat = {
      name: document.getElementById('cat-name').value.trim(),
      description: document.getElementById('cat-desc').value.trim()
    };
    try {
      DB.saveCategory(cat);
      this.renderCategoryModalTable();
      this.renderProducts(); // Refresh main products list dropdowns as well
      document.getElementById('category-form').reset();
      this.showToast('Thêm danh mục mới thành công!');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },
  deleteCategory(id) {
    if (confirm('Xác nhận xóa danh mục này?')) {
      try {
        DB.deleteCategory(id);
        this.renderCategoryModalTable();
        this.renderProducts();
        this.showToast('Đã xóa danh mục thành công!');
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    }
  },

  // SUPPLIERS MODAL MANAGEMENT
  openSupplierModal() {
    this.renderSupplierModalTable();
    document.getElementById('supplier-form').reset();
    document.getElementById('sup-id').value = '';
    document.getElementById('supplier-modal').classList.add('active');
  },
  closeSupplierModal() {
    document.getElementById('supplier-modal').classList.remove('active');
  },
  renderSupplierModalTable() {
    const list = DB.getSuppliers();
    const tbody = document.getElementById('modal-supplier-tbody');
    tbody.innerHTML = list.map(s => `
      <tr>
        <td>
          <div style="font-weight:600;">${s.name}</div>
          <div style="font-size:11px; color:var(--text-muted);">${s.note || ''}</div>
        </td>
        <td>
          <div style="font-size:13px;"><i class="fa-solid fa-phone" style="font-size:11px; width:16px;"></i>${s.phone || '-'}</div>
          <div style="font-size:12px; color:var(--text-muted);"><i class="fa-solid fa-envelope" style="font-size:11px; width:16px;"></i>${s.email || '-'}</div>
        </td>
        <td style="font-size:13px; color:var(--text-muted);">${s.address || '-'}</td>
        <td style="text-align:center;">
          <button class="btn btn-danger btn-icon" onclick="App.deleteSupplier('${s.id}')"><i class="fa-solid fa-trash" style="font-size:10px;"></i></button>
        </td>
      </tr>
    `).join('');
  },
  saveSupplier(e) {
    e.preventDefault();
    const sup = {
      name: document.getElementById('sup-name').value.trim(),
      phone: document.getElementById('sup-phone').value.trim(),
      email: document.getElementById('sup-email').value.trim(),
      address: document.getElementById('sup-address').value.trim(),
      note: document.getElementById('sup-note').value.trim()
    };
    try {
      DB.saveSupplier(sup);
      this.renderSupplierModalTable();
      this.renderProducts();
      document.getElementById('supplier-form').reset();
      this.showToast('Lưu thông tin nhà cung cấp thành công!');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },
  deleteSupplier(id) {
    if (confirm('Xác nhận xóa nhà cung cấp này?')) {
      try {
        DB.deleteSupplier(id);
        this.renderSupplierModalTable();
        this.renderProducts();
        this.showToast('Đã xóa nhà cung cấp thành công!');
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    }
  },

  // ==========================================
  // 3. STOCK IMPORT TAB
  // ==========================================
  renderImports() {
    const sups = DB.getSuppliers();
    const supSelect = document.getElementById('import-supplier');
    supSelect.innerHTML = sups.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

    // Clear and build initial cart
    this.importCart = [];
    document.getElementById('import-note').value = '';
    this.addImportCartRow();
    this.updateImportCartSummary();
  },

  addImportCartRow() {
    const products = DB.getProducts();
    if (products.length === 0) {
      this.showToast('Vui lòng thêm sản phẩm vào hệ thống trước!', 'warning');
      return;
    }

    const rowId = 'imp-row-' + Date.now() + Math.random().toString(36).substr(2, 4);
    const defaultProduct = products[0];

    this.importCart.push({
      rowId: rowId,
      product_id: defaultProduct.id,
      quantity: 1,
      unit: defaultProduct.unit,
      unit_cost: defaultProduct.cost_price,
      total_cost: defaultProduct.cost_price
    });

    this.renderImportCartTable();
    this.updateImportCartSummary();
  },

  removeImportCartRow(rowId) {
    if (this.importCart.length <= 1) {
      this.showToast('Phiếu nhập phải có ít nhất 1 sản phẩm!', 'warning');
      return;
    }
    this.importCart = this.importCart.filter(r => r.rowId !== rowId);
    this.renderImportCartTable();
    this.updateImportCartSummary();
  },

  renderImportCartTable() {
    const products = DB.getProducts();
    const tbody = document.getElementById('import-cart-tbody');
    
    tbody.innerHTML = this.importCart.map(row => {
      // Products dropdown options
      const prodOpts = products.map(p => `
        <option value="${p.id}" ${p.id === row.product_id ? 'selected' : ''}>${p.name}</option>
      `).join('');

      return `
        <tr data-row-id="${row.rowId}">
          <td>
            <select class="form-select" onchange="App.handleImportProductChange('${row.rowId}', this.value)" style="width:100%; min-width:200px;">
              ${prodOpts}
            </select>
          </td>
          <td style="text-align:center;">
            <input type="number" class="form-control cart-input-qty" min="1" value="${row.quantity}" oninput="App.handleImportQtyChange('${row.rowId}', this.value)">
          </td>
          <td class="cart-row-unit" style="font-weight:600; color:var(--text-muted);">${row.unit}</td>
          <td style="text-align:right;">
            <input type="number" class="form-control cart-input-price" min="0" value="${row.unit_cost}" oninput="App.handleImportPriceChange('${row.rowId}', this.value)">
          </td>
          <td style="text-align:right; font-weight:700; color:var(--text-main);" class="cart-row-total">
            ${row.total_cost.toLocaleString('vi-VN')}₫
          </td>
          <td style="text-align:center;">
            <button class="btn btn-danger btn-icon btn-sm" onclick="App.removeImportCartRow('${row.rowId}')"><i class="fa-solid fa-trash" style="font-size:10px;"></i></button>
          </td>
        </tr>
      `;
    }).join('');
  },

  handleImportProductChange(rowId, prodId) {
    const products = DB.getProducts();
    const p = products.find(item => item.id === prodId);
    const row = this.importCart.find(r => r.rowId === rowId);
    
    if (p && row) {
      row.product_id = prodId;
      row.unit = p.unit;
      row.unit_cost = p.cost_price;
      row.total_cost = row.quantity * p.cost_price;
      
      // Update DOM directly for responsiveness
      const tr = document.querySelector(`tr[data-row-id="${rowId}"]`);
      tr.querySelector('.cart-row-unit').innerText = p.unit;
      tr.querySelector('.cart-input-price').value = p.cost_price;
      tr.querySelector('.cart-row-total').innerText = row.total_cost.toLocaleString('vi-VN') + '₫';
      
      this.updateImportCartSummary();
    }
  },

  handleImportQtyChange(rowId, qtyStr) {
    const qty = Number(qtyStr) || 0;
    const row = this.importCart.find(r => r.rowId === rowId);
    if (row) {
      row.quantity = qty;
      row.total_cost = qty * row.unit_cost;
      
      const tr = document.querySelector(`tr[data-row-id="${rowId}"]`);
      tr.querySelector('.cart-row-total').innerText = row.total_cost.toLocaleString('vi-VN') + '₫';
      
      this.updateImportCartSummary();
    }
  },

  handleImportPriceChange(rowId, priceStr) {
    const price = Number(priceStr) || 0;
    const row = this.importCart.find(r => r.rowId === rowId);
    if (row) {
      row.unit_cost = price;
      row.total_cost = row.quantity * price;
      
      const tr = document.querySelector(`tr[data-row-id="${rowId}"]`);
      tr.querySelector('.cart-row-total').innerText = row.total_cost.toLocaleString('vi-VN') + '₫';
      
      this.updateImportCartSummary();
    }
  },

  updateImportCartSummary() {
    let totalItems = 0;
    let totalPrice = 0;
    
    this.importCart.forEach(row => {
      totalItems += row.quantity;
      totalPrice += row.total_cost;
    });

    document.getElementById('import-total-items-qty').innerText = totalItems;
    document.getElementById('import-total-price').innerText = totalPrice.toLocaleString('vi-VN') + '₫';
  },

  submitImport() {
    if (this.importCart.length === 0) {
      this.showToast('Vui lòng thêm sản phẩm vào phiếu nhập!', 'warning');
      return;
    }

    const supplierId = document.getElementById('import-supplier').value;
    const note = document.getElementById('import-note').value.trim();
    
    // Check validation
    const hasInvalid = this.importCart.some(r => !r.product_id || r.quantity <= 0 || r.unit_cost < 0);
    if (hasInvalid) {
      this.showToast('Vui lòng kiểm tra lại số lượng hoặc giá trị nhập kho!', 'error');
      return;
    }

    const totalCost = this.importCart.reduce((sum, r) => sum + r.total_cost, 0);

    const importBill = {
      supplier_id: supplierId,
      user_id: this.currentUser.id,
      note: note,
      total_cost: totalCost,
      items: this.importCart.map(r => ({
        product_id: r.product_id,
        quantity: r.quantity,
        unit_cost: r.unit_cost,
        total_cost: r.total_cost
      }))
    };

    try {
      DB.addImport(importBill);
      this.showToast('Nhập kho thành công! Số lượng hàng tồn kho đã được tăng lên.', 'success');
      this.renderImports(); // Clear and reset cart
      this.checkLowStockAlerts();
    } catch (err) {
      this.showToast('Có lỗi xảy ra: ' + err.message, 'error');
    }
  },

  // ==========================================
  // 4. STOCK EXPORT TAB
  // ==========================================
  renderExports() {
    this.exportCart = [];
    document.getElementById('export-note').value = '';
    this.addExportCartRow();
    this.updateExportCartSummary();
  },

  addExportCartRow() {
    const products = DB.getProducts();
    if (products.length === 0) {
      this.showToast('Vui lòng thêm sản phẩm vào hệ thống trước!', 'warning');
      return;
    }

    const rowId = 'exp-row-' + Date.now() + Math.random().toString(36).substr(2, 4);
    const defaultProduct = products[0];

    this.exportCart.push({
      rowId: rowId,
      product_id: defaultProduct.id,
      quantity: 1,
      unit: defaultProduct.unit,
      reason: 'Sale', // Default reason is Sale (Bán hàng)
      unit_cost: defaultProduct.cost_price,
      total_cost: defaultProduct.cost_price
    });

    this.renderExportCartTable();
    this.updateExportCartSummary();
  },

  removeExportCartRow(rowId) {
    if (this.exportCart.length <= 1) {
      this.showToast('Phiếu xuất phải có ít nhất 1 sản phẩm!', 'warning');
      return;
    }
    this.exportCart = this.exportCart.filter(r => r.rowId !== rowId);
    this.renderExportCartTable();
    this.updateExportCartSummary();
  },

  renderExportCartTable() {
    const products = DB.getProducts();
    const tbody = document.getElementById('export-cart-tbody');
    
    tbody.innerHTML = this.exportCart.map(row => {
      const prodOpts = products.map(p => `
        <option value="${p.id}" ${p.id === row.product_id ? 'selected' : ''}>${p.name} (Tồn: ${p.current_stock})</option>
      `).join('');

      return `
        <tr data-row-id="${row.rowId}">
          <td>
            <select class="form-select" onchange="App.handleExportProductChange('${row.rowId}', this.value)" style="width:100%; min-width:200px;">
              ${prodOpts}
            </select>
          </td>
          <td style="text-align:center;">
            <input type="number" class="form-control cart-input-qty" min="1" value="${row.quantity}" oninput="App.handleExportQtyChange('${row.rowId}', this.value)">
          </td>
          <td class="cart-row-unit" style="font-weight:600; color:var(--text-muted);">${row.unit}</td>
          <td>
            <select class="form-select" onchange="App.handleExportReasonChange('${row.rowId}', this.value)">
              <option value="Sale" ${row.reason === 'Sale' ? 'selected' : ''}>Bán hàng</option>
              <option value="Waste" ${row.reason === 'Waste' ? 'selected' : ''}>Hao hụt / Pha chế</option>
              <option value="Internal Use" ${row.reason === 'Internal Use' ? 'selected' : ''}>Tiêu dùng nội bộ</option>
              <option value="Damaged" ${row.reason === 'Damaged' ? 'selected' : ''}>Hủy hàng / Hỏng hóc</option>
              <option value="Other" ${row.reason === 'Other' ? 'selected' : ''}>Lý do khác</option>
            </select>
          </td>
          <td style="text-align:right; font-weight:600; color:var(--text-muted);" class="cart-row-price">
            ${row.unit_cost.toLocaleString('vi-VN')}₫
          </td>
          <td style="text-align:right; font-weight:700; color:var(--text-main);" class="cart-row-total">
            ${row.total_cost.toLocaleString('vi-VN')}₫
          </td>
          <td style="text-align:center;">
            <button class="btn btn-danger btn-icon btn-sm" onclick="App.removeExportCartRow('${row.rowId}')"><i class="fa-solid fa-trash" style="font-size:10px;"></i></button>
          </td>
        </tr>
      `;
    }).join('');
  },

  handleExportProductChange(rowId, prodId) {
    const products = DB.getProducts();
    const p = products.find(item => item.id === prodId);
    const row = this.exportCart.find(r => r.rowId === rowId);
    
    if (p && row) {
      row.product_id = prodId;
      row.unit = p.unit;
      row.unit_cost = p.cost_price;
      row.total_cost = row.quantity * p.cost_price;
      
      const tr = document.querySelector(`tr[data-row-id="${rowId}"]`);
      tr.querySelector('.cart-row-unit').innerText = p.unit;
      tr.querySelector('.cart-row-price').innerText = p.cost_price.toLocaleString('vi-VN') + '₫';
      tr.querySelector('.cart-row-total').innerText = row.total_cost.toLocaleString('vi-VN') + '₫';
      
      // Stock warning indicator if needed
      if (row.quantity > p.current_stock) {
        tr.querySelector('.cart-input-qty').style.borderColor = 'var(--red)';
        this.showToast(`Cảnh báo: Lượng xuất (${row.quantity}) vượt tồn kho hiện tại của ${p.name} (${p.current_stock})!`, 'warning');
      } else {
        tr.querySelector('.cart-input-qty').style.borderColor = 'var(--border)';
      }

      this.updateExportCartSummary();
    }
  },

  handleExportQtyChange(rowId, qtyStr) {
    const qty = Number(qtyStr) || 0;
    const row = this.exportCart.find(r => r.rowId === rowId);
    if (row) {
      const p = DB.getProducts().find(item => item.id === row.product_id);
      row.quantity = qty;
      row.total_cost = qty * row.unit_cost;
      
      const tr = document.querySelector(`tr[data-row-id="${rowId}"]`);
      tr.querySelector('.cart-row-total').innerText = row.total_cost.toLocaleString('vi-VN') + '₫';
      
      if (p && qty > p.current_stock) {
        tr.querySelector('.cart-input-qty').style.borderColor = 'var(--red)';
        this.showToast(`Lượng xuất (${qty}) lớn hơn tồn kho hiện tại của ${p.name} (${p.current_stock})!`, 'error');
      } else {
        tr.querySelector('.cart-input-qty').style.borderColor = 'var(--border)';
      }

      this.updateExportCartSummary();
    }
  },

  handleExportReasonChange(rowId, reason) {
    const row = this.exportCart.find(r => r.rowId === rowId);
    if (row) {
      row.reason = reason;
    }
  },

  updateExportCartSummary() {
    let totalItems = 0;
    let totalPrice = 0;
    
    this.exportCart.forEach(row => {
      totalItems += row.quantity;
      totalPrice += row.total_cost;
    });

    document.getElementById('export-total-items-qty').innerText = totalItems;
    document.getElementById('export-total-price').innerText = totalPrice.toLocaleString('vi-VN') + '₫';
  },

  submitExport() {
    if (this.exportCart.length === 0) {
      this.showToast('Vui lòng thêm sản phẩm vào phiếu xuất!', 'warning');
      return;
    }

    const note = document.getElementById('export-note').value.trim();
    
    // Check validation and stock limits!
    const products = DB.getProducts();
    let hasStockError = false;
    let errorMessage = '';

    for (let i = 0; i < this.exportCart.length; i++) {
      const row = this.exportCart[i];
      const prod = products.find(p => p.id === row.product_id);
      
      if (!row.product_id || row.quantity <= 0) {
        errorMessage = 'Vui lòng kiểm tra lại số lượng xuất kho!';
        hasStockError = true;
        break;
      }

      if (prod && row.quantity > prod.current_stock) {
        errorMessage = `Hàng tồn kho của "${prod.name}" không đủ! Hiện tại chỉ còn: ${prod.current_stock} ${prod.unit}.`;
        hasStockError = true;
        break;
      }
    }

    if (hasStockError) {
      this.showToast(errorMessage, 'error');
      return;
    }

    const exportBill = {
      user_id: this.currentUser.id,
      note: note,
      items: this.exportCart.map(r => ({
        product_id: r.product_id,
        quantity: r.quantity,
        reason: r.reason
      }))
    };

    try {
      DB.addExport(exportBill);
      this.showToast('Xuất kho thành công! Đã tự động giảm số lượng hàng tồn tương ứng.', 'success');
      this.renderExports(); // Clear and reset cart
      this.checkLowStockAlerts();
    } catch (err) {
      this.showToast('Có lỗi xảy ra: ' + err.message, 'error');
    }
  },

  // ==========================================
  // 5. END OF SHIFT INVENTORY TAB (MOST IMPORTANT)
  // ==========================================
  renderCounts() {
    document.getElementById('count-note').value = '';
    this.loadActiveCountData();
  },

  loadActiveCountData() {
    const products = DB.getProducts();
    const imports = DB.getImports();
    const exports = DB.getExports();
    const counts = DB.getCounts();
    
    // Find last count sheet date to define the boundaries of "this shift"
    const lastCount = counts.length > 0 ? counts[counts.length - 1] : null;
    const boundaryDate = lastCount ? new Date(lastCount.date) : new Date(0); // Epoch beginning if no history

    // Build counting list
    const tbody = document.getElementById('count-products-tbody');
    
    tbody.innerHTML = products.map(p => {
      // 1. Calculate Beginning Stock
      let beginning = p.beginning_stock;
      if (lastCount) {
        const lastItem = lastCount.items.find(item => item.product_id === p.id);
        beginning = lastItem ? lastItem.actual_stock : p.current_stock;
      }

      // 2. Sum Imports since boundary date
      let importedQty = 0;
      imports.forEach(imp => {
        if (new Date(imp.date) > boundaryDate) {
          const item = imp.items.find(it => it.product_id === p.id);
          if (item) importedQty += item.quantity;
        }
      });

      // 3. Sum Exports since boundary date
      let exportedQty = 0;
      exports.forEach(exp => {
        if (new Date(exp.date) > boundaryDate) {
          const item = exp.items.find(it => it.product_id === p.id);
          if (item) exportedQty += item.quantity;
        }
      });

      // 4. Expected Stock
      const expected = beginning + importedQty - exportedQty;

      // Prefill actual counted stock to expected, to save time for employees
      const actual = expected; 

      return `
        <tr data-prod-id="${p.id}" class="count-row-correct" data-cost-price="${p.cost_price}">
          <td><strong>${p.name}</strong></td>
          <td><span style="font-size:12px; font-weight:600; color:var(--text-muted);">${this.getCategoryName(p.category_id)}</span></td>
          <td style="text-align:right;" class="cell-beginning">${beginning}</td>
          <td style="text-align:right;" class="cell-imported">${importedQty}</td>
          <td style="text-align:right;" class="cell-exported">${exportedQty}</td>
          <td style="text-align:right; font-weight:700; color:var(--primary);" class="cell-expected">${expected}</td>
          <td style="text-align:center;">
            <input type="number" class="form-control text-center text-bold cell-input-actual" value="${actual}" style="width:85px; font-weight:700; padding:6px;" oninput="App.handleCountActualChange('${p.id}', this.value)">
          </td>
          <td style="font-weight:600; color:var(--text-muted);">${p.unit}</td>
          <td style="text-align:right; font-weight:700;" class="cell-diff diff-correct">0</td>
          <td style="text-align:right; font-weight:700;" class="cell-diff-cost">0₫</td>
        </tr>
      `;
    }).join('');

    this.calculateCountTotals();
  },

  handleCountActualChange(prodId, actualStr) {
    const tr = document.querySelector(`#count-products-tbody tr[data-prod-id="${prodId}"]`);
    if (!tr) return;

    const actual = Number(actualStr) || 0;
    const expected = Number(tr.querySelector('.cell-expected').innerText) || 0;
    const costPrice = Number(tr.getAttribute('data-cost-price')) || 0;

    const diff = actual - expected;
    const diffCost = diff * costPrice;

    // Adjust row CSS class & difference text based on difference status: Correct (green), Missing (red), Excess (blue)
    const diffCell = tr.querySelector('.cell-diff');
    const diffCostCell = tr.querySelector('.cell-diff-cost');

    diffCell.innerText = (diff > 0 ? '+' : '') + diff;
    diffCostCell.innerText = (diffCost >= 0 ? '+' : '') + diffCost.toLocaleString('vi-VN') + '₫';

    // Remove old classes
    tr.className = '';
    diffCell.className = 'cell-diff';

    if (diff < 0) {
      tr.className = 'count-row-missing';
      diffCell.classList.add('diff-missing');
      diffCostCell.style.color = 'var(--red)';
    } else if (diff > 0) {
      tr.className = 'count-row-excess';
      diffCell.classList.add('diff-excess');
      diffCostCell.style.color = 'var(--blue)';
    } else {
      tr.className = 'count-row-correct';
      diffCell.classList.add('diff-correct');
      diffCostCell.style.color = 'var(--text-main)';
    }

    this.calculateCountTotals();
  },

  calculateCountTotals() {
    const rows = document.querySelectorAll('#count-products-tbody tr');
    let totalLoss = 0; // Negative sum
    let totalExcess = 0; // Positive sum

    rows.forEach(tr => {
      const expected = Number(tr.querySelector('.cell-expected').innerText) || 0;
      const actual = Number(tr.querySelector('.cell-input-actual').value) || 0;
      const costPrice = Number(tr.getAttribute('data-cost-price')) || 0;

      const diff = actual - expected;
      const diffCost = diff * costPrice;

      if (diffCost < 0) {
        totalLoss += Math.abs(diffCost);
      } else if (diffCost > 0) {
        totalExcess += diffCost;
      }
    });

    const netDiff = totalExcess - totalLoss;

    document.getElementById('count-total-excess').innerText = '+' + totalExcess.toLocaleString('vi-VN') + '₫';
    document.getElementById('count-total-loss').innerText = '-' + totalLoss.toLocaleString('vi-VN') + '₫';
    
    const netEl = document.getElementById('count-net-difference');
    netEl.innerText = (netDiff >= 0 ? '+' : '') + netDiff.toLocaleString('vi-VN') + '₫';
    
    if (netDiff > 0) {
      netEl.style.color = 'var(--blue)';
    } else if (netDiff < 0) {
      netEl.style.color = 'var(--red)';
    } else {
      netEl.style.color = 'var(--text-main)';
    }
  },

  filterCountProducts(query) {
    const q = query.toLowerCase().trim();
    const rows = document.querySelectorAll('#count-products-tbody tr');
    rows.forEach(tr => {
      const name = tr.querySelector('strong').innerText.toLowerCase();
      if (!q || name.includes(q)) {
        tr.style.display = '';
      } else {
        tr.style.display = 'none';
      }
    });
  },

  submitCount() {
    if (confirm('Xác nhận hoàn tất kiểm kho? Thao tác này sẽ cập nhật tồn kho hệ thống về số lượng thực tế đếm được và ghi vào lịch sử.')) {
      const rows = document.querySelectorAll('#count-products-tbody tr');
      const items = [];
      let totalDiffCost = 0;

      rows.forEach(tr => {
        const prodId = tr.getAttribute('data-prod-id');
        const expected = Number(tr.querySelector('.cell-expected').innerText) || 0;
        const actual = Number(tr.querySelector('.cell-input-actual').value) || 0;
        const costPrice = Number(tr.getAttribute('data-cost-price')) || 0;

        const diff = actual - expected;
        const diffCost = diff * costPrice;

        items.push({
          product_id: prodId,
          expected_stock: expected,
          actual_stock: actual,
          difference: diff,
          cost_price: costPrice,
          difference_cost: diffCost
        });

        totalDiffCost += diffCost;
      });

      const note = document.getElementById('count-note').value.trim();

      const countSheet = {
        user_id: this.currentUser.id,
        note: note,
        items: items,
        total_difference_cost: totalDiffCost
      };

      try {
        DB.addCount(countSheet);
        this.showToast('Bàn giao ca & Kiểm kho hoàn tất thành công!', 'success');
        this.switchTab('dashboard'); // Redirect to dashboard to view update
        this.checkLowStockAlerts();
      } catch (err) {
        this.showToast('Lỗi lưu kiểm kho: ' + err.message, 'error');
      }
    }
  },

  printActiveCountSheet() {
    // Show active count view as print target and trigger print
    const countSection = document.getElementById('counts-section');
    countSection.classList.add('print-visible');
    
    // Set headers
    const settings = DB.getSettings();
    alert("Vui lòng sử dụng tính năng in của trình duyệt (Ctrl+P) để in phiếu kiểm kê này. Sidebar và các nút sẽ tự động ẩn.");
    window.print();
  },

  // ==========================================
  // 6. REPORTS TAB
  // ==========================================
  handleReportRangeChange(range) {
    const customDiv = document.getElementById('report-custom-dates');
    if (range === 'custom') {
      customDiv.style.display = 'flex';
      // Set default dates
      const today = new Date().toISOString().substring(0, 10);
      document.getElementById('report-start-date').value = today;
      document.getElementById('report-end-date').value = today;
    } else {
      customDiv.style.display = 'none';
      this.generateReport();
    }
  },

  generateReport() {
    const type = document.getElementById('report-type').value;
    const range = document.getElementById('report-range').value;
    
    let startDate = new Date(0);
    let endDate = new Date();

    const today = new Date();
    if (range === 'today') {
      startDate = new Date(today.setHours(0, 0, 0, 0));
    } else if (range === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      startDate = new Date(y.setHours(0, 0, 0, 0));
      endDate = new Date(y.setHours(23, 59, 59, 999));
    } else if (range === 'week') {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1); // start from Monday
      startDate = new Date(today.setDate(diff));
      startDate.setHours(0,0,0,0);
    } else if (range === 'month') {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (range === 'custom') {
      startDate = new Date(document.getElementById('report-start-date').value);
      startDate.setHours(0, 0, 0, 0);
      
      endDate = new Date(document.getElementById('report-end-date').value);
      endDate.setHours(23, 59, 59, 999);
    }

    const settings = DB.getSettings();
    
    // Print setup titles
    document.getElementById('print-report-date').innerText = `Kỳ báo cáo: từ ${startDate.toLocaleDateString('vi-VN')} đến ${endDate.toLocaleDateString('vi-VN')}`;
    document.getElementById('print-store-name').innerText = settings.store_name;
    document.getElementById('print-store-address').innerText = settings.address;

    // Route to table building based on report type
    if (type === 'inventory') {
      this.buildInventoryReport(startDate, endDate);
    } else if (type === 'imports') {
      this.buildImportsReport(startDate, endDate);
    } else if (type === 'exports') {
      this.buildExportsReport(startDate, endDate);
    } else if (type === 'counts') {
      this.buildCountsReport(startDate, endDate);
    } else if (type === 'costs') {
      this.buildCostsReport(startDate, endDate);
    }
  },

  buildInventoryReport(start, end) {
    document.getElementById('print-report-title').innerText = 'BÁO CÁO TỒN KHO CHI TIẾT';
    document.getElementById('report-chart-title').innerText = 'Giá trị tồn kho theo danh mục';
    
    const products = DB.getProducts();
    const table = document.getElementById('report-table');
    
    let totalValue = 0;
    
    const tbodyRows = products.map(p => {
      const val = p.current_stock * p.cost_price;
      totalValue += val;
      const warningBuffer = Number(DB.getSettings().warning_level) || 0;
      const statusBadge = p.current_stock <= p.min_stock 
        ? '<span class="badge badge-red">Nguy cấp</span>'
        : p.current_stock <= (p.min_stock + warningBuffer)
          ? '<span class="badge badge-orange">Sắp hết</span>'
          : '<span class="badge badge-green">An toàn</span>';

      return `
        <tr>
          <td><strong>${p.name}</strong></td>
          <td>${this.getCategoryName(p.category_id)}</td>
          <td style="text-align:right; font-weight:700;">${p.current_stock}</td>
          <td>${p.unit}</td>
          <td style="text-align:right;">${p.cost_price.toLocaleString('vi-VN')}₫</td>
          <td style="text-align:right; font-weight:700;">${val.toLocaleString('vi-VN')}₫</td>
          <td>${this.getSupplierName(p.supplier_id)}</td>
          <td style="text-align:center;">${statusBadge}</td>
        </tr>
      `;
    }).join('');

    table.innerHTML = `
      <thead>
        <tr>
          <th>Nguyên liệu</th>
          <th>Danh mục</th>
          <th style="text-align:right;">Số lượng tồn</th>
          <th>Đơn vị</th>
          <th style="text-align:right;">Đơn giá vốn</th>
          <th style="text-align:right;">Giá trị tồn</th>
          <th>Nhà cung cấp</th>
          <th style="text-align:center;">Trạng thái</th>
        </tr>
      </thead>
      <tbody>
        ${tbodyRows}
        <tr style="background-color:var(--bg-main); font-weight:800; font-size:15px;">
          <td colspan="5">TỔNG GIÁ TRỊ TỒN KHO HỢP NHẤT:</td>
          <td style="text-align:right; color:var(--primary); font-size:16px;">${totalValue.toLocaleString('vi-VN')}₫</td>
          <td colspan="2"></td>
        </tr>
      </tbody>
    `;

    document.getElementById('report-stat-summary').innerText = `Tổng giá trị: ${totalValue.toLocaleString('vi-VN')}₫`;

    // Render chart: Value by categories
    const catMap = {};
    products.forEach(p => {
      const catName = this.getCategoryName(p.category_id);
      const val = p.current_stock * p.cost_price;
      catMap[catName] = (catMap[catName] || 0) + val;
    });

    this.renderReportCharts(Object.keys(catMap), Object.values(catMap), 'Giá trị tồn (₫)', 'doughnut');
  },

  buildImportsReport(start, end) {
    document.getElementById('print-report-title').innerText = 'BÁO CÁO PHIẾU NHẬP KHO';
    document.getElementById('report-chart-title').innerText = 'Giá trị nhập hàng theo nhà cung cấp';

    const imports = DB.getImports().filter(imp => {
      const d = new Date(imp.date);
      return d >= start && d <= end;
    });

    const table = document.getElementById('report-table');
    let grandTotal = 0;

    const tbodyRows = imports.map(imp => {
      grandTotal += imp.total_cost;
      const itemsList = imp.items.map(it => {
        const prodName = DB.getProducts().find(p => p.id === it.product_id)?.name || 'Sản phẩm đã xóa';
        return `${prodName} (x${it.quantity})`;
      }).join(', ');

      return `
        <tr>
          <td><a onclick="App.viewTransactionDetail('import', '${imp.id}')" style="font-weight:700; color:var(--primary); cursor:pointer; text-decoration:underline;">${imp.id}</a></td>
          <td>${new Date(imp.date).toLocaleString('vi-VN')}</td>
          <td><strong>${this.getSupplierName(imp.supplier_id)}</strong></td>
          <td>${itemsList}</td>
          <td style="text-align:right; font-weight:700;">${imp.total_cost.toLocaleString('vi-VN')}₫</td>
          <td>${imp.note || '-'}</td>
        </tr>
      `;
    }).join('');

    table.innerHTML = `
      <thead>
        <tr>
          <th>Mã phiếu</th>
          <th>Thời gian</th>
          <th>Nhà cung cấp</th>
          <th>Danh sách hàng</th>
          <th style="text-align:right;">Tổng chi phí</th>
          <th>Ghi chú</th>
        </tr>
      </thead>
      <tbody>
        ${tbodyRows}
        <tr style="background-color:var(--bg-main); font-weight:800;">
          <td colspan="4">TỔNG GIÁ TRỊ HÀNG NHẬP TRONG KỲ:</td>
          <td style="text-align:right; color:var(--primary);">${grandTotal.toLocaleString('vi-VN')}₫</td>
          <td></td>
        </tr>
      </tbody>
    `;

    document.getElementById('report-stat-summary').innerText = `Tổng chi nhập: ${grandTotal.toLocaleString('vi-VN')}₫`;

    // Chart: import cost by supplier
    const supMap = {};
    imports.forEach(imp => {
      const supName = this.getSupplierName(imp.supplier_id);
      supMap[supName] = (supMap[supName] || 0) + imp.total_cost;
    });

    this.renderReportCharts(Object.keys(supMap), Object.values(supMap), 'Chi phí nhập (₫)', 'bar');
  },

  buildExportsReport(start, end) {
    document.getElementById('print-report-title').innerText = 'BÁO CÁO PHIẾU XUẤT KHO & HAO HỤT';
    document.getElementById('report-chart-title').innerText = 'Phân bổ nguyên nhân xuất kho';

    const exports = DB.getExports().filter(exp => {
      const d = new Date(exp.date);
      return d >= start && d <= end;
    });

    const table = document.getElementById('report-table');
    let grandTotal = 0;

    const tbodyRows = exports.map(exp => {
      const val = exp.total_value || 0;
      grandTotal += val;
      const itemsList = exp.items.map(it => {
        const prodName = DB.getProducts().find(p => p.id === it.product_id)?.name || 'Sản phẩm đã xóa';
        return `${prodName} (x${it.quantity} - ${this.translateReason(it.reason)})`;
      }).join(', ');

      return `
        <tr>
          <td><a onclick="App.viewTransactionDetail('export', '${exp.id}')" style="font-weight:700; color:var(--primary); cursor:pointer; text-decoration:underline;">${exp.id}</a></td>
          <td>${new Date(exp.date).toLocaleString('vi-VN')}</td>
          <td>${itemsList}</td>
          <td style="text-align:right; font-weight:700;">${val.toLocaleString('vi-VN')}₫</td>
          <td>${exp.note || '-'}</td>
        </tr>
      `;
    }).join('');

    table.innerHTML = `
      <thead>
        <tr>
          <th>Mã phiếu</th>
          <th>Thời gian</th>
          <th>Chi tiết sản phẩm xuất & Lý do</th>
          <th style="text-align:right;">Tổng giá trị vốn</th>
          <th>Ghi chú</th>
        </tr>
      </thead>
      <tbody>
        ${tbodyRows}
        <tr style="background-color:var(--bg-main); font-weight:800;">
          <td colspan="3">TỔNG GIÁ TRỊ VỐN HÀNG XUẤT TRONG KỲ:</td>
          <td style="text-align:right; color:var(--primary);">${grandTotal.toLocaleString('vi-VN')}₫</td>
          <td></td>
        </tr>
      </tbody>
    `;

    document.getElementById('report-stat-summary').innerText = `Tổng giá trị xuất: ${grandTotal.toLocaleString('vi-VN')}₫`;

    // Chart: export by reason
    const reasonMap = {};
    exports.forEach(exp => {
      exp.items.forEach(it => {
        const rName = this.translateReason(it.reason);
        const costVal = it.total_cost || (it.quantity * (DB.getProducts().find(p => p.id === it.product_id)?.cost_price || 0));
        reasonMap[rName] = (reasonMap[rName] || 0) + costVal;
      });
    });

    this.renderReportCharts(Object.keys(reasonMap), Object.values(reasonMap), 'Giá trị xuất (₫)', 'pie');
  },

  buildCountsReport(start, end) {
    document.getElementById('print-report-title').innerText = 'BÁO CÁO CHÊNH LỆCH KIỂM KHO CUỐI CA';
    document.getElementById('report-chart-title').innerText = 'So sánh Thiếu vs Dư của các ca';

    const counts = DB.getCounts().filter(cnt => {
      const d = new Date(cnt.date);
      return d >= start && d <= end;
    });

    const table = document.getElementById('report-table');
    let netDifference = 0;

    const tbodyRows = counts.map(cnt => {
      const diffVal = cnt.total_difference_cost || 0;
      netDifference += diffVal;
      
      let badgeClass = 'diff-correct';
      if (diffVal < 0) badgeClass = 'diff-missing';
      else if (diffVal > 0) badgeClass = 'diff-excess';

      return `
        <tr>
          <td><a onclick="App.viewTransactionDetail('count', '${cnt.id}')" style="font-weight:700; color:var(--primary); cursor:pointer; text-decoration:underline;">${cnt.id}</a></td>
          <td>${new Date(cnt.date).toLocaleString('vi-VN')}</td>
          <td><strong>${DB.getUsers().find(u => u.id === cnt.user_id)?.fullname || 'Nhân viên'}</strong></td>
          <td style="text-align:right; font-weight:700;" class="${badgeClass}">${diffVal >= 0 ? '+' : ''}${diffVal.toLocaleString('vi-VN')}₫</td>
          <td>${cnt.note || '-'}</td>
        </tr>
      `;
    }).join('');

    table.innerHTML = `
      <thead>
        <tr>
          <th>Mã phiếu kiểm</th>
          <th>Thời gian kiểm</th>
          <th>Nhân viên đếm</th>
          <th style="text-align:right;">Chênh lệch giá trị</th>
          <th>Ghi chú ca</th>
        </tr>
      </thead>
      <tbody>
        ${tbodyRows}
        <tr style="background-color:var(--bg-main); font-weight:800;">
          <td colspan="3">CHÊNH LỆCH RÒNG HỢP NHẤT:</td>
          <td style="text-align:right; color: ${netDifference >= 0 ? 'var(--blue)' : 'var(--red)'};">${netDifference >= 0 ? '+' : ''}${netDifference.toLocaleString('vi-VN')}₫</td>
          <td></td>
        </tr>
      </tbody>
    `;

    document.getElementById('report-stat-summary').innerText = `Chênh lệch: ${netDifference >= 0 ? '+' : ''}${netDifference.toLocaleString('vi-VN')}₫`;

    // Chart: count differences per sheet
    const labels = counts.map(c => c.id);
    const data = counts.map(c => c.total_difference_cost || 0);

    this.renderReportCharts(labels, data, 'Chênh lệch (₫)', 'bar');
  },

  buildCostsReport(start, end) {
    document.getElementById('print-report-title').innerText = 'BÁO CÁO TỔNG HỢP CHI PHÍ KHO HÀNG';
    document.getElementById('report-chart-title').innerText = 'Biểu đồ phân bổ tỷ trọng chi phí';

    const products = DB.getProducts();
    const imports = DB.getImports().filter(imp => {
      const d = new Date(imp.date);
      return d >= start && d <= end;
    });
    const exports = DB.getExports().filter(exp => {
      const d = new Date(exp.date);
      return d >= start && d <= end;
    });
    const counts = DB.getCounts().filter(cnt => {
      const d = new Date(cnt.date);
      return d >= start && d <= end;
    });

    // 1. Current inventory value
    let totalInvValue = 0;
    products.forEach(p => {
      totalInvValue += p.current_stock * p.cost_price;
    });

    // 2. Sum import costs
    let totalImport = 0;
    imports.forEach(i => totalImport += i.total_cost);

    // 3. Sum export values
    let totalExport = 0;
    exports.forEach(e => totalExport += e.total_value || 0);

    // 4. Sum counts loss / excess
    let totalLoss = 0;
    let totalExcess = 0;
    counts.forEach(cnt => {
      cnt.items.forEach(item => {
        const diffVal = Number(item.difference_cost) || 0;
        if (diffVal < 0) totalLoss += Math.abs(diffVal);
        if (diffVal > 0) totalExcess += diffVal;
      });
    });

    const table = document.getElementById('report-table');
    table.innerHTML = `
      <thead>
        <tr>
          <th>Hạng mục chi phí</th>
          <th>Mô tả hoạt động</th>
          <th style="text-align:right;">Tổng giá trị (VND)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>1. Tổng giá trị tồn kho hiện tại</strong></td>
          <td>Giá trị tài sản nguyên liệu đang lưu lại trong kho</td>
          <td style="text-align:right; font-weight:700;">${totalInvValue.toLocaleString('vi-VN')}₫</td>
        </tr>
        <tr>
          <td><strong>2. Tổng giá trị hàng đã nhập</strong></td>
          <td>Tổng chi phí thanh toán cho NCC để mua hàng trong kỳ</td>
          <td style="text-align:right; font-weight:700; color:var(--green);">${totalImport.toLocaleString('vi-VN')}₫</td>
        </tr>
        <tr>
          <td><strong>3. Tổng giá trị hàng xuất kho</strong></td>
          <td>Giá vốn của hàng hóa đã rời kho (Bán hàng, sử dụng nội bộ...)</td>
          <td style="text-align:right; font-weight:700; color:var(--blue);">${totalExport.toLocaleString('vi-VN')}₫</td>
        </tr>
        <tr>
          <td><strong>4. Tổng chi phí hao hụt (Thiếu)</strong></td>
          <td>Thất thoát hàng hóa trong các lần kiểm kho cuối ca</td>
          <td style="text-align:right; font-weight:700; color:var(--red);">${totalLoss.toLocaleString('vi-VN')}₫</td>
        </tr>
        <tr>
          <td><strong>5. Tổng giá trị thừa kho (Dư)</strong></td>
          <td>Số dư nguyên liệu thực tế lớn hơn lý thuyết khi kiểm kho</td>
          <td style="text-align:right; font-weight:700; color:var(--blue);">${totalExcess.toLocaleString('vi-VN')}₫</td>
        </tr>
      </tbody>
    `;

    document.getElementById('report-stat-summary').innerText = `Tổng chi nhập trong kỳ: ${totalImport.toLocaleString('vi-VN')}₫`;

    // Chart: cost summary breakdown
    const labels = ['Giá trị Tồn', 'Chi Nhập Kho', 'Giá vốn Xuất Kho', 'Chi Hao Hụt', 'Chi Dư Kho'];
    const data = [totalInvValue, totalImport, totalExport, totalLoss, totalExcess];
    this.renderReportCharts(labels, data, 'Tổng giá trị (₫)', 'bar');
  },

  translateReason(reason) {
    const map = {
      'Sale': 'Bán hàng',
      'Waste': 'Hao hụt pha chế',
      'Internal Use': 'Nội bộ',
      'Damaged': 'Hỏng hóc / Hủy',
      'Other': 'Lý do khác'
    };
    return map[reason] || reason;
  },

  renderReportCharts(labels, data, datasetLabel, chartType = 'bar') {
    const isDark = this.theme === 'dark';
    const textColors = isDark ? '#94a3b8' : '#64748b';
    const gridColors = isDark ? '#1e293b' : '#e2e8f0';

    if (this.reportChart) this.reportChart.destroy();
    if (this.reportPieChart) this.reportPieChart.destroy();

    // Palette generator
    const backgroundColors = [
      '#16a34a', // green
      '#3b82f6', // blue
      '#f97316', // orange
      '#ef4444', // red
      '#8b5cf6', // purple
      '#ec4899', // pink
      '#eab308'  // yellow
    ];

    const ctx = document.getElementById('reportChart').getContext('2d');
    const ctxPie = document.getElementById('reportPieChart').getContext('2d');

    // Build main chart
    this.reportChart = new Chart(ctx, {
      type: chartType === 'doughnut' || chartType === 'pie' ? 'bar' : chartType, // fallback for main chart
      data: {
        labels: labels,
        datasets: [{
          label: datasetLabel,
          data: data,
          backgroundColor: chartType === 'bar' ? 'rgba(22, 163, 74, 0.7)' : backgroundColors.slice(0, labels.length),
          borderColor: '#16a34a',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: chartType !== 'bar',
            labels: { color: textColors, font: { family: 'Outfit', size: 12 } }
          }
        },
        scales: {
          x: {
            grid: { color: gridColors },
            ticks: { color: textColors, font: { family: 'Outfit' } }
          },
          y: {
            grid: { color: gridColors },
            ticks: { color: textColors, font: { family: 'Outfit' } }
          }
        }
      }
    });

    // Build secondary pie chart
    this.reportPieChart = new Chart(ctxPie, {
      type: 'doughnut',
      data: {
        labels: labels.length > 0 ? labels : ['Không có dữ liệu'],
        datasets: [{
          data: data.length > 0 ? data : [1],
          backgroundColor: backgroundColors.slice(0, Math.max(1, labels.length)),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { color: textColors, font: { family: 'Outfit', size: 11 } }
          }
        }
      }
    });
  },

  renderReports() {
    // Hide date picker if not custom
    document.getElementById('report-range').value = 'month';
    document.getElementById('report-custom-dates').style.display = 'none';
    this.generateReport();
  },

  exportReportToExcel() {
    const table = document.getElementById('report-table');
    const workbook = XLSX.utils.table_to_book(table, { sheet: "Báo Cáo" });
    XLSX.writeFile(workbook, `Bao_Cao_Kho_Cat_Tuong_${Date.now()}.xlsx`);
    this.showToast('Đã xuất Excel báo cáo thành công!', 'success');
  },

  // ==========================================
  // 7. USER MANAGEMENT TAB
  // ==========================================
  renderUsers() {
    const users = DB.getUsers();
    const tbody = document.getElementById('users-tbody');
    tbody.innerHTML = users.map(u => {
      const activeBadge = u.active 
        ? '<span class="badge badge-green">Hoạt động</span>'
        : '<span class="badge badge-red">Đã khóa</span>';

      let permText = 'Nhập / Xuất / Kiểm Kho';
      let permClass = 'badge-blue';
      
      if (u.role === 'admin') {
        permText = 'Toàn quyền Admin';
        permClass = 'badge-red';
      } else if (u.role === 'manager') {
        permText = 'Kho & Báo cáo';
        permClass = 'badge-orange';
      }

      // Hide actions if this is the user logged in, or default admin
      const isSelf = u.id === this.currentUser.id;
      const isDefaultAdmin = u.username === 'admin';
      const actionHtml = (isSelf || isDefaultAdmin)
        ? `<span style="font-size:12px; color:var(--text-muted);">Mặc định</span>`
        : `
          <button class="btn btn-light btn-icon btn-sm" onclick="App.editUser('${u.id}')" title="Sửa"><i class="fa-solid fa-pen" style="font-size:11px;"></i></button>
          <button class="btn btn-danger btn-icon btn-sm" onclick="App.deleteUser('${u.id}')" title="Xóa"><i class="fa-solid fa-trash" style="font-size:11px;"></i></button>
        `;

      return `
        <tr>
          <td><strong>${u.fullname}</strong></td>
          <td style="font-family:monospace;">@${u.username}</td>
          <td>${u.phone || '-'}</td>
          <td>${u.email || '-'}</td>
          <td><span class="badge badge-blue">${u.role.toUpperCase()}</span></td>
          <td><span class="badge ${permClass}" style="text-transform:none;">${permText}</span></td>
          <td>${activeBadge}</td>
          <td style="text-align:center;">
            <div style="display:flex; gap:6px; justify-content:center;">
              ${actionHtml}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  openUserModal(userId = null) {
    const form = document.getElementById('user-form');
    form.reset();
    document.getElementById('usr-id').value = '';
    document.getElementById('usr-username').disabled = false;

    if (userId) {
      const u = DB.getUsers().find(item => item.id === userId);
      if (u) {
        document.getElementById('user-modal-title').innerText = 'Sửa tài khoản nhân sự';
        document.getElementById('usr-id').value = u.id;
        document.getElementById('usr-fullname').value = u.fullname;
        document.getElementById('usr-username').value = u.username;
        document.getElementById('usr-username').disabled = true; // Cannot edit username once set
        document.getElementById('usr-password').value = u.password;
        document.getElementById('usr-role').value = u.role;
        document.getElementById('usr-phone').value = u.phone || '';
        document.getElementById('usr-email').value = u.email || '';
      }
    } else {
      document.getElementById('user-modal-title').innerText = 'Thêm nhân sự mới';
    }

    document.getElementById('user-modal').classList.add('active');
  },

  closeUserModal() {
    document.getElementById('user-modal').classList.remove('active');
  },

  saveUser(e) {
    e.preventDefault();
    const id = document.getElementById('usr-id').value;
    const userData = {
      fullname: document.getElementById('usr-fullname').value.trim(),
      username: document.getElementById('usr-username').value.trim().toLowerCase(),
      password: document.getElementById('usr-password').value.trim(),
      role: document.getElementById('usr-role').value,
      phone: document.getElementById('usr-phone').value.trim(),
      email: document.getElementById('usr-email').value.trim()
    };

    if (id) {
      userData.id = id;
    }

    try {
      DB.saveUser(userData);
      this.closeUserModal();
      this.renderUsers();
      this.showToast('Lưu tài khoản nhân viên thành công!', 'success');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  deleteUser(userId) {
    if (confirm('Bạn có chắc chắn muốn xóa tài khoản nhân viên này?')) {
      try {
        if (DB.deleteUser(userId)) {
          this.renderUsers();
          this.showToast('Đã xóa tài khoản thành công!');
        }
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    }
  },

  // ==========================================
  // 8. SETTINGS TAB
  // ==========================================
  renderSettings() {
    const settings = DB.getSettings();
    document.getElementById('settings-store-name').value = settings.store_name;
    document.getElementById('settings-phone').value = settings.phone || '';
    document.getElementById('settings-address').value = settings.address || '';
    document.getElementById('settings-tax').value = settings.tax_rate;
    document.getElementById('settings-warning').value = settings.warning_level;

    // Render full audit logs table
    this.renderSettingsAuditLogs();
  },

  saveSettings(e) {
    e.preventDefault();
    const settings = {
      store_name: document.getElementById('settings-store-name').value.trim(),
      phone: document.getElementById('settings-phone').value.trim(),
      address: document.getElementById('settings-address').value.trim(),
      tax_rate: Number(document.getElementById('settings-tax').value) || 0,
      warning_level: Number(document.getElementById('settings-warning').value) || 0,
      currency: 'VND',
      auto_backup: true
    };

    DB.saveSettings(settings);
    document.getElementById('header-store-name').innerText = settings.store_name;
    this.showToast('Đã cập nhật cài đặt hệ thống!', 'success');
  },

  renderSettingsAuditLogs() {
    const logs = DB.getLogs();
    const tbody = document.getElementById('settings-log-tbody');
    tbody.innerHTML = logs.map(l => `
      <tr>
        <td style="font-size:12px; font-family:monospace; color:var(--text-muted);">${new Date(l.timestamp).toLocaleString('vi-VN')}</td>
        <td><strong>${l.user_name}</strong></td>
        <td><span class="badge badge-blue" style="font-size:10px;">${l.action}</span></td>
        <td style="font-size:13px;">${l.details}</td>
      </tr>
    `).join('');

    if (logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">Không có ghi chép lịch sử.</td></tr>';
    }
  },

  downloadBackup() {
    const backupJson = DB.backup();
    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_kho_cattuong_${new Date().toISOString().substring(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);

    this.showToast('Tải file sao lưu thành công!', 'success');
  },

  triggerRestoreUpload() {
    document.getElementById('restore-file-input').click();
  },

  handleRestoreUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (confirm('Cảnh báo! Việc phục hồi sẽ ghi đè và thay thế hoàn toàn dữ liệu hiện tại trong trình duyệt của bạn. Tiếp tục?')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const content = evt.target.result;
          if (DB.restore(content)) {
            this.showToast('Phục hồi dữ liệu kho thành công! Ứng dụng sẽ tự động tải lại.', 'success');
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          }
        } catch (err) {
          this.showToast('Khôi phục thất bại: ' + err.message, 'error');
        }
      };
      reader.readAsText(file);
    }
    document.getElementById('restore-file-input').value = ''; // clear input
  },

  resetToDefaultState() {
    if (confirm('Bạn có thực sự muốn thiết lập lại toàn bộ dữ liệu của quán về trạng thái ban đầu? Tất cả phiếu nhập xuất tự tạo sẽ bị xóa.')) {
      localStorage.removeItem('kho_initialized');
      localStorage.removeItem('kho_products');
      localStorage.removeItem('kho_categories');
      localStorage.removeItem('kho_suppliers');
      localStorage.removeItem('kho_users');
      localStorage.removeItem('kho_settings');
      localStorage.removeItem('kho_imports');
      localStorage.removeItem('kho_exports');
      localStorage.removeItem('kho_counts');
      localStorage.removeItem('kho_logs');
      
      this.showToast('Đang khôi phục lại dữ liệu mẫu gốc...', 'warning');
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    }
  },

  // ==========================================
  // TRANSACTION DETAIL DIALOGS
  // ==========================================
  openImportHistoryModal() {
    const imports = DB.getImports();
    const tbody = document.getElementById('import-history-tbody');
    
    tbody.innerHTML = imports.map(imp => `
      <tr>
        <td><strong>${imp.id}</strong></td>
        <td>${new Date(imp.date).toLocaleString('vi-VN')}</td>
        <td><strong>${this.getSupplierName(imp.supplier_id)}</strong></td>
        <td>${DB.getUsers().find(u => u.id === imp.user_id)?.fullname || 'Nhân viên'}</td>
        <td style="text-align:right; font-weight:700; color:var(--primary);">${imp.total_cost.toLocaleString('vi-VN')}₫</td>
        <td style="font-size:12px; color:var(--text-muted);">${imp.note || '-'}</td>
        <td style="text-align:center;">
          <button class="btn btn-light btn-sm" onclick="App.viewTransactionDetail('import', '${imp.id}')"><i class="fa-solid fa-eye"></i> Xem</button>
        </td>
      </tr>
    `).join('');

    if (imports.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">Chưa có giao dịch nhập kho nào.</td></tr>';
    }

    document.getElementById('import-history-modal').classList.add('active');
  },
  closeImportHistoryModal() {
    document.getElementById('import-history-modal').classList.remove('active');
  },

  openExportHistoryModal() {
    const exports = DB.getExports();
    const tbody = document.getElementById('export-history-tbody');
    
    tbody.innerHTML = exports.map(exp => `
      <tr>
        <td><strong>${exp.id}</strong></td>
        <td>${new Date(exp.date).toLocaleString('vi-VN')}</td>
        <td>${DB.getUsers().find(u => u.id === exp.user_id)?.fullname || 'Nhân viên'}</td>
        <td style="text-align:right; font-weight:700; color:var(--blue);">${exp.total_value.toLocaleString('vi-VN')}₫</td>
        <td style="font-size:12px; color:var(--text-muted);">${exp.note || '-'}</td>
        <td style="text-align:center;">
          <button class="btn btn-light btn-sm" onclick="App.viewTransactionDetail('export', '${exp.id}')"><i class="fa-solid fa-eye"></i> Xem</button>
        </td>
      </tr>
    `).join('');

    if (exports.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">Chưa có phiếu xuất kho nào.</td></tr>';
    }

    document.getElementById('export-history-modal').classList.add('active');
  },
  closeExportHistoryModal() {
    document.getElementById('export-history-modal').classList.remove('active');
  },

  openCountHistoryModal() {
    const counts = DB.getCounts();
    const tbody = document.getElementById('count-history-tbody');
    
    tbody.innerHTML = counts.map(cnt => {
      const diffVal = cnt.total_difference_cost || 0;
      let diffClass = 'diff-correct';
      if (diffVal < 0) diffClass = 'diff-missing';
      else if (diffVal > 0) diffClass = 'diff-excess';

      return `
        <tr>
          <td><strong>${cnt.id}</strong></td>
          <td>${new Date(cnt.date).toLocaleString('vi-VN')}</td>
          <td><strong>${DB.getUsers().find(u => u.id === cnt.user_id)?.fullname || 'Nhân viên'}</strong></td>
          <td style="text-align:right; font-weight:700;" class="${diffClass}">${diffVal >= 0 ? '+' : ''}${diffVal.toLocaleString('vi-VN')}₫</td>
          <td style="font-size:12px; color:var(--text-muted);">${cnt.note || '-'}</td>
          <td style="text-align:center;">
            <button class="btn btn-light btn-sm" onclick="App.viewTransactionDetail('count', '${cnt.id}')"><i class="fa-solid fa-eye"></i> Chi tiết</button>
          </td>
        </tr>
      `;
    }).join('');

    if (counts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">Chưa thực hiện đếm bàn giao ca nào.</td></tr>';
    }

    document.getElementById('count-history-modal').classList.add('active');
  },
  closeCountHistoryModal() {
    document.getElementById('count-history-modal').classList.remove('active');
  },

  viewTransactionDetail(type, id) {
    const body = document.getElementById('detail-modal-body');
    const products = DB.getProducts();

    if (type === 'import') {
      const bill = DB.getImports().find(i => i.id === id);
      if (!bill) return;

      document.getElementById('detail-modal-title').innerText = 'Chi Tiết Phiếu Nhập Kho';
      
      const itemRows = bill.items.map(it => {
        const prod = products.find(p => p.id === it.product_id);
        return `
          <tr>
            <td><strong>${prod ? prod.name : 'Sản phẩm đã xóa'}</strong></td>
            <td style="text-align:center;">${it.quantity}</td>
            <td>${prod ? prod.unit : 'đơn vị'}</td>
            <td style="text-align:right;">${it.unit_cost.toLocaleString('vi-VN')}₫</td>
            <td style="text-align:right; font-weight:700;">${it.total_cost.toLocaleString('vi-VN')}₫</td>
          </tr>
        `;
      }).join('');

      body.innerHTML = `
        <div style="border:1px solid var(--border); padding:20px; border-radius:var(--radius-sm);">
          <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
            <div>
              <h2 style="color:var(--primary); font-size:18px;">HÓA ĐƠN NHẬP KHO</h2>
              <span style="font-size:13px; color:var(--text-muted);">Số phiếu: ${bill.id}</span>
            </div>
            <div style="text-align:right; font-size:13px;">
              <div><strong>Ngày nhập:</strong> ${new Date(bill.date).toLocaleString('vi-VN')}</div>
              <div><strong>Nhà cung cấp:</strong> ${this.getSupplierName(bill.supplier_id)}</div>
              <div><strong>Người nhập:</strong> ${DB.getUsers().find(u => u.id === bill.user_id)?.fullname || 'Nhân viên'}</div>
            </div>
          </div>
          
          <table class="table-custom" style="margin-bottom:20px;">
            <thead>
              <tr>
                <th>Nguyên liệu / Sản phẩm</th>
                <th style="text-align:center;">Số lượng</th>
                <th>Đơn vị</th>
                <th style="text-align:right;">Đơn giá nhập</th>
                <th style="text-align:right;">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
              <tr style="font-weight:800; font-size:15px; background-color:var(--bg-main);">
                <td colspan="4">TỔNG GIÁ TRỊ PHIẾU NHẬP:</td>
                <td style="text-align:right; color:var(--primary);">${bill.total_cost.toLocaleString('vi-VN')}₫</td>
              </tr>
            </tbody>
          </table>
          
          <div style="font-size:13px; margin-top:10px;">
            <strong>Ghi chú phiếu nhập:</strong> ${bill.note || 'Không có ghi chú.'}
          </div>
        </div>
      `;
    } 
    else if (type === 'export') {
      const bill = DB.getExports().find(e => e.id === id);
      if (!bill) return;

      document.getElementById('detail-modal-title').innerText = 'Chi Tiết Phiếu Xuất Kho';
      
      const itemRows = bill.items.map(it => {
        const prod = products.find(p => p.id === it.product_id);
        const costPrice = it.unit_cost || (prod ? prod.cost_price : 0);
        const totalCost = it.total_cost || (it.quantity * costPrice);

        return `
          <tr>
            <td><strong>${prod ? prod.name : 'Sản phẩm đã xóa'}</strong></td>
            <td style="text-align:center;">${it.quantity}</td>
            <td>${prod ? prod.unit : 'đơn vị'}</td>
            <td><span class="badge badge-blue">${this.translateReason(it.reason)}</span></td>
            <td style="text-align:right;">${costPrice.toLocaleString('vi-VN')}₫</td>
            <td style="text-align:right; font-weight:700;">${totalCost.toLocaleString('vi-VN')}₫</td>
          </tr>
        `;
      }).join('');

      body.innerHTML = `
        <div style="border:1px solid var(--border); padding:20px; border-radius:var(--radius-sm);">
          <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
            <div>
              <h2 style="color:var(--primary); font-size:18px;">PHIẾU XUẤT KHO VẬT TƯ</h2>
              <span style="font-size:13px; color:var(--text-muted);">Số phiếu: ${bill.id}</span>
            </div>
            <div style="text-align:right; font-size:13px;">
              <div><strong>Ngày xuất:</strong> ${new Date(bill.date).toLocaleString('vi-VN')}</div>
              <div><strong>Nhân viên xuất:</strong> ${DB.getUsers().find(u => u.id === bill.user_id)?.fullname || 'Nhân viên'}</div>
            </div>
          </div>
          
          <table class="table-custom" style="margin-bottom:20px;">
            <thead>
              <tr>
                <th>Sản phẩm xuất</th>
                <th style="text-align:center;">Số lượng</th>
                <th>Đơn vị</th>
                <th>Lý do</th>
                <th style="text-align:right;">Đơn giá vốn</th>
                <th style="text-align:right;">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
              <tr style="font-weight:800; font-size:15px; background-color:var(--bg-main);">
                <td colspan="5">TỔNG GIÁ TRỊ VỐN XUẤT KHO:</td>
                <td style="text-align:right; color:var(--primary);">${bill.total_value.toLocaleString('vi-VN')}₫</td>
              </tr>
            </tbody>
          </table>
          
          <div style="font-size:13px; margin-top:10px;">
            <strong>Ghi chú xuất kho:</strong> ${bill.note || 'Không có ghi chú.'}
          </div>
        </div>
      `;
    } 
    else if (type === 'count') {
      const sheet = DB.getCounts().find(c => c.id === id);
      if (!sheet) return;

      document.getElementById('detail-modal-title').innerText = 'Chi Tiết Phiếu Kiểm Kho & Bàn Giao';
      
      const itemRows = sheet.items.map(it => {
        const prod = products.find(p => p.id === it.product_id);
        const diffCost = it.difference_cost || 0;
        
        let diffClass = 'diff-correct';
        if (it.difference < 0) diffClass = 'diff-missing';
        else if (it.difference > 0) diffClass = 'diff-excess';

        return `
          <tr class="${it.difference < 0 ? 'count-row-missing' : it.difference > 0 ? 'count-row-excess' : 'count-row-correct'}">
            <td><strong>${prod ? prod.name : 'Sản phẩm đã xóa'}</strong></td>
            <td style="text-align:right;">${it.expected_stock}</td>
            <td style="text-align:right; font-weight:700;">${it.actual_stock}</td>
            <td>${prod ? prod.unit : 'đơn vị'}</td>
            <td style="text-align:right; font-weight:700;" class="${diffClass}">${it.difference >= 0 ? '+' : ''}${it.difference}</td>
            <td style="text-align:right; font-weight:700; color: ${diffCost >= 0 ? 'var(--blue)' : 'var(--red)'};">${diffCost >= 0 ? '+' : ''}${diffCost.toLocaleString('vi-VN')}₫</td>
          </tr>
        `;
      }).join('');

      body.innerHTML = `
        <div style="border:1px solid var(--border); padding:20px; border-radius:var(--radius-sm);">
          <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
            <div>
              <h2 style="color:var(--primary); font-size:18px;">BIÊN BẢN KIỂM KÊ CUỐI CA</h2>
              <span style="font-size:13px; color:var(--text-muted);">Mã phiếu: ${sheet.id}</span>
            </div>
            <div style="text-align:right; font-size:13px;">
              <div><strong>Ngày thực hiện:</strong> ${new Date(sheet.date).toLocaleString('vi-VN')}</div>
              <div><strong>Nhân viên bàn giao:</strong> ${DB.getUsers().find(u => u.id === sheet.user_id)?.fullname || 'Nhân viên'}</div>
            </div>
          </div>
          
          <table class="table-custom" style="margin-bottom:20px;">
            <thead>
              <tr>
                <th>Nguyên liệu</th>
                <th style="text-align:right;">Lý thuyết</th>
                <th style="text-align:right;">Thực tế</th>
                <th>Đơn vị</th>
                <th style="text-align:right;">Chênh lệch</th>
                <th style="text-align:right;">Giá trị chênh lệch</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
              <tr style="font-weight:800; font-size:15px; background-color:var(--bg-main);">
                <td colspan="5">SỐ DƯ RÒNG CHÊNH LỆCH CA:</td>
                <td style="text-align:right; color: ${sheet.total_difference_cost >= 0 ? 'var(--blue)' : 'var(--red)'};">${sheet.total_difference_cost >= 0 ? '+' : ''}${sheet.total_difference_cost.toLocaleString('vi-VN')}₫</td>
              </tr>
            </tbody>
          </table>
          
          <div style="font-size:13px; margin-top:10px;">
            <strong>Ghi chú ca kiểm kê:</strong> ${sheet.note || 'Không có ghi chú.'}
          </div>
        </div>
      `;
    }

    document.getElementById('detail-modal').classList.add('active');
  },
  
  closeDetailModal() {
    document.getElementById('detail-modal').classList.remove('active');
  },

  printReceipt() {
    // Print the popup invoice content beautifully
    const oldTitle = document.title;
    document.title = "In_Phieu_Giao_Dich_" + Date.now();
    alert("Vui lòng thực hiện in (Ctrl+P). Chỉ khu vực hóa đơn sẽ được in.");
    window.print();
    document.title = oldTitle;
  },

  closeAllModals() {
    this.closeProductModal();
    this.closeCategoryModal();
    this.closeSupplierModal();
    this.closeUserModal();
    this.closeImportHistoryModal();
    this.closeExportHistoryModal();
    this.closeCountHistoryModal();
    this.closeDetailModal();
    this.stopBarcodeScanner();
  },

  // ==========================================
  // CAMERA BARCODE / QR SCANNER (html5-qrcode)
  // ==========================================
  startBarcodeScanner(targetInputId) {
    this.scannerTargetInputId = targetInputId;
    document.getElementById('scanner-modal').classList.add('active');

    // Start scanner using HTML5-qrcode CDN library
    setTimeout(() => {
      this.html5QrScanner = new Html5Qrcode("reader");
      
      const config = { fps: 10, qrbox: { width: 250, height: 150 } };
      
      this.html5QrScanner.start(
        { facingMode: "environment" }, 
        config,
        (decodedText, decodedResult) => {
          // Success callback
          document.getElementById(this.scannerTargetInputId).value = decodedText;
          this.showToast(`Đã quét được mã: ${decodedText}`, 'success');
          this.stopBarcodeScanner();
        },
        (errorMessage) => {
          // Scan errors are thrown constantly while search is running. Keep console clean.
        }
      ).catch(err => {
        console.error("Lỗi khởi động camera: ", err);
        this.showToast("Không tìm thấy camera hoặc bị chặn quyền truy cập!", "error");
        this.stopBarcodeScanner();
      });
    }, 300);
  },

  stopBarcodeScanner() {
    document.getElementById('scanner-modal').classList.remove('active');
    if (this.html5QrScanner) {
      this.html5QrScanner.stop().then(() => {
        this.html5QrScanner = null;
      }).catch(err => {
        console.error("Lỗi tắt camera: ", err);
        this.html5QrScanner = null;
      });
    }
  }
};

// Start application immediately
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

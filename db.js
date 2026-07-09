/**
 * Database Layer for Inventory Management Application
 * Uses localStorage to simulate a relational database.
 * Designed to easily sync with Supabase or Firebase.
 */

const DB = {
  // Initialize default data if not exists
  init() {
    if (!localStorage.getItem('kho_initialized')) {
      // 1. Categories (Danh mục)
      const defaultCategories = [
        { id: 'cat-1', name: 'Trà & Cà Phê', description: 'Các loại trà lá, trà túi lọc, hạt cà phê và bột cà phê.' },
        { id: 'cat-2', name: 'Sữa & Bột béo', description: 'Sữa tươi, sữa đặc, bột sữa, bột béo các loại.' },
        { id: 'cat-3', name: 'Siro & Sinh tố', description: 'Các loại siro hương vị, mứt trái cây và sinh tố đóng chai.' },
        { id: 'cat-4', name: 'Topping', description: 'Trân châu, thạch, pudding, hạt chia, nha đam.' },
        { id: 'cat-5', name: 'Bao bì & Dụng cụ', description: 'Ly nhựa, ly giấy, ống hút, túi chữ T, màng dập cốc.' }
      ];

      // 2. Suppliers (Nhà cung cấp)
      const defaultSuppliers = [
        { id: 'sup-1', name: 'Tổng Kho Nguyên Liệu Cát Tường', phone: '0901234567', email: 'cattuong@gmail.com', address: '120 Lý Thường Kiệt, Q.10, TP.HCM', note: 'Nhà cung cấp trà và siro chính' },
        { id: 'sup-2', name: 'Công ty Sữa Việt Nam (Vinamilk)', phone: '0283820220', email: 'vinamilk@vinamilk.com.vn', address: '10 Tân Trào, Tân Phú, Q.7, TP.HCM', note: 'Cung cấp sữa tươi, sữa đặc' },
        { id: 'sup-3', name: 'Bao Bì Xanh Group', phone: '0933445566', email: 'contact@baobixanh.com', address: '45 Lê Lợi, Gò Vấp, TP.HCM', note: 'Cung cấp ly nhựa, túi bóng, ống hút' }
      ];

      // 3. Products (Sản phẩm)
      // Beginning Stock: Tồn đầu kỳ, Current Stock: Tồn hiện tại, Min Stock: Tồn tối thiểu
      const defaultProducts = [
        { id: 'prod-1', name: 'Trà Đen Lộc Phát (Gói 1kg)', category_id: 'cat-1', supplier_id: 'sup-1', unit: 'Gói', beginning_stock: 50, current_stock: 42, min_stock: 10, cost_price: 120000, selling_price: 0, barcode: '8936001230012', note: 'Dùng làm cốt trà sữa', image: '' },
        { id: 'prod-2', name: 'Trà Lài Lộc Phát (Gói 1kg)', category_id: 'cat-1', supplier_id: 'sup-1', unit: 'Gói', beginning_stock: 30, current_stock: 28, min_stock: 8, cost_price: 150000, selling_price: 0, barcode: '8936001230029', note: 'Dùng pha trà trái cây', image: '' },
        { id: 'prod-3', name: 'Bột béo B-one (Bao 1kg)', category_id: 'cat-2', supplier_id: 'sup-1', unit: 'Bao', beginning_stock: 40, current_stock: 35, min_stock: 12, cost_price: 75000, selling_price: 0, barcode: '8852002100345', note: 'Nhập khẩu Thái Lan', image: '' },
        { id: 'prod-4', name: 'Sữa đặc Ngôi Sao Phương Nam xanh (Hộp 1.28kg)', category_id: 'cat-2', supplier_id: 'sup-2', unit: 'Hộp', beginning_stock: 60, current_stock: 52, min_stock: 15, cost_price: 68000, selling_price: 0, barcode: '8934673120938', note: 'Chuyên pha cà phê, trà sữa', image: '' },
        { id: 'prod-5', name: 'Siro Đào Teisseire (Chai 700ml)', category_id: 'cat-3', supplier_id: 'sup-1', unit: 'Chai', beginning_stock: 20, current_stock: 8, min_stock: 5, cost_price: 210000, selling_price: 0, barcode: '3092830010928', note: 'Siro cao cấp của Pháp', image: '' },
        { id: 'prod-6', name: 'Trân châu đen Wings (Túi 3kg)', category_id: 'cat-4', supplier_id: 'sup-1', unit: 'Túi', beginning_stock: 25, current_stock: 4, min_stock: 6, cost_price: 95000, selling_price: 0, barcode: '8938501234021', note: 'Cần bảo quản nơi khô ráo', image: '' },
        { id: 'prod-7', name: 'Ly Nhựa Phi 95 500ml (Cây 50 cái)', category_id: 'cat-5', supplier_id: 'sup-3', unit: 'Cây', beginning_stock: 100, current_stock: 85, min_stock: 20, cost_price: 45000, selling_price: 0, barcode: '8936029381029', note: 'Ly dập màng', image: '' },
        { id: 'prod-8', name: 'Ống hút trân châu phi 12 (Gói 100 cái)', category_id: 'cat-5', supplier_id: 'sup-3', unit: 'Gói', beginning_stock: 80, current_stock: 75, min_stock: 15, cost_price: 15000, selling_price: 0, barcode: '8936029381036', note: 'Bọc màng từng cái', image: '' }
      ];

      // 4. Users & Roles (Thành viên & Quyền)
      const defaultUsers = [
        { id: 'usr-1', username: 'admin', password: '123', fullname: 'Nguyễn Quản Trị', role: 'admin', phone: '0988888888', email: 'admin@beverage.com', active: true },
        { id: 'usr-2', username: 'manager', password: '123', fullname: 'Trần Cửa Hàng Trưởng', role: 'manager', phone: '0977777777', email: 'manager@beverage.com', active: true },
        { id: 'usr-3', username: 'staff', password: '123', fullname: 'Lê Nhân Viên Kho', role: 'staff', phone: '0966666666', email: 'staff@beverage.com', active: true }
      ];

      // 5. System Settings (Cài đặt hệ thống)
      const defaultSettings = {
        store_name: 'Đá Xay & Trà Sữa Tươi Cát Tường',
        phone: '0901234567',
        address: '120 Lý Thường Kiệt, Q.10, TP.HCM',
        currency: 'VND',
        tax_rate: 8, // 8% VAT
        warning_level: 5, // Warning if current stock <= min_stock
        auto_backup: true
      };

      // 6. Imports (Lịch sử Nhập kho mẫu)
      const defaultImports = [
        {
          id: 'imp-1',
          date: '2026-07-08T09:30:00+07:00',
          supplier_id: 'sup-1',
          user_id: 'usr-2',
          note: 'Nhập hàng định kỳ đầu tháng',
          total_cost: 1680000,
          items: [
            { product_id: 'prod-1', quantity: 10, unit_cost: 120000, total_cost: 1200000 },
            { product_id: 'prod-5', quantity: 2, unit_cost: 210000, total_cost: 420000 },
            { product_id: 'prod-8', quantity: 4, unit_cost: 15000, total_cost: 60000 }
          ]
        }
      ];

      // 7. Exports (Lịch sử Xuất kho mẫu)
      const defaultExports = [
        {
          id: 'exp-1',
          date: '2026-07-08T17:00:00+07:00',
          user_id: 'usr-3',
          note: 'Xuất nguyên liệu cho ca sáng pha chế',
          total_value: 368000,
          items: [
            { product_id: 'prod-1', quantity: 2, reason: 'Sale', unit_cost: 120000, total_cost: 240000 },
            { product_id: 'prod-4', quantity: 1, reason: 'Sale', unit_cost: 68000, total_cost: 68000 },
            { product_id: 'prod-7', quantity: 1, reason: 'Waste', unit_cost: 45000, total_cost: 45000 },
            { product_id: 'prod-8', quantity: 1, reason: 'Damaged', unit_cost: 15000, total_cost: 15000 }
          ]
        }
      ];

      // 8. Inventory Counts (Lịch sử Kiểm kho cuối ca mẫu)
      const defaultCounts = [
        {
          id: 'cnt-1',
          date: '2026-07-08T22:30:00+07:00',
          user_id: 'usr-3',
          note: 'Bàn giao ca tối 08/07',
          items: [
            { product_id: 'prod-1', expected_stock: 42, actual_stock: 42, difference: 0, cost_price: 120000, difference_cost: 0 },
            { product_id: 'prod-5', expected_stock: 8, actual_stock: 7, difference: -1, cost_price: 210000, difference_cost: -210000 }, // Hụt 1 chai siro đào
            { product_id: 'prod-6', expected_stock: 4, actual_stock: 5, difference: 1, cost_price: 95000, difference_cost: 95000 } // Dư 1 túi trân châu đen
          ],
          total_difference_cost: -115000 // Hụt 115k
        }
      ];

      // 9. Audit Logs (Nhật ký hệ thống mẫu)
      const defaultLogs = [
        { id: 'log-1', timestamp: '2026-07-08T08:00:00+07:00', user_name: 'Nguyễn Quản Trị', action: 'Khởi tạo', details: 'Khởi tạo hệ thống quản lý kho' },
        { id: 'log-2', timestamp: '2026-07-08T09:35:00+07:00', user_name: 'Trần Cửa Hàng Trưởng', action: 'Nhập kho', details: 'Tạo phiếu nhập kho imp-1 (Trà Đen, Siro Đào, Ống hút)' },
        { id: 'log-3', timestamp: '2026-07-08T17:05:00+07:00', user_name: 'Lê Nhân Viên Kho', action: 'Xuất kho', details: 'Tạo phiếu xuất kho exp-1 phục vụ ca pha chế' },
        { id: 'log-4', timestamp: '2026-07-08T22:35:00+07:00', user_name: 'Lê Nhân Viên Kho', action: 'Kiểm kho', details: 'Hoàn tất kiểm kho phiếu cnt-1 (Chênh lệch: -115,000đ)' }
      ];

      // Write to localStorage
      localStorage.setItem('kho_categories', JSON.stringify(defaultCategories));
      localStorage.setItem('kho_suppliers', JSON.stringify(defaultSuppliers));
      localStorage.setItem('kho_products', JSON.stringify(defaultProducts));
      localStorage.setItem('kho_users', JSON.stringify(defaultUsers));
      localStorage.setItem('kho_settings', JSON.stringify(defaultSettings));
      localStorage.setItem('kho_imports', JSON.stringify(defaultImports));
      localStorage.setItem('kho_exports', JSON.stringify(defaultExports));
      localStorage.setItem('kho_counts', JSON.stringify(defaultCounts));
      localStorage.setItem('kho_logs', JSON.stringify(defaultLogs));
      
      // Set current session user (default is admin for ease of view)
      localStorage.setItem('kho_current_user', JSON.stringify(defaultUsers[0]));
      
      localStorage.setItem('kho_initialized', 'true');
    }
  },

  // Generic helpers to load and save tables
  getTable(tableName) {
    this.init();
    const data = localStorage.getItem('kho_' + tableName);
    return data ? JSON.parse(data) : [];
  },

  saveTable(tableName, data) {
    localStorage.setItem('kho_' + tableName, JSON.stringify(data));
  },

  // PRODUCTS
  getProducts() {
    return this.getTable('products');
  },
  saveProduct(product) {
    const products = this.getProducts();
    const index = products.findIndex(p => p.id === product.id);

    if (index !== -1) {
      products[index] = { ...products[index], ...product };
      this.log('Cập nhật sản phẩm', `Sửa thông tin sản phẩm: ${product.name} (${product.id})`);
    } else {
      product.id = 'prod-' + Date.now();
      product.current_stock = Number(product.beginning_stock) || 0;
      products.push(product);
      this.log('Thêm sản phẩm', `Thêm mới sản phẩm: ${product.name} (${product.id})`);
    }
    this.saveTable('products', products);
    return product;
  },
  deleteProduct(productId) {
    const products = this.getProducts();
    const product = products.find(p => p.id === productId);
    if (!product) return false;
    
    const filtered = products.filter(p => p.id !== productId);
    this.saveTable('products', filtered);
    this.log('Xóa sản phẩm', `Xóa sản phẩm: ${product.name} (${productId})`);
    return true;
  },

  // CATEGORIES
  getCategories() {
    return this.getTable('categories');
  },
  saveCategory(cat) {
    const categories = this.getCategories();
    const index = categories.findIndex(c => c.id === cat.id);
    if (index !== -1) {
      categories[index] = cat;
      this.log('Cập nhật danh mục', `Sửa danh mục: ${cat.name}`);
    } else {
      cat.id = 'cat-' + Date.now();
      categories.push(cat);
      this.log('Thêm danh mục', `Thêm danh mục mới: ${cat.name}`);
    }
    this.saveTable('categories', categories);
    return cat;
  },
  deleteCategory(catId) {
    const categories = this.getCategories();
    const cat = categories.find(c => c.id === catId);
    if (!cat) return false;

    // Check if any product is using this category
    const products = this.getProducts();
    if (products.some(p => p.category_id === catId)) {
      throw new Error('Không thể xóa danh mục đang có sản phẩm thuộc về.');
    }

    const filtered = categories.filter(c => c.id !== catId);
    this.saveTable('categories', filtered);
    this.log('Xóa danh mục', `Xóa danh mục: ${cat.name}`);
    return true;
  },

  // SUPPLIERS
  getSuppliers() {
    return this.getTable('suppliers');
  },
  saveSupplier(sup) {
    const suppliers = this.getSuppliers();
    const index = suppliers.findIndex(s => s.id === sup.id);
    if (index !== -1) {
      suppliers[index] = sup;
      this.log('Cập nhật NCC', `Sửa nhà cung cấp: ${sup.name}`);
    } else {
      sup.id = 'sup-' + Date.now();
      suppliers.push(sup);
      this.log('Thêm NCC', `Thêm nhà cung cấp mới: ${sup.name}`);
    }
    this.saveTable('suppliers', suppliers);
    return sup;
  },
  deleteSupplier(supId) {
    const suppliers = this.getSuppliers();
    const sup = suppliers.find(s => s.id === supId);
    if (!sup) return false;

    // Check if any product is using this supplier
    const products = this.getProducts();
    if (products.some(p => p.supplier_id === supId)) {
      throw new Error('Không thể xóa nhà cung cấp đang có sản phẩm thuộc về.');
    }

    const filtered = suppliers.filter(s => s.id !== supId);
    this.saveTable('suppliers', filtered);
    this.log('Xóa NCC', `Xóa nhà cung cấp: ${sup.name}`);
    return true;
  },

  // IMPORTS (Nhập kho)
  getImports() {
    return this.getTable('imports');
  },
  addImport(importData) {
    const imports = this.getImports();
    const products = this.getProducts();
    
    importData.id = 'imp-' + Date.now();
    importData.date = new Date().toISOString();
    
    // Update product stock
    importData.items.forEach(item => {
      const product = products.find(p => p.id === item.product_id);
      if (product) {
        product.current_stock = (Number(product.current_stock) || 0) + Number(item.quantity);
        product.cost_price = Number(item.unit_cost) || product.cost_price;
      }
    });
    
    imports.push(importData);
    this.saveTable('products', products); // Save updated stocks
    this.saveTable('imports', imports);   // Save import record
    
    this.log('Nhập kho', `Tạo phiếu nhập ${importData.id} cho ${importData.items.length} sản phẩm, tổng tiền: ${importData.total_cost.toLocaleString('vi-VN')}₫`);
    return importData;
  },

  // EXPORTS (Xuất kho)
  getExports() {
    return this.getTable('exports');
  },
  addExport(exportData) {
    const exports = this.getExports();
    const products = this.getProducts();
    
    exportData.id = 'exp-' + Date.now();
    exportData.date = new Date().toISOString();
    
    // Deduct product stock
    exportData.items.forEach(item => {
      const product = products.find(p => p.id === item.product_id);
      if (product) {
        const current = Number(product.current_stock) || 0;
        const qty = Number(item.quantity) || 0;
        if (qty > current) {
          throw new Error(`Sản phẩm "${product.name}" chỉ còn tồn kho ${current} ${product.unit}, không thể xuất ${qty}!`);
        }
        product.current_stock = current - qty;
        item.unit_cost = product.cost_price; // Save unit cost at export time
        item.total_cost = qty * product.cost_price;
      }
    });

    // Calculate total value
    exportData.total_value = exportData.items.reduce((sum, item) => sum + (item.total_cost || 0), 0);
    
    exports.push(exportData);
    this.saveTable('products', products); // Save updated stocks
    this.saveTable('exports', exports);   // Save export record
    
    this.log('Xuất kho', `Tạo phiếu xuất ${exportData.id} gồm ${exportData.items.length} sản phẩm, lý do chính: ${exportData.items[0]?.reason || 'Khác'}`);
    return exportData;
  },

  // COUNTS (Kiểm kho cuối ca)
  getCounts() {
    return this.getTable('counts');
  },
  addCount(countData) {
    const counts = this.getCounts();
    const products = this.getProducts();
    
    countData.id = 'cnt-' + Date.now();
    countData.date = new Date().toISOString();
    
    // Apply count quantities
    countData.items.forEach(item => {
      const product = products.find(p => p.id === item.product_id);
      if (product) {
        product.current_stock = Number(item.actual_stock);
      }
    });
    
    counts.push(countData);
    this.saveTable('products', products); // Save updated stocks
    this.saveTable('counts', counts);     // Save count record
    
    this.log('Kiểm kho', `Báo cáo kiểm kho ${countData.id} hoàn tất. Tổng chi phí chênh lệch: ${countData.total_difference_cost.toLocaleString('vi-VN')}₫`);
    return countData;
  },

  // USERS
  getUsers() {
    return this.getTable('users');
  },
  saveUser(user) {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === user.id);
    if (index !== -1) {
      users[index] = { ...users[index], ...user };
      this.log('Cập nhật User', `Sửa thông tin nhân viên: ${user.fullname} (@${user.username})`);
    } else {
      user.id = 'usr-' + Date.now();
      user.active = true;
      if (users.some(u => u.username.toLowerCase() === user.username.toLowerCase())) {
        throw new Error('Tên tài khoản này đã tồn tại trong hệ thống!');
      }
      users.push(user);
      this.log('Thêm User', `Thêm tài khoản nhân viên mới: ${user.fullname} (@${user.username})`);
    }
    this.saveTable('users', users);
    return user;
  },
  deleteUser(userId) {
    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      throw new Error('Bạn không thể xóa tài khoản của chính mình khi đang đăng nhập!');
    }
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return false;
    if (user.username === 'admin') {
      throw new Error('Không thể xóa tài khoản Admin hệ thống mặc định!');
    }

    const filtered = users.filter(u => u.id !== userId);
    this.saveTable('users', filtered);
    this.log('Xóa User', `Xóa tài khoản nhân viên: ${user.fullname} (@${user.username})`);
    return true;
  },
  getCurrentUser() {
    const user = localStorage.getItem('kho_current_user');
    return user ? JSON.parse(user) : null;
  },
  setCurrentUser(user) {
    localStorage.setItem('kho_current_user', JSON.stringify(user));
    this.log('Đăng nhập', `Người dùng chuyển sang vai trò: ${user.fullname} (${user.role.toUpperCase()})`);
  },

  // SYSTEM SETTINGS
  getSettings() {
    this.init();
    return JSON.parse(localStorage.getItem('kho_settings'));
  },
  saveSettings(settings) {
    localStorage.setItem('kho_settings', JSON.stringify(settings));
    this.log('Cài đặt', 'Cập nhật cài đặt hệ thống và thông tin cửa hàng');
  },

  // AUDIT LOGS
  getLogs() {
    return this.getTable('logs');
  },
  log(action, details) {
    const logs = this.getTable('logs');
    const currentUser = this.getCurrentUser();
    const userName = currentUser ? currentUser.fullname : 'Hệ thống';
    
    logs.unshift({
      id: 'log-' + Date.now() + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toISOString(),
      user_name: userName,
      action: action,
      details: details
    });
    
    if (logs.length > 500) logs.pop();
    
    this.saveTable('logs', logs);
  },

  // BACKUP & RESTORE
  backup() {
    const tables = ['categories', 'suppliers', 'products', 'users', 'settings', 'imports', 'exports', 'counts', 'logs'];
    const backupData = {};
    tables.forEach(table => {
      backupData[table] = this.getTable(table);
    });
    return JSON.stringify(backupData, null, 2);
  },
  restore(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      const tables = ['categories', 'suppliers', 'products', 'users', 'settings', 'imports', 'exports', 'counts', 'logs'];
      
      const keys = Object.keys(parsed);
      const hasRequired = tables.some(t => keys.includes(t));
      if (!hasRequired) {
        throw new Error('Định dạng tệp phục hồi không hợp lệ hoặc thiếu dữ liệu.');
      }
      
      tables.forEach(table => {
        if (parsed[table]) {
          this.saveTable(table, parsed[table]);
        }
      });
      
      localStorage.setItem('kho_initialized', 'true');
      this.log('Khôi phục dữ liệu', 'Phục hồi toàn bộ cơ sở dữ liệu từ file sao lưu');
      return true;
    } catch (e) {
      console.error(e);
      throw new Error('Lỗi giải mã tệp dữ liệu: ' + e.message);
    }
  }
};

// Auto initialize database immediately
DB.init();

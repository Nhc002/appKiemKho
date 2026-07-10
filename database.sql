-- ==========================================
-- HỆ THỐNG QUẢN LÝ KHO FABI IPOS - SUPABASE DATABASE SCHEMA
-- ==========================================
-- Sử dụng BIGINT cho ID vì ứng dụng dùng Date.now() (timestamp 13 chữ số)

-- 1. Suppliers Table (Nhà cung cấp)
CREATE TABLE IF NOT EXISTS suppliers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(100),
    address TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Ingredients Table (Nguyên liệu kho)
CREATE TABLE IF NOT EXISTS ingredients (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    cost_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
    current_stock NUMERIC(12, 3) NOT NULL DEFAULT 0,
    min_stock NUMERIC(12, 3) NOT NULL DEFAULT 0,
    supplier_id BIGINT REFERENCES suppliers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Products Table (Sản phẩm từ Fabi iPOS)
CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    item_id VARCHAR(100) UNIQUE NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    price NUMERIC(15, 2) NOT NULL DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    recipe_missing BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Recipes Table (Định lượng BOM)
CREATE TABLE IF NOT EXISTS recipes (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Recipe Items Table (Chi tiết định lượng)
CREATE TABLE IF NOT EXISTS recipe_items (
    id BIGSERIAL PRIMARY KEY,
    recipe_id BIGINT REFERENCES recipes(id) ON DELETE CASCADE,
    ingredient_id BIGINT REFERENCES ingredients(id) ON DELETE CASCADE,
    quantity NUMERIC(12, 4) NOT NULL
);

-- 6. Inventory Imports Table (Phiếu nhập kho)
CREATE TABLE IF NOT EXISTS inventory_imports (
    id BIGSERIAL PRIMARY KEY,
    supplier_id BIGINT REFERENCES suppliers(id) ON DELETE SET NULL,
    total_cost NUMERIC(15, 2) NOT NULL,
    note TEXT,
    user_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Import Items Table (Chi tiết phiếu nhập)
CREATE TABLE IF NOT EXISTS import_items (
    id BIGSERIAL PRIMARY KEY,
    import_id BIGINT REFERENCES inventory_imports(id) ON DELETE CASCADE,
    ingredient_id BIGINT REFERENCES ingredients(id) ON DELETE CASCADE,
    quantity NUMERIC(12, 3) NOT NULL,
    unit_cost NUMERIC(15, 2) NOT NULL,
    total_cost NUMERIC(15, 2) NOT NULL
);

-- 8. Inventory Exports Table (Phiếu xuất kho)
CREATE TABLE IF NOT EXISTS inventory_exports (
    id BIGSERIAL PRIMARY KEY,
    note TEXT,
    user_id VARCHAR(100),
    total_value NUMERIC(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Export Items Table (Chi tiết phiếu xuất)
CREATE TABLE IF NOT EXISTS export_items (
    id BIGSERIAL PRIMARY KEY,
    export_id BIGINT REFERENCES inventory_exports(id) ON DELETE CASCADE,
    ingredient_id BIGINT REFERENCES ingredients(id) ON DELETE CASCADE,
    quantity NUMERIC(12, 3) NOT NULL,
    reason TEXT NOT NULL,
    unit_cost NUMERIC(15, 2) NOT NULL,
    total_cost NUMERIC(15, 2) NOT NULL
);

-- 10. Inventory Counts Table (Phiếu kiểm kho)
CREATE TABLE IF NOT EXISTS inventory_counts (
    id BIGSERIAL PRIMARY KEY,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id VARCHAR(100),
    total_difference_cost NUMERIC(15, 2) NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Count Items Table (Chi tiết phiếu kiểm kho)
CREATE TABLE IF NOT EXISTS count_items (
    id BIGSERIAL PRIMARY KEY,
    count_id BIGINT REFERENCES inventory_counts(id) ON DELETE CASCADE,
    ingredient_id BIGINT REFERENCES ingredients(id) ON DELETE CASCADE,
    expected_stock NUMERIC(12, 3) NOT NULL,
    actual_stock NUMERIC(12, 3) NOT NULL,
    difference NUMERIC(12, 3) NOT NULL,
    difference_cost NUMERIC(15, 2) NOT NULL
);

-- 12. Sales Table (Lịch sử đồng bộ doanh số iPOS)
CREATE TABLE IF NOT EXISTS sales (
    id BIGSERIAL PRIMARY KEY,
    sync_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    start_date VARCHAR(50) NOT NULL,
    end_date VARCHAR(50) NOT NULL,
    total_revenue_net NUMERIC(15, 2) NOT NULL,
    total_revenue_gross NUMERIC(15, 2) NOT NULL,
    total_cogs NUMERIC(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Sale Items Table (Chi tiết sản phẩm bán ra)
CREATE TABLE IF NOT EXISTS sale_items (
    id BIGSERIAL PRIMARY KEY,
    sale_id BIGINT REFERENCES sales(id) ON DELETE CASCADE,
    product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
    quantity_sold NUMERIC(12, 3) NOT NULL,
    revenue_net NUMERIC(15, 2) NOT NULL,
    revenue_gross NUMERIC(15, 2) NOT NULL,
    discount_amount NUMERIC(15, 2) DEFAULT 0,
    cogs NUMERIC(15, 2) NOT NULL
);

-- 14. Logs Table (Nhật ký hệ thống)
CREATE TABLE IF NOT EXISTS logs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_name VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT
);

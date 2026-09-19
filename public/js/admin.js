/**
 * DWARKESH ORGANIC FARMS - ADMIN CONTROLLER
 * Full CRUD, reliable modal delete, hero poster & payment manager, and credential settings.
 */

const adminState = {
  products: [],
  orders: [],
  currentTab: 'dashboard',
  searchQuery: '',
  selectedCategory: 'all',
  pendingDeleteId: null
};

document.addEventListener('DOMContentLoaded', () => {
  checkAdminAuth();
});

// Admin Authentication Check
function checkAdminAuth() {
  const token = sessionStorage.getItem('dwk_admin_token');
  const overlay = document.getElementById('adminLoginOverlay');

  if (token) {
    if (overlay) overlay.style.display = 'none';
    const savedUser = sessionStorage.getItem('dwk_admin_user') || 'admin001';
    document.getElementById('adminUsernameDisplay').textContent = savedUser;
    initAdminData();
  } else {
    if (overlay) overlay.style.display = 'flex';
  }
}

async function handleAdminLogin(e) {
  e.preventDefault();
  const username = document.getElementById('adminLoginUser').value.trim();
  const password = document.getElementById('adminLoginPass').value.trim();

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (data.success) {
      sessionStorage.setItem('dwk_admin_token', data.token);
      sessionStorage.setItem('dwk_admin_user', data.username);
      document.getElementById('adminLoginOverlay').style.display = 'none';
      document.getElementById('adminUsernameDisplay').textContent = data.username;
      initAdminData();
    } else {
      alert(data.message || 'Invalid admin credentials');
    }
  } catch (err) {
    console.error(err);
    alert('Server connection error');
  }
}

function handleAdminLogout() {
  sessionStorage.removeItem('dwk_admin_token');
  sessionStorage.removeItem('dwk_admin_user');
  window.location.reload();
}

function initAdminData() {
  fetchDashboardStats();
  fetchAdminProducts();
  fetchAdminCategories();
  fetchAdminLabReports();
  fetchAdminOrders();
  fetchAdminSettings();
}

// Switch Admin Tab
function switchAdminTab(tabName, clickedElement) {
  adminState.currentTab = tabName;

  document.querySelectorAll('.admin-nav-link').forEach(link => link.classList.remove('active'));
  if (clickedElement) {
    clickedElement.classList.add('active');
  } else {
    document.querySelectorAll('.admin-nav-link').forEach(link => {
      if (link.getAttribute('onclick')?.includes(tabName)) {
        link.classList.add('active');
      }
    });
  }

  const titles = {
    dashboard: 'Dashboard Overview',
    products: 'Manage Farm Products (Add / Edit / Delete)',
    categories: 'Store Categories (Add & Delete)',
    labreports: 'Farm Lab Reports & Purity Certificates (Add & Delete)',
    orders: 'Customer Orders & Dispatch Management',
    hero: 'Hero Section Promotional Poster',
    payments: 'Payment Gateways Configuration (UPI, Razorpay, PayPal, COD)',
    sheets: 'Google Sheets Automated Data Sync (Real-time Orders & Customers)',
    settings: 'Store General Settings & Password Security'
  };
  document.getElementById('pageTitle').textContent = titles[tabName] || 'Admin Portal';

  document.querySelectorAll('.tab-content').forEach(section => section.classList.remove('active'));
  const targetSection = document.getElementById(`tab-${tabName}`);
  if (targetSection) targetSection.classList.add('active');

  if (tabName === 'dashboard') fetchDashboardStats();
  if (tabName === 'products') fetchAdminProducts();
  if (tabName === 'categories') fetchAdminCategories();
  if (tabName === 'labreports') fetchAdminLabReports();
  if (tabName === 'orders') fetchAdminOrders();
  if (tabName === 'hero' || tabName === 'payments' || tabName === 'settings') fetchAdminSettings();
  if (tabName === 'sheets') fetchGoogleSheetsSettings();
}

// -------------------------------------------------------------
// 1. DASHBOARD OVERVIEW & STATS
// -------------------------------------------------------------
async function fetchDashboardStats() {
  try {
    const res = await fetch('/api/stats');
    const data = await res.json();

    if (data.success && data.stats) {
      const s = data.stats;
      document.getElementById('kpiRevenue').textContent = `₹${s.totalRevenue.toLocaleString('en-IN')}`;
      document.getElementById('kpiOrders').textContent = s.totalOrders;
      document.getElementById('kpiProducts').textContent = s.totalProducts;
      document.getElementById('kpiAlerts').textContent = s.lowStockCount;

      renderRecentOrders(s.recentOrders || []);
    }
  } catch (err) {
    console.error('Error fetching stats:', err);
  }
}

function renderRecentOrders(recentOrders) {
  const tbody = document.getElementById('recentOrdersTbody');
  if (recentOrders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--admin-text-muted);">No orders placed yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = recentOrders.map(order => `
    <tr>
      <td><strong>#${order.order_number}</strong></td>
      <td>${order.customer_name}</td>
      <td><strong>₹${order.total.toLocaleString('en-IN')}</strong></td>
      <td>
        <span class="status-pill status-${order.order_status.toLowerCase()}">${order.order_status}</span>
      </td>
      <td style="color: var(--admin-text-muted); font-size: 12px;">${order.created_at}</td>
    </tr>
  `).join('');
}

// -------------------------------------------------------------
// 2. PRODUCT MANAGEMENT (FULL CRUD WITH RELIABLE MODAL DELETE)
// -------------------------------------------------------------
async function fetchAdminProducts() {
  try {
    const res = await fetch('/api/products');
    const data = await res.json();

    if (data.success) {
      adminState.products = data.products;
      renderAdminProductsTable();
    }
  } catch (err) {
    console.error('Error loading products:', err);
  }
}

function renderAdminProductsTable() {
  const tbody = document.getElementById('adminProductsTbody');
  let list = [...adminState.products];

  if (adminState.selectedCategory !== 'all') {
    list = list.filter(p => p.category_slug === adminState.selectedCategory);
  }

  if (adminState.searchQuery) {
    const q = adminState.searchQuery.toLowerCase();
    list = list.filter(p => p.title.toLowerCase().includes(q));
  }

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 30px; color: var(--admin-text-muted);">
          No products found.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list.map(prod => `
    <tr id="adminProductRow-${prod.id}">
      <td>
        <img src="${prod.image_url}" alt="${prod.title}" class="table-thumb">
      </td>
      <td>
        <strong style="color: var(--admin-primary);">${prod.title}</strong>
        <div style="font-size: 11px; color: var(--admin-text-muted);">${prod.short_desc || ''}</div>
      </td>
      <td>
        <span style="background: #EBF3E8; color: var(--admin-primary); font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px;">
          ${prod.category_slug}
        </span>
      </td>
      <td><strong style="color: var(--admin-primary);">₹${prod.price.toLocaleString('en-IN')}</strong></td>
      <td style="color: var(--admin-text-muted); text-decoration: line-through;">₹${prod.original_price.toLocaleString('en-IN')}</td>
      <td>
        <span style="font-weight: 700; color: ${prod.stock < 20 ? 'var(--admin-danger)' : 'var(--admin-success)'};">
          ${prod.stock} units
        </span>
      </td>
      <td>
        ${prod.badge ? `<span class="status-pill status-delivered" style="font-size: 10px;">${prod.badge}</span>` : '-'}
      </td>
      <td>★ ${prod.rating || 4.9}</td>
      <td>
        <div style="display: flex; gap: 6px;">
          <button class="btn-admin btn-admin-secondary" style="padding: 5px 10px; font-size: 11px;" onclick="openEditProductModal(${prod.id})">
            Edit
          </button>
          <button class="btn-admin btn-admin-danger" style="padding: 5px 10px; font-size: 11px;" onclick="openDeleteConfirmModal(${prod.id}, '${prod.title.replace(/'/g, "\\'")}')">
            Delete
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function handleAdminProductSearch(query) {
  adminState.searchQuery = query.trim();
  renderAdminProductsTable();
}

function handleAdminCategoryFilter(category) {
  adminState.selectedCategory = category;
  renderAdminProductsTable();
}

function openAddProductModal() {
  document.getElementById('modalTitle').textContent = 'Add New Farm Product';
  document.getElementById('editProductId').value = '';
  document.getElementById('productForm').reset();
  document.getElementById('saveProductSubmitBtn').textContent = 'Create Product';
  document.getElementById('productModal').classList.add('open');
}

async function openEditProductModal(productId) {
  document.getElementById('modalTitle').textContent = 'Edit Farm Product';
  document.getElementById('editProductId').value = productId;
  document.getElementById('saveProductSubmitBtn').textContent = 'Update Product';

  try {
    const res = await fetch(`/api/products/${productId}`);
    const data = await res.json();

    if (data.success && data.product) {
      const p = data.product;
      document.getElementById('prodTitle').value = p.title;
      document.getElementById('prodCategory').value = p.category_slug;
      document.getElementById('prodPrice').value = p.price;
      document.getElementById('prodOriginalPrice').value = p.original_price;
      document.getElementById('prodStock').value = p.stock;
      document.getElementById('prodImageUrl').value = p.image_url;
      document.getElementById('prodBadge').value = p.badge || '';
      document.getElementById('prodShortDesc').value = p.short_desc || '';
      document.getElementById('prodDescription').value = p.description || '';
      document.getElementById('prodVariants').value = JSON.stringify(p.variants || [], null, 2);

      document.getElementById('productModal').classList.add('open');
    }
  } catch (err) {
    console.error(err);
    alert('Failed to load product details for editing.');
  }
}

function closeProductModal() {
  document.getElementById('productModal').classList.remove('open');
}

async function handleSaveProduct(event) {
  event.preventDefault();

  const id = document.getElementById('editProductId').value;
  const title = document.getElementById('prodTitle').value.trim();
  const category_slug = document.getElementById('prodCategory').value;
  const price = Number(document.getElementById('prodPrice').value);
  const original_price = Number(document.getElementById('prodOriginalPrice').value || price);
  const stock = Number(document.getElementById('prodStock').value || 50);
  const image_url = document.getElementById('prodImageUrl').value.trim();
  const badge = document.getElementById('prodBadge').value.trim();
  const short_desc = document.getElementById('prodShortDesc').value.trim();
  const description = document.getElementById('prodDescription').value.trim();

  let variants = [];
  const variantsRaw = document.getElementById('prodVariants').value.trim();
  if (variantsRaw) {
    try {
      variants = JSON.parse(variantsRaw);
    } catch (e) {
      alert('Invalid JSON in variants field');
      return;
    }
  }

  const payload = {
    title,
    category_slug,
    price,
    original_price,
    stock,
    image_url,
    badge,
    short_desc,
    description,
    variants
  };

  const isEdit = Boolean(id);
  const url = isEdit ? `/api/products/${id}` : '/api/products';
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (data.success) {
      alert(isEdit ? 'Product updated successfully!' : 'New product created successfully!');
      closeProductModal();
      fetchAdminProducts();
      fetchDashboardStats();
    } else {
      alert(data.message || 'Error saving product');
    }
  } catch (err) {
    console.error(err);
    alert('Failed to save product to database.');
  }
}

// Custom Reliable Modal Delete (User requested fix)
function openDeleteConfirmModal(id, title) {
  adminState.pendingDeleteId = id;
  document.getElementById('deleteProductTitleName').textContent = `"${title}"`;
  document.getElementById('deleteConfirmModal').classList.add('open');
}

function closeDeleteConfirmModal() {
  adminState.pendingDeleteId = null;
  document.getElementById('deleteConfirmModal').classList.remove('open');
}

async function executeDeleteProduct() {
  const id = adminState.pendingDeleteId;
  if (!id) return;

  const btn = document.getElementById('confirmDeleteButton');
  btn.textContent = 'Deleting...';
  btn.disabled = true;

  try {
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    const data = await res.json();

    if (data.success) {
      closeDeleteConfirmModal();
      // Instantly remove row from DOM
      const row = document.getElementById(`adminProductRow-${id}`);
      if (row) row.remove();
      // Refresh local array
      adminState.products = adminState.products.filter(p => p.id !== id);
      fetchDashboardStats();
      alert('✅ Product deleted permanently from store database!');
    } else {
      alert(data.message || 'Error deleting product');
    }
  } catch (err) {
    console.error(err);
    alert('Server error deleting product');
  } finally {
    btn.textContent = 'Yes, Delete Permanently';
    btn.disabled = false;
  }
}

// -------------------------------------------------------------
// 3. CUSTOMER ORDERS MANAGEMENT
// -------------------------------------------------------------
async function fetchAdminOrders(status = 'all') {
  try {
    const url = status === 'all' ? '/api/orders' : `/api/orders?status=${encodeURIComponent(status)}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.success) {
      adminState.orders = data.orders;
      renderAdminOrdersTable();
    }
  } catch (err) {
    console.error('Error loading orders:', err);
  }
}

function renderAdminOrdersTable() {
  const tbody = document.getElementById('adminOrdersTbody');

  if (adminState.orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 24px; color: var(--admin-text-muted);">No orders found.</td></tr>`;
    return;
  }

  tbody.innerHTML = adminState.orders.map(order => {
    const items = order.items || [];
    const itemsSummary = items.map(it => `<div>&bull; ${it.title} (${it.variantLabel}) &times; <strong>${it.quantity}</strong></div>`).join('');

    return `
      <tr>
        <td><strong style="color: var(--admin-primary);">#${order.order_number}</strong></td>
        <td style="font-size: 11px; color: var(--admin-text-muted);">${order.created_at}</td>
        <td>
          <div style="font-weight: 700;">${order.customer_name}</div>
          <div style="font-size: 12px; color: var(--admin-text-muted);">📞 ${order.customer_phone}</div>
        </td>
        <td style="font-size: 12px; max-width: 180px;">${order.address}, ${order.city} - ${order.pincode}</td>
        <td style="font-size: 11px;">${itemsSummary}</td>
        <td><strong style="color: var(--admin-primary); font-size: 14px;">₹${order.total.toLocaleString('en-IN')}</strong></td>
        <td><span style="font-weight: 600; font-size: 12px;">${order.payment_method}</span></td>
        <td>
          <select class="status-select" onchange="handleUpdateOrderStatus(${order.id}, this.value, this)">
            <option value="Pending" ${order.order_status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="Processing" ${order.order_status === 'Processing' ? 'selected' : ''}>Processing</option>
            <option value="Shipped" ${order.order_status === 'Shipped' ? 'selected' : ''}>Shipped</option>
            <option value="Delivered" ${order.order_status === 'Delivered' ? 'selected' : ''}>Delivered</option>
            <option value="Cancelled" ${order.order_status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </td>
      </tr>
    `;
  }).join('');
}

async function handleUpdateOrderStatus(orderId, newStatus, selectEl) {
  try {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_status: newStatus })
    });

    const data = await res.json();
    if (data.success) {
      selectEl.style.backgroundColor = '#E8F5E9';
      setTimeout(() => { selectEl.style.backgroundColor = '#FFFFFF'; }, 1000);
      fetchDashboardStats();
    }
  } catch (err) {
    console.error(err);
    alert('Failed to update status on server');
  }
}

// -------------------------------------------------------------
// 4. HERO SECTION POSTER BANNER MANAGEMENT
// -------------------------------------------------------------
async function handleSaveHeroPoster(e) {
  e.preventDefault();

  const payload = {
    hero_poster_url: document.getElementById('heroPosterUrl').value.trim(),
    hero_poster_badge: document.getElementById('heroPosterBadge').value.trim(),
    hero_poster_title: document.getElementById('heroPosterTitle').value.trim(),
    hero_poster_subtitle: document.getElementById('heroPosterSubtitle').value.trim(),
    hero_poster_button_text: document.getElementById('heroPosterButtonText').value.trim()
  };

  try {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      alert('✅ Hero Section poster and promotional banner updated on storefront!');
    }
  } catch (err) {
    console.error(err);
    alert('Failed to update hero poster');
  }
}

// -------------------------------------------------------------
// 5. PAYMENT GATEWAYS MANAGEMENT (UPI, RAZORPAY, PAYPAL, COD)
// -------------------------------------------------------------
function toggleSecretVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🔒';
  } else {
    input.type = 'password';
    btn.textContent = '👁️';
  }
}

async function testRazorpayCredentials() {
  const key_id = (document.getElementById('adminRazorpayKeyId')?.value || document.getElementById('adminRazorpayKey')?.value || '').trim();
  const key_secret = (document.getElementById('adminRazorpayKeySecret')?.value || '').trim();
  const statusEl = document.getElementById('razorpayTestStatus');
  const btn = document.getElementById('btnTestRazorpay');

  if (!key_id || !key_secret) {
    if (statusEl) {
      statusEl.innerHTML = '<span style="color: #D32F2F;">⚠️ Please enter both Razorpay Key ID and Key Secret before testing.</span>';
    }
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Testing Connection...';
  }
  if (statusEl) {
    statusEl.innerHTML = '<span style="color: #0C75EB;">Connecting to Razorpay API server...</span>';
  }

  try {
    const res = await fetch('/api/admin/razorpay/test-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key_id, key_secret })
    });
    const data = await res.json();

    if (data.success) {
      if (statusEl) {
        statusEl.innerHTML = `<span style="color: #2E7D32;">${data.message}</span>`;
      }
    } else {
      if (statusEl) {
        statusEl.innerHTML = `<span style="color: #D32F2F;">${data.message}</span>`;
      }
    }
  } catch (err) {
    console.error('Test keys error:', err);
    if (statusEl) {
      statusEl.innerHTML = '<span style="color: #D32F2F;">❌ Failed to reach server. Please try again.</span>';
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '⚡ Test Razorpay Connection';
    }
  }
}

async function handleSavePaymentSettings(e) {
  e.preventDefault();

  const rzpKeyId = (document.getElementById('adminRazorpayKeyId')?.value || document.getElementById('adminRazorpayKey')?.value || '').trim();
  const rzpKeySecret = (document.getElementById('adminRazorpayKeySecret')?.value || '').trim();
  const rzpActive = document.getElementById('adminRazorpayActive') ? String(document.getElementById('adminRazorpayActive').checked) : 'true';

  const payload = {
    payment_upi_id: document.getElementById('adminUpiId').value.trim(),
    payment_upi_qr: document.getElementById('adminUpiQr').value.trim(),
    payment_razorpay_key_id: rzpKeyId,
    payment_razorpay_key: rzpKeyId,
    payment_razorpay_key_secret: rzpKeySecret,
    payment_razorpay_active: rzpActive,
    payment_paypal_email: document.getElementById('adminPaypalEmail').value.trim()
  };

  try {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      alert('✅ Payment gateways saved! Real-time Razorpay checkout & UPI are updated.');
    }
  } catch (err) {
    console.error(err);
    alert('Failed to update payment gateways');
  }
}

// -------------------------------------------------------------
// 6. STORE GENERAL SETTINGS & ADMIN PASSWORD CHANGE
// -------------------------------------------------------------
async function fetchAdminSettings() {
  try {
    const token = sessionStorage.getItem('dwk_admin_token') || '';
    const res = await fetch('/api/settings', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    if (data.success && data.settings) {
      const s = data.settings;
      if (s.shop_name) document.getElementById('settingShopName').value = s.shop_name;
      if (s.announcement_ticker) document.getElementById('settingTicker').value = s.announcement_ticker;
      if (s.standard_shipping_fee && document.getElementById('settingStandardShipping')) {
        document.getElementById('settingStandardShipping').value = s.standard_shipping_fee;
      } else if (document.getElementById('settingStandardShipping')) {
        document.getElementById('settingStandardShipping').value = '99';
      }
      if (s.free_shipping_threshold) document.getElementById('settingFreeShipping').value = s.free_shipping_threshold;
      if (s.phone) document.getElementById('settingPhone').value = s.phone;

      // Hero Poster fields
      if (s.hero_poster_url) {
        document.getElementById('heroPosterUrl').value = s.hero_poster_url;
        document.getElementById('posterLivePreview').src = s.hero_poster_url;
      }
      if (s.hero_poster_badge) document.getElementById('heroPosterBadge').value = s.hero_poster_badge;
      if (s.hero_poster_title) document.getElementById('heroPosterTitle').value = s.hero_poster_title;
      if (s.hero_poster_subtitle) document.getElementById('heroPosterSubtitle').value = s.hero_poster_subtitle;
      if (s.hero_poster_button_text) document.getElementById('heroPosterButtonText').value = s.hero_poster_button_text;

      // Payment fields
      if (s.payment_upi_id) document.getElementById('adminUpiId').value = s.payment_upi_id;
      if (s.payment_upi_qr) {
        document.getElementById('adminUpiQr').value = s.payment_upi_qr;
        const p = document.getElementById('adminUpiQrPreview');
        if (p) p.src = s.payment_upi_qr;
      }
      const rzpKey = s.payment_razorpay_key_id || s.payment_razorpay_key || '';
      if (rzpKey) {
        if (document.getElementById('adminRazorpayKeyId')) document.getElementById('adminRazorpayKeyId').value = rzpKey;
        if (document.getElementById('adminRazorpayKey')) document.getElementById('adminRazorpayKey').value = rzpKey;
      }
      if (s.payment_razorpay_key_secret && document.getElementById('adminRazorpayKeySecret')) {
        document.getElementById('adminRazorpayKeySecret').value = s.payment_razorpay_key_secret;
      }
      if (s.payment_razorpay_active !== undefined && document.getElementById('adminRazorpayActive')) {
        document.getElementById('adminRazorpayActive').checked = (s.payment_razorpay_active === 'true' || s.payment_razorpay_active === true);
      }
      if (s.payment_paypal_email) document.getElementById('adminPaypalEmail').value = s.payment_paypal_email;
    }
  } catch (err) {
    console.error(err);
  }
}

async function handleSaveGeneralSettings(e) {
  e.preventDefault();

  const payload = {
    shop_name: document.getElementById('settingShopName').value.trim(),
    announcement_ticker: document.getElementById('settingTicker').value.trim(),
    standard_shipping_fee: document.getElementById('settingStandardShipping') ? document.getElementById('settingStandardShipping').value.trim() : '99',
    free_shipping_threshold: document.getElementById('settingFreeShipping').value.trim(),
    phone: document.getElementById('settingPhone').value.trim()
  };

  try {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      alert('✅ General store settings updated successfully!');
    }
  } catch (err) {
    console.error(err);
    alert('Failed to save settings');
  }
}

async function handleChangeAdminCredentials(e) {
  e.preventDefault();

  const current_password = document.getElementById('currAdminPass').value.trim();
  const new_username = document.getElementById('newAdminUser').value.trim();
  const new_password = document.getElementById('newAdminPass').value.trim();

  try {
    const res = await fetch('/api/admin/change-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password, new_username, new_password })
    });
    const data = await res.json();

    if (data.success) {
      alert('✅ ' + data.message);
      handleAdminLogout();
    } else {
      alert(data.message || 'Error updating admin credentials');
    }
  } catch (err) {
    console.error(err);
    alert('Failed to change admin credentials');
  }
}

// -------------------------------------------------------------
// CATEGORIES MANAGEMENT (ADD & DELETE)
// -------------------------------------------------------------
let pendingDeleteCategoryId = null;

async function fetchAdminCategories() {
  const tbody = document.getElementById('adminCategoriesTbody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="6" style="text-align: center;">Loading categories...</td></tr>`;

  try {
    const res = await fetch('/api/categories');
    const data = await res.json();
    if (data.success && data.categories) {
      if (data.categories.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--admin-text-muted);">No categories found.</td></tr>`;
        return;
      }
      tbody.innerHTML = data.categories.map(c => `
        <tr id="catRow-${c.id}">
          <td><strong>#${c.id}</strong></td>
          <td style="font-size: 20px;">${c.icon || '🌾'}</td>
          <td style="font-weight: 700; color: var(--admin-primary);">${c.name}</td>
          <td><code>${c.slug}</code></td>
          <td style="color: var(--admin-text-muted); font-size: 12px;">${c.tagline || '—'}</td>
          <td>
            <button class="btn-action btn-delete" onclick="openDeleteCategoryModal(${c.id}, '${c.name.replace(/'/g, "\\'")}')">
              <span>🗑️ Delete</span>
            </button>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Error fetching categories:', err);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">Error loading categories.</td></tr>`;
  }
}

async function handleCreateCategory(e) {
  e.preventDefault();
  const name = document.getElementById('newCatName').value.trim();
  const slug = document.getElementById('newCatSlug').value.trim();
  const icon = document.getElementById('newCatIcon').value.trim() || '🌾';
  const tagline = document.getElementById('newCatTagline').value.trim();

  try {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug, icon, tagline })
    });
    const data = await res.json();
    if (data.success) {
      alert('✅ ' + data.message);
      document.getElementById('newCatName').value = '';
      document.getElementById('newCatSlug').value = '';
      document.getElementById('newCatTagline').value = '';
      fetchAdminCategories();
    } else {
      alert(data.message || 'Error creating category');
    }
  } catch (err) {
    console.error(err);
    alert('Server error creating category');
  }
}

function openDeleteCategoryModal(id, name) {
  pendingDeleteCategoryId = id;
  document.getElementById('deleteCategoryNameText').textContent = `"${name}"`;
  document.getElementById('deleteCategoryConfirmModal').classList.add('open');
}

function closeDeleteCategoryConfirmModal() {
  pendingDeleteCategoryId = null;
  document.getElementById('deleteCategoryConfirmModal').classList.remove('open');
}

async function executeDeleteCategory() {
  if (!pendingDeleteCategoryId) return;

  const btn = document.getElementById('confirmDeleteCategoryButton');
  btn.disabled = true;
  btn.textContent = 'Deleting...';

  try {
    const res = await fetch(`/api/categories/${pendingDeleteCategoryId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      const row = document.getElementById(`catRow-${pendingDeleteCategoryId}`);
      if (row) row.remove();
      closeDeleteCategoryConfirmModal();
      alert('✅ ' + data.message);
    } else {
      alert(data.message || 'Could not delete category');
    }
  } catch (err) {
    console.error(err);
    alert('Server error while deleting category');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Yes, Delete';
  }
}

// -------------------------------------------------------------
// LAB REPORTS MANAGEMENT (CRUD)
// -------------------------------------------------------------
let pendingDeleteLabReportId = null;

async function fetchAdminLabReports() {
  const tbody = document.getElementById('adminLabReportsTbody');
  if (!tbody) return;

  try {
    const res = await fetch('/api/lab-reports');
    const data = await res.json();
    if (data.success && data.reports) {
      if (data.reports.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--admin-text-muted);">No lab reports found.</td></tr>`;
        return;
      }
      tbody.innerHTML = data.reports.map(r => `
        <tr id="labReportRow-${r.id}">
          <td><strong>#${r.id}</strong></td>
          <td><strong>${r.title}</strong></td>
          <td><span style="background: #EAE8E2; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 12px;">${r.batch_number}</span></td>
          <td style="font-size: 12px;">${r.lab_name}</td>
          <td style="font-size: 12px; max-width: 220px;">${r.parameters}</td>
          <td><span style="color: #2E7D32; font-weight: 700; font-size: 12px;">${r.result_status}</span></td>
          <td>
            <a href="/api/lab-reports/download/${encodeURIComponent(r.batch_number)}" target="_blank" class="btn-admin btn-admin-secondary" style="padding: 4px 10px; font-size: 11px; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
              <span>📄</span> View / Print
            </a>
          </td>
          <td>
            <button class="btn-admin btn-admin-danger" style="padding: 4px 10px; font-size: 11px;" onclick="openDeleteLabReportModal(${r.id}, '${r.title.replace(/'/g, "\\'")}')">
              🗑️ Delete
            </button>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Error fetching lab reports:', err);
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: red;">Error loading lab reports.</td></tr>`;
  }
}

async function handleCreateLabReport(e) {
  e.preventDefault();
  const title = document.getElementById('newReportTitle').value.trim();
  const batch_number = document.getElementById('newReportBatch').value.trim();
  const tested_date = document.getElementById('newReportDate').value.trim();
  const lab_name = document.getElementById('newReportLab').value.trim();
  const parameters = document.getElementById('newReportParams').value.trim();
  const result_status = document.getElementById('newReportStatus').value.trim();

  try {
    const res = await fetch('/api/lab-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, batch_number, tested_date, lab_name, parameters, result_status })
    });
    const data = await res.json();
    if (data.success) {
      alert('✅ ' + data.message);
      document.getElementById('newReportTitle').value = '';
      document.getElementById('newReportBatch').value = '';
      document.getElementById('newReportDate').value = 'Current Harvest 2026';
      document.getElementById('newReportParams').value = 'A2 Beta-Casein, 0% Palm Oil, RM Value > 28, Zero Glyphosate';
      fetchAdminLabReports();
    } else {
      alert(data.message || 'Error creating lab report');
    }
  } catch (err) {
    console.error(err);
    alert('Server error creating lab report');
  }
}

function openDeleteLabReportModal(id, title) {
  pendingDeleteLabReportId = id;
  document.getElementById('deleteLabReportTitleText').textContent = `"${title}"`;
  document.getElementById('deleteLabReportConfirmModal').classList.add('open');
}

function closeDeleteLabReportConfirmModal() {
  pendingDeleteLabReportId = null;
  document.getElementById('deleteLabReportConfirmModal').classList.remove('open');
}

async function executeDeleteLabReport() {
  if (!pendingDeleteLabReportId) return;

  const btn = document.getElementById('confirmDeleteLabReportButton');
  btn.disabled = true;
  btn.textContent = 'Deleting...';

  try {
    const res = await fetch(`/api/lab-reports/${pendingDeleteLabReportId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      const row = document.getElementById(`labReportRow-${pendingDeleteLabReportId}`);
      if (row) row.remove();
      closeDeleteLabReportConfirmModal();
      alert('✅ ' + data.message);
    } else {
      alert(data.message || 'Could not delete lab report');
    }
  } catch (err) {
    console.error(err);
    alert('Server error while deleting lab report');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Yes, Delete';
  }
}

// -------------------------------------------------------------
// 8. FILE UPLOAD HANDLER (MULTER / CHOOSE FILE)
// -------------------------------------------------------------
async function uploadImageFromFile(fileInput, targetUrlInputId, previewImgId) {
  const file = fileInput.files && fileInput.files[0];
  if (!file) return;

  if (file.size === 0) {
    alert('❌ The selected file is empty (0 bytes). Please select a valid picture or screenshot from your device.');
    fileInput.value = '';
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  const parentLabel = fileInput.parentElement;
  if (parentLabel) {
    parentLabel.style.opacity = '0.5';
    parentLabel.style.pointerEvents = 'none';
  }

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (data.success && data.url) {
      const targetInput = document.getElementById(targetUrlInputId);
      if (targetInput) {
        targetInput.value = data.url;
      }
      if (previewImgId) {
        const preview = document.getElementById(previewImgId);
        if (preview) {
          preview.src = data.url;
          preview.style.display = 'block';
        }
      }

      // Auto-save setting if updating UPI QR or Hero Poster
      if (targetUrlInputId === 'adminUpiQr') {
        await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payment_upi_qr: data.url })
        });
        alert('✅ UPI QR Code uploaded & saved successfully! It is now active on checkout.');
      } else if (targetUrlInputId === 'heroPosterUrl') {
        await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hero_poster_url: data.url })
        });
        alert('✅ Hero Poster uploaded & saved successfully! It is now active on the storefront.');
      } else {
        alert('✅ File uploaded successfully: ' + data.url);
      }
    } else {
      alert('❌ Upload failed: ' + (data.message || 'Unknown error'));
    }
  } catch (err) {
    console.error('File upload failed:', err);
    alert('❌ File upload failed: ' + err.message);
  } finally {
    if (parentLabel) {
      parentLabel.style.opacity = '1';
      parentLabel.style.pointerEvents = 'auto';
    }
    fileInput.value = '';
  }
}

// -------------------------------------------------------------
// 9. GOOGLE SHEETS AUTOMATED SYNC HANDLERS
// -------------------------------------------------------------
const GOOGLE_APPS_SCRIPT_CODE = `/**
 * =========================================================================
 * DWARKESH INDIA FARMS - AUTOMATIC GOOGLE SHEETS SYNC SCRIPT
 * =========================================================================
 * 1. Open your Google Sheet (sheets.new)
 * 2. Click Extensions > Apps Script
 * 3. Delete existing text, paste this complete script, and Click Save (Ctrl+S)
 * 4. Click Deploy > New deployment
 * 5. Select type: 'Web app'
 * 6. Set 'Execute as' = 'Me', 'Who has access' = 'Anyone'
 * 7. Click Deploy, copy Web app URL, and paste it into Dwarkesh Admin!
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var rawData = e.postData.contents;
    var data = JSON.parse(rawData);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = "Dwarkesh Orders";
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      var headers = [
        "Order #",
        "Timestamp",
        "Customer Name",
        "Phone Number",
        "Email",
        "Shipping Address",
        "Items Ordered",
        "Subtotal (₹)",
        "Discount (₹)",
        "Delivery Fee (₹)",
        "Total (₹)",
        "Payment Method",
        "Payment Status",
        "UPI UTR / Ref ID",
        "Order Status"
      ];
      sheet.appendRow(headers);
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground("#2A431C");
      headerRange.setFontColor("#FFFFFF");
      headerRange.setFontWeight("bold");
      headerRange.setFontFamily("Arial");
      sheet.setFrozenRows(1);
    }

    var row = [
      data.order_number || "N/A",
      data.timestamp || new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      data.customer_name || "N/A",
      data.customer_phone || "N/A",
      data.customer_email || "",
      data.full_address || "",
      data.items_summary || "",
      data.subtotal || 0,
      data.discount || 0,
      data.shipping_fee || 0,
      data.total || 0,
      data.payment_method || "COD",
      data.payment_status || "Pending",
      data.transaction_id || "",
      data.order_status || "Pending"
    ];

    sheet.appendRow(row);

    // Auto-fit column widths
    for (var i = 1; i <= row.length; i++) {
      sheet.autoResizeColumn(i);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Order recorded successfully in Google Sheet!"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return ContentService.createTextOutput("Dwarkesh India Farms Google Sheets Webhook is Active & Running!");
}
`;

async function fetchGoogleSheetsSettings() {
  const codeEl = document.getElementById('appsScriptTemplate');
  if (codeEl && !codeEl.textContent) {
    codeEl.textContent = GOOGLE_APPS_SCRIPT_CODE;
  }

  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    if (data.success && data.settings) {
      const url = data.settings.google_sheets_webhook_url || '';
      const input = document.getElementById('googleSheetsWebhookUrl');
      if (input) input.value = url;

      const badge = document.getElementById('sheetStatusBadge');
      if (badge) {
        if (url) {
          badge.textContent = '🟢 Webhook Active & Connected';
          badge.style.background = '#E8F5E9';
          badge.style.color = '#2E7D32';
        } else {
          badge.textContent = '⚪ Not Configured Yet';
          badge.style.background = '#FFF3E0';
          badge.style.color = '#E65100';
        }
      }
    }
  } catch (err) {
    console.error('Error fetching google sheets settings:', err);
  }
}

async function handleSaveGoogleSheetsWebhook(e) {
  e.preventDefault();
  const webhookUrl = document.getElementById('googleSheetsWebhookUrl').value.trim();

  try {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ google_sheets_webhook_url: webhookUrl })
    });
    const data = await res.json();
    if (data.success) {
      alert('✅ Google Sheets Webhook URL saved successfully! All future orders will auto-sync to this sheet.');
      fetchGoogleSheetsSettings();
    }
  } catch (err) {
    console.error(err);
    alert('❌ Failed to save Google Sheets Webhook URL');
  }
}

async function handleTestGoogleSheets() {
  const btn = document.getElementById('testSheetBtn');
  const feedback = document.getElementById('sheetTestFeedback');
  const webhookUrl = document.getElementById('googleSheetsWebhookUrl').value.trim();

  if (!webhookUrl) {
    alert('Please enter or save your Google Sheets Webhook URL first.');
    return;
  }

  btn.disabled = true;
  btn.textContent = '⏳ Sending Test Row...';
  feedback.style.display = 'block';
  feedback.style.color = '#1565C0';
  feedback.textContent = 'Sending test ping to Google Sheet...';

  try {
    const res = await fetch('/api/admin/google-sheets/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhook_url: webhookUrl })
    });
    const data = await res.json();
    if (data.success) {
      feedback.style.color = '#2E7D32';
      feedback.textContent = '✅ Success! Test row added to your Google Sheet. Check your sheet tab "Dwarkesh Orders"!';
    } else {
      feedback.style.color = '#D32F2F';
      feedback.textContent = '❌ Connection failed: ' + (data.message || 'Check your Webhook URL & deployment permissions');
    }
  } catch (err) {
    feedback.style.color = '#D32F2F';
    feedback.textContent = '❌ Error: ' + err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = '🧪 Send Test Row (ટેસ્ટિંગ કરો)';
  }
}

async function handleSyncAllGoogleSheets() {
  const btn = document.getElementById('syncAllSheetBtn');
  const feedback = document.getElementById('sheetTestFeedback');

  if (!confirm('Sync all existing orders in the database to Google Sheets?')) return;

  btn.disabled = true;
  btn.textContent = '⏳ Syncing All Orders...';
  feedback.style.display = 'block';
  feedback.style.color = '#1565C0';
  feedback.textContent = 'Transferring all orders to Google Sheet...';

  try {
    const res = await fetch('/api/admin/google-sheets/sync-all', {
      method: 'POST'
    });
    const data = await res.json();
    if (data.success) {
      feedback.style.color = '#2E7D32';
      feedback.textContent = '✅ ' + data.message;
      alert('🎉 ' + data.message);
    } else {
      feedback.style.color = '#D32F2F';
      feedback.textContent = '❌ Sync failed: ' + data.message;
    }
  } catch (err) {
    feedback.style.color = '#D32F2F';
    feedback.textContent = '❌ Error: ' + err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = '🔄 Sync All Existing Orders (બધા જૂના ઓર્ડર સીંક કરો)';
  }
}

function copyGoogleAppsScriptCode() {
  navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE).then(() => {
    const btn = document.getElementById('copyScriptBtn');
    if (btn) {
      const orig = btn.innerText;
      btn.innerText = '✓ Code Copied to Clipboard!';
      btn.style.backgroundColor = '#2E7D32';
      btn.style.color = '#FFF';
      setTimeout(() => {
        btn.innerText = orig;
        btn.style.backgroundColor = '';
        btn.style.color = '';
      }, 2500);
    }
  }).catch(() => {
    alert('Please select and copy the code from the box below.');
  });
}



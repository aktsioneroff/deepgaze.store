// ========================================
// Deep Gaze Admin Panel - JavaScript
// ========================================

// Global state
let currentUser = null;
let allRequests = [];
let allServices = [];
let allStaff = [];

// ========================================
// Initialize
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initNavigation();
    initModals();
    initMobileSidebar();
});

// ========================================
// Mobile Sidebar
// ========================================
function initMobileSidebar() {
    const toggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (!toggle || !sidebar || !overlay) return;
    
    function openSidebar() {
        sidebar.classList.add('mobile-open');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    function closeSidebar() {
        sidebar.classList.remove('mobile-open');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    toggle.addEventListener('click', () => {
        if (sidebar.classList.contains('mobile-open')) {
            closeSidebar();
        } else {
            openSidebar();
        }
    });
    
    overlay.addEventListener('click', closeSidebar);
    
    // Закрываем меню при клике на пункт навигации (для мобильных)
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                closeSidebar();
            }
        });
    });
    
    // Закрываем меню при ресайзе на десктоп
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            closeSidebar();
        }
    });
    
    // Закрытие по Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar.classList.contains('mobile-open')) {
            closeSidebar();
        }
    });
}

// ========================================
// Auth check
// ========================================
async function checkAuth() {
    try {
        const res = await fetch('/api/check-auth');
        const data = await res.json();
        
        if (!data.authenticated) {
            window.location.href = '/admin/login.html';
            return;
        }
        
        currentUser = data.user;
        updateUserUI();
        loadDashboard();
    } catch (err) {
        window.location.href = '/admin/login.html';
    }
}

function updateUserUI() {
    document.getElementById('sidebarUserName').textContent = currentUser.fullName;
    document.getElementById('userAvatar').textContent = currentUser.fullName.charAt(0).toUpperCase();
    
    const roles = { 
        admin: 'Администратор', 
        senior_photographer: 'Ст. фотограф', 
        photographer: 'Фотограф' 
    };
    document.getElementById('sidebarUserRole').textContent = roles[currentUser.role] || currentUser.role;
    
    // Скрываем админские функции если не админ
    if (currentUser.role !== 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = 'none';
        });
    }
    
    // Кнопка выхода
    document.getElementById('logoutBtn').addEventListener('click', logout);
}

// ========================================
// Navigation
// ========================================
function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            navigateTo(page);
        });
    });
}

function navigateTo(page) {
    // Обновляем активный пункт меню
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    const activeItem = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (activeItem) activeItem.classList.add('active');
    
    // Показываем нужную страницу
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const pageEl = document.getElementById(`page-${page}`);
    if (pageEl) pageEl.classList.add('active');
    
    // Загружаем данные для страницы
    switch(page) {
        case 'dashboard': 
            loadDashboard(); 
            break;
        case 'requests': 
            loadRequests(); 
            break;
        case 'services': 
            loadServices(); 
            break;
        case 'portfolio': 
            loadPortfolio(); 
            break;
        case 'staff': 
            if (currentUser.role === 'admin') loadStaff(); 
            break;
    }
}

// ========================================
// Dashboard
// ========================================
async function loadDashboard() {
    try {
        const [requests, services, portfolio, users] = await Promise.all([
            fetch('/api/requests').then(r => r.json()).catch(() => []),
            fetch('/api/services').then(r => r.json()).catch(() => []),
            fetch('/api/portfolio').then(r => r.json()).catch(() => []),
            currentUser.role === 'admin' 
                ? fetch('/api/users').then(r => r.json()).catch(() => []) 
                : Promise.resolve([])
        ]);
        
        allRequests = requests;
        allServices = services;
        allStaff = users;
        
        // Обновляем статистику
        document.getElementById('statRequests').textContent = requests.length;
        document.getElementById('statServices').textContent = services.length;
        document.getElementById('statPortfolio').textContent = portfolio.length;
        document.getElementById('statUsers').textContent = users.length;
        
        // Счетчик новых заявок в меню
        const newCount = requests.filter(r => r.status === 'new').length;
        const badge = document.getElementById('navRequestsBadge');
        if (badge) {
            badge.textContent = newCount;
            badge.style.display = newCount > 0 ? 'inline' : 'none';
        }
        
        // Последние заявки
        const recentContainer = document.getElementById('recentRequests');
        const recent = requests.slice(-5).reverse();
        
        if (recent.length === 0) {
            recentContainer.innerHTML = '<div class="empty-state">Нет заявок</div>';
        } else {
            recentContainer.innerHTML = recent.map(req => `
                <div class="recent-item">
                    <div class="recent-item-info">
                        <h4>${escapeHtml(req.name)}</h4>
                        <span>${escapeHtml(req.phone)} · ${formatDate(req.date)} ${req.time || ''}</span>
                    </div>
                    <span class="status status-${req.status}">${getStatusText(req.status)}</span>
                </div>
            `).join('');
        }
        
        // Статистика по статусам
        const statuses = [
            { key: 'new', label: 'Новые', color: '#60a5fa' },
            { key: 'in_progress', label: 'В работе', color: '#fbbf24' },
            { key: 'completed', label: 'Выполнены', color: '#4ade80' },
            { key: 'cancelled', label: 'Отменены', color: '#f87171' }
        ];
        
        const total = requests.length || 1;
        
        document.getElementById('statusBars').innerHTML = statuses.map(s => {
            const count = requests.filter(r => r.status === s.key).length;
            const percent = Math.round((count / total) * 100);
            return `
                <div class="status-bar-item">
                    <span class="status-bar-label">${s.label}</span>
                    <div class="status-bar-track">
                        <div class="status-bar-fill" style="width:${percent}%;background:${s.color}"></div>
                    </div>
                    <span class="status-bar-count">${count}</span>
                </div>
            `;
        }).join('');
        
    } catch (err) {
        console.error('Dashboard error:', err);
        showToast('Ошибка загрузки дашборда', 'error');
    }
}

// ========================================
// Requests
// ========================================
async function loadRequests() {
    try {
        const res = await fetch('/api/requests');
        allRequests = await res.json();
        renderRequestsTable(allRequests);
        
        // Обработчики фильтров
        const searchInput = document.getElementById('searchRequests');
        const statusFilter = document.getElementById('filterStatus');
        
        if (searchInput) {
            searchInput.removeEventListener('input', filterRequests);
            searchInput.addEventListener('input', filterRequests);
        }
        if (statusFilter) {
            statusFilter.removeEventListener('change', filterRequests);
            statusFilter.addEventListener('change', filterRequests);
        }
        
    } catch (err) {
        console.error('Load requests error:', err);
        showToast('Ошибка загрузки заявок', 'error');
    }
}

function filterRequests() {
    const search = (document.getElementById('searchRequests')?.value || '').toLowerCase();
    const status = document.getElementById('filterStatus')?.value || '';
    
    let filtered = allRequests;
    
    if (search) {
        filtered = filtered.filter(r => 
            r.name.toLowerCase().includes(search) || 
            r.phone.includes(search)
        );
    }
    
    if (status) {
        filtered = filtered.filter(r => r.status === status);
    }
    
    renderRequestsTable(filtered);
}

function renderRequestsTable(requests) {
    const tbody = document.getElementById('requestsTable');
    if (!tbody) return;
    
    if (requests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state">Заявок нет</div></td></tr>';
        return;
    }
    
    tbody.innerHTML = requests.map(req => `
        <tr>
            <td><strong>${escapeHtml(req.name)}</strong></td>
            <td>${escapeHtml(req.phone)}</td>
            <td>${formatDate(req.date)} ${req.time || ''}</td>
            <td><span class="status status-${req.status}">${getStatusText(req.status)}</span></td>
            <td>
                ${req.source === 'website' 
                    ? '<span class="source-badge"><i class="fas fa-globe"></i> Сайт</span>' 
                    : '<span class="source-badge"><i class="fas fa-user"></i> Менеджер</span>'}
            </td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon edit" onclick="editRequest(${req.id})" title="Редактировать">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="btn-icon delete" onclick="deleteRequest(${req.id})" title="Удалить">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// ========================================
// Request CRUD
// ========================================
function openRequestModal(id = null) {
    const form = document.getElementById('requestForm');
    if (!form) return;
    
    form.reset();
    document.getElementById('requestId').value = '';
    document.getElementById('requestModalTitle').textContent = 'Новая заявка';
    
    if (id) {
        document.getElementById('requestModalTitle').textContent = 'Редактировать заявку';
        const req = allRequests.find(r => r.id === id);
        if (req) {
            document.getElementById('requestId').value = req.id;
            document.getElementById('reqName').value = req.name;
            document.getElementById('reqPhone').value = req.phone;
            document.getElementById('reqDate').value = req.date;
            document.getElementById('reqTime').value = req.time || '';
            document.getElementById('reqStatus').value = req.status;
            document.getElementById('reqComment').value = req.comment || '';
        }
    } else {
        document.getElementById('reqDate').value = new Date().toISOString().split('T')[0];
    }
    
    document.getElementById('requestModal').classList.add('active');
}

function editRequest(id) { 
    openRequestModal(id); 
}

async function deleteRequest(id) {
    if (!confirm('Вы уверены, что хотите удалить эту заявку?')) return;
    
    try {
        const res = await fetch(`/api/requests/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('Заявка удалена', 'success');
            loadRequests();
            loadDashboard();
        } else {
            throw new Error('Ошибка удаления');
        }
    } catch (err) {
        showToast('Ошибка удаления заявки', 'error');
    }
}

// Обработчик формы заявки
document.getElementById('requestForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('requestId').value;
    const data = {
        name: document.getElementById('reqName').value.trim(),
        phone: document.getElementById('reqPhone').value.trim(),
        date: document.getElementById('reqDate').value,
        time: document.getElementById('reqTime').value,
        status: document.getElementById('reqStatus').value,
        comment: document.getElementById('reqComment').value.trim(),
        source: 'manager'
    };
    
    // Валидация
    if (!data.name || !data.phone || !data.date) {
        showToast('Заполните обязательные поля', 'error');
        return;
    }
    
    const url = id ? `/api/requests/${id}` : '/api/requests';
    const method = id ? 'PUT' : 'POST';
    
    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (res.ok) {
            closeModal('requestModal');
            showToast(id ? 'Заявка обновлена' : 'Заявка создана', 'success');
            loadRequests();
            loadDashboard();
        } else {
            const errData = await res.json().catch(() => ({}));
            showToast(errData.error || 'Ошибка сохранения', 'error');
        }
    } catch (err) {
        console.error('Save request error:', err);
        showToast('Ошибка сохранения заявки', 'error');
    }
});

// ========================================
// Services CRUD
// ========================================
async function loadServices() {
    try {
        const res = await fetch('/api/services');
        allServices = await res.json();
        renderServicesGrid();
    } catch (err) {
        console.error('Load services error:', err);
        showToast('Ошибка загрузки услуг', 'error');
    }
}

function renderServicesGrid() {
    const grid = document.getElementById('servicesGrid');
    if (!grid) return;
    
    if (allServices.length === 0) {
        grid.innerHTML = '<div class="empty-state">Услуг нет</div>';
        return;
    }
    
    grid.innerHTML = allServices.map(svc => `
        <div class="admin-card">
            <img src="${svc.photo || 'https://images.unsplash.com/photo-1551739440-5dd934d3a94a?w=600&q=80'}" 
                 alt="${escapeHtml(svc.name)}" 
                 loading="lazy"
                 onerror="this.src='https://images.unsplash.com/photo-1551739440-5dd934d3a94a?w=600&q=80'">
            <div class="admin-card-body">
                <h3>${escapeHtml(svc.name)}</h3>
                <p>${escapeHtml(svc.description)}</p>
                <div class="admin-card-footer">
                    <span class="admin-card-price">${svc.price.toLocaleString()} ₽</span>
                    <div class="action-btns">
                        <button class="btn-icon edit" onclick="editService(${svc.id})" title="Редактировать">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="btn-icon delete" onclick="deleteService(${svc.id})" title="Удалить">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function openServiceModal(id = null) {
    const form = document.getElementById('serviceForm');
    if (!form) return;
    
    form.reset();
    document.getElementById('serviceId').value = '';
    document.getElementById('serviceModalTitle').textContent = 'Новая услуга';
    
    if (id) {
        document.getElementById('serviceModalTitle').textContent = 'Редактировать услугу';
        const svc = allServices.find(s => s.id === id);
        if (svc) {
            document.getElementById('serviceId').value = svc.id;
            document.getElementById('svcName').value = svc.name;
            document.getElementById('svcDescription').value = svc.description;
            document.getElementById('svcPrice').value = svc.price;
            document.getElementById('svcPriority').value = svc.priority || 0;
        }
    }
    
    document.getElementById('serviceModal').classList.add('active');
}

function editService(id) { 
    openServiceModal(id); 
}

async function deleteService(id) {
    if (!confirm('Вы уверены, что хотите удалить эту услугу?')) return;
    
    try {
        const res = await fetch(`/api/services/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('Услуга удалена', 'success');
            loadServices();
            loadDashboard();
        } else {
            throw new Error('Ошибка удаления');
        }
    } catch (err) {
        showToast('Ошибка удаления услуги', 'error');
    }
}

// Обработчик формы услуги
document.getElementById('serviceForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('serviceId').value;
    const formData = new FormData();
    
    formData.append('name', document.getElementById('svcName').value.trim());
    formData.append('description', document.getElementById('svcDescription').value.trim());
    formData.append('price', document.getElementById('svcPrice').value);
    formData.append('priority', document.getElementById('svcPriority').value || '0');
    
    const photo = document.getElementById('svcPhoto').files[0];
    if (photo) formData.append('photo', photo);
    
    // Валидация
    if (!formData.get('name') || !formData.get('description') || !formData.get('price')) {
        showToast('Заполните обязательные поля', 'error');
        return;
    }
    
    const url = id ? `/api/services/${id}` : '/api/services';
    const method = id ? 'PUT' : 'POST';
    
    try {
        const res = await fetch(url, { method, body: formData });
        
        if (res.ok) {
            closeModal('serviceModal');
            showToast(id ? 'Услуга обновлена' : 'Услуга создана', 'success');
            loadServices();
            loadDashboard();
        } else {
            const errData = await res.json().catch(() => ({}));
            showToast(errData.error || 'Ошибка сохранения', 'error');
        }
    } catch (err) {
        console.error('Save service error:', err);
        showToast('Ошибка сохранения услуги', 'error');
    }
});

// ========================================
// Portfolio CRUD
// ========================================
async function loadPortfolio() {
    try {
        const [portfolioRes, servicesRes] = await Promise.all([
            fetch('/api/portfolio').then(r => r.json()).catch(() => []),
            fetch('/api/services').then(r => r.json()).catch(() => [])
        ]);
        
        const portfolio = portfolioRes;
        allServices = servicesRes;
        
        const grid = document.getElementById('portfolioGridAdmin');
        if (!grid) return;
        
        if (portfolio.length === 0) {
            grid.innerHTML = '<div class="empty-state">Работ нет</div>';
            return;
        }
        
        grid.innerHTML = portfolio.map(item => `
            <div class="admin-card">
                <img src="${item.photo}" alt="${escapeHtml(item.serviceName)}" loading="lazy">
                <div class="admin-card-body">
                    <h3>${escapeHtml(item.serviceName)}</h3>
                    <p>${escapeHtml(item.description || '')}</p>
                    <div style="text-align:right;">
                        <button class="btn-icon delete" onclick="deletePortfolioItem(${item.id})" title="Удалить">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Заполняем выпадающий список услуг
        updatePortfolioServiceSelect();
        
    } catch (err) {
        console.error('Load portfolio error:', err);
        showToast('Ошибка загрузки портфолио', 'error');
    }
}

function updatePortfolioServiceSelect() {
    const select = document.getElementById('ptfServiceId');
    if (!select) return;
    
    select.innerHTML = '<option value="">Выберите услугу</option>' +
        allServices.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
}

function openPortfolioModal() {
    const form = document.getElementById('portfolioForm');
    if (!form) return;
    
    form.reset();
    updatePortfolioServiceSelect();
    document.getElementById('portfolioModal').classList.add('active');
}

async function deletePortfolioItem(id) {
    if (!confirm('Вы уверены, что хотите удалить эту работу?')) return;
    
    try {
        const res = await fetch(`/api/portfolio/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('Работа удалена', 'success');
            loadPortfolio();
        } else {
            throw new Error('Ошибка удаления');
        }
    } catch (err) {
        showToast('Ошибка удаления работы', 'error');
    }
}

// Обработчик формы портфолио
document.getElementById('portfolioForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('serviceId', document.getElementById('ptfServiceId').value);
    formData.append('description', document.getElementById('ptfDescription').value.trim());
    
    const photo = document.getElementById('ptfPhoto').files[0];
    if (photo) {
        formData.append('photo', photo);
    } else {
        showToast('Выберите изображение', 'error');
        return;
    }
    
    if (!formData.get('serviceId')) {
        showToast('Выберите услугу', 'error');
        return;
    }
    
    try {
        const res = await fetch('/api/portfolio', { 
            method: 'POST', 
            body: formData 
        });
        
        if (res.ok) {
            closeModal('portfolioModal');
            showToast('Работа добавлена', 'success');
            loadPortfolio();
        } else {
            const errData = await res.json().catch(() => ({}));
            showToast(errData.error || 'Ошибка добавления', 'error');
        }
    } catch (err) {
        console.error('Add portfolio error:', err);
        showToast('Ошибка добавления работы', 'error');
    }
});

// ========================================
// Staff CRUD
// ========================================
async function loadStaff() {
    if (currentUser.role !== 'admin') return;
    
    try {
        const res = await fetch('/api/users');
        if (!res.ok) throw new Error('Ошибка загрузки');
        
        allStaff = await res.json();
        renderStaffTable();
    } catch (err) {
        console.error('Load staff error:', err);
        showToast('Ошибка загрузки сотрудников', 'error');
    }
}

function renderStaffTable() {
    const tbody = document.getElementById('staffTable');
    if (!tbody) return;
    
    if (allStaff.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state">Сотрудников нет</div></td></tr>';
        return;
    }
    
    tbody.innerHTML = allStaff.map(user => `
        <tr>
            <td><strong>${escapeHtml(user.fullName)}</strong></td>
            <td>${escapeHtml(user.username)}</td>
            <td>${getRoleText(user.role)}</td>
            <td>${formatDate(user.createdAt)}</td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon edit" onclick="editStaff(${user.id})" title="Редактировать">
                        <i class="fas fa-pen"></i>
                    </button>
                    ${user.id !== currentUser.id ? 
                        `<button class="btn-icon delete" onclick="deleteStaff(${user.id})" title="Удалить">
                            <i class="fas fa-trash"></i>
                        </button>` : 
                        ''}
                </div>
            </td>
        </tr>
    `).join('');
}

function openStaffModal(id = null) {
    const form = document.getElementById('staffForm');
    if (!form) return;
    
    form.reset();
    document.getElementById('staffId').value = '';
    document.getElementById('staffModalTitle').textContent = 'Новый сотрудник';
    
    const passwordField = document.getElementById('staffPassword');
    passwordField.required = true;
    passwordField.placeholder = 'Введите пароль';
    
    if (id) {
        document.getElementById('staffModalTitle').textContent = 'Редактировать сотрудника';
        const user = allStaff.find(u => u.id === id);
        if (user) {
            document.getElementById('staffId').value = user.id;
            document.getElementById('staffFullName').value = user.fullName;
            document.getElementById('staffUsername').value = user.username;
            document.getElementById('staffRole').value = user.role;
            passwordField.required = false;
            passwordField.placeholder = 'Оставьте пустым, чтобы не менять';
        }
    }
    
    document.getElementById('staffModal').classList.add('active');
}

function editStaff(id) { 
    openStaffModal(id); 
}

async function deleteStaff(id) {
    if (!confirm('Вы уверены, что хотите удалить этого сотрудника?')) return;
    
    if (id === currentUser.id) {
        showToast('Нельзя удалить самого себя', 'error');
        return;
    }
    
    try {
        const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('Сотрудник удален', 'success');
            loadStaff();
        } else {
            const errData = await res.json().catch(() => ({}));
            showToast(errData.error || 'Ошибка удаления', 'error');
        }
    } catch (err) {
        console.error('Delete staff error:', err);
        showToast('Ошибка удаления сотрудника', 'error');
    }
}

// Обработчик формы сотрудника
document.getElementById('staffForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('staffId').value;
    const data = {
        fullName: document.getElementById('staffFullName').value.trim(),
        username: document.getElementById('staffUsername').value.trim(),
        role: document.getElementById('staffRole').value
    };
    
    const password = document.getElementById('staffPassword').value;
    if (password) {
        data.password = password;
    }
    
    // Валидация
    if (!data.fullName || !data.username) {
        showToast('Заполните обязательные поля', 'error');
        return;
    }
    
    if (!id && !password) {
        showToast('Введите пароль', 'error');
        return;
    }
    
    const url = id ? `/api/users/${id}` : '/api/users';
    const method = id ? 'PUT' : 'POST';
    
    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (res.ok) {
            closeModal('staffModal');
            showToast(id ? 'Сотрудник обновлен' : 'Сотрудник создан', 'success');
            loadStaff();
        } else {
            const errData = await res.json().catch(() => ({}));
            showToast(errData.error || 'Ошибка сохранения', 'error');
        }
    } catch (err) {
        console.error('Save staff error:', err);
        showToast('Ошибка сохранения сотрудника', 'error');
    }
});

// ========================================
// Modals
// ========================================
function initModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        // Закрытие по клику на фон
        modal.querySelector('.modal-backdrop')?.addEventListener('click', () => {
            modal.classList.remove('active');
        });
        
        // Закрытие по кнопке
        modal.querySelector('.modal-close')?.addEventListener('click', () => {
            modal.classList.remove('active');
        });
        
        // Закрытие по кнопке "Отмена"
        modal.querySelector('.modal-close-btn')?.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    });
    
    // Закрытие по Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(m => {
                m.classList.remove('active');
            });
        }
    });
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// ========================================
// Logout
// ========================================
async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
    } catch (err) {
        console.error('Logout error:', err);
    } finally {
        window.location.href = '/admin/login.html';
    }
}

// ========================================
// Toast notifications
// ========================================
function showToast(message, type = 'success') {
    // Удаляем существующие тосты
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' ? 'check-circle' : 'exclamation-circle';
    toast.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;
    
    document.body.appendChild(toast);
    
    // Автоматическое удаление через 3 секунды
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 300);
    }, 3000);
}

// ========================================
// Helper functions
// ========================================
function getStatusText(status) {
    const map = { 
        new: 'Новая', 
        in_progress: 'В работе', 
        completed: 'Выполнена', 
        cancelled: 'Отменена' 
    };
    return map[status] || status;
}

function getRoleText(role) {
    const map = { 
        admin: 'Администратор', 
        senior_photographer: 'Ст. фотограф', 
        photographer: 'Фотограф' 
    };
    return map[role] || role;
}

function formatDate(dateString) {
    if (!dateString) return '';
    try {
        return new Date(dateString).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (e) {
        return dateString;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

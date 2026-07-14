// SIDEBAR TOGGLE
window.toggleSidebar = function() {
    const sidebar = document.getElementById('portalSidebar');
    
    if (window.innerWidth <= 768) {
        sidebar.classList.toggle('open');
    } else {
        sidebar.classList.toggle('collapsed');
        setTimeout(() => {
            localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
        }, 100);
    }
};

// ВОССТАНОВЛЕНИЕ СОСТОЯНИЯ
document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('portalSidebar');
    const savedState = localStorage.getItem('sidebarCollapsed');
    
    if (savedState === 'true' && window.innerWidth > 768) {
        sidebar.classList.add('collapsed');
    }
    console.log('🔒 Портал DEEP GAZE загружен');
});

// ЗАКРЫТИЕ НА МОБИЛЬНЫХ
document.addEventListener('click', function(e) {
    const sidebar = document.getElementById('portalSidebar');
    const toggle = document.querySelector('.mobile-sidebar-toggle');
    
    if (window.innerWidth <= 768) {
        if (sidebar && !sidebar.contains(e.target) && toggle && !toggle.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    }
});

// ESCAPE
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const sidebar = document.getElementById('portalSidebar');
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('open');
        }
    }
});

// RESIZE
let resizeTimeout;
window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        const sidebar = document.getElementById('portalSidebar');
        
        if (window.innerWidth > 768) {
            sidebar.classList.remove('open');
        } else {
            sidebar.classList.remove('collapsed');
        }
    }, 250);
});

// ===== ПЕРЕХВАТ ВСЕХ AJAX ЗАПРОСОВ С ОТЛАДКОЙ =====
document.addEventListener('click', function(e) {
    // Кнопки удаления
    const deleteBtn = e.target.closest('.btn-icon.danger, [onclick*="delete"]');
    if (deleteBtn) {
        const confirmMsg = 'Вы уверены, что хотите удалить этот элемент?';
        if (!confirm(confirmMsg)) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }
    
    // Отслеживаем все клики по ссылкам и кнопкам
    const target = e.target.closest('a, button, .btn');
    if (target && target.getAttribute('href') && !target.getAttribute('href').startsWith('#')) {
        console.log(`🖱️ Клик по: ${target.getAttribute('href') || target.textContent}`);
    }
});

// ===== ПРОВЕРКА СЕССИИ =====
async function checkSessionStatus() {
    try {
        const response = await fetch('/api/check-session', {
            credentials: 'same-origin'
        });
        const data = await response.json();
        console.log('📊 Статус сессии:', data);
        return data;
    } catch (error) {
        console.error('❌ Ошибка проверки сессии:', error);
        return null;
    }
}

// Проверяем сессию каждые 30 секунд
setInterval(async () => {
    const status = await checkSessionStatus();
    if (status && !status.success) {
        console.log('⚠️ Сессия потеряна, редирект на логин');
        window.location.href = '/login?error=Сессия истекла';
    }
}, 30000);

// Проверяем при загрузке
document.addEventListener('DOMContentLoaded', async () => {
    const status = await checkSessionStatus();
    console.log('📊 Начальный статус сессии:', status);
});

console.log('🔒 Портал DEEP GAZE загружен с отладкой');
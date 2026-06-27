// === Particles Background ===
class ParticlesBackground {
    constructor() {
        this.canvas = document.getElementById('particlesCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        const count = Math.min(60, Math.floor((this.canvas.width * this.canvas.height) / 12000));
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 1.2 + 0.4,
                speedX: (Math.random() - 0.5) * 0.25,
                speedY: (Math.random() - 0.5) * 0.25,
                opacity: Math.random() * 0.4 + 0.15
            });
        }
        
        this.animate();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.particles.forEach(p => {
            p.x += p.speedX;
            p.y += p.speedY;
            
            if (p.x < 0 || p.x > this.canvas.width) p.speedX *= -1;
            if (p.y < 0 || p.y > this.canvas.height) p.speedY *= -1;
            
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(167, 139, 250, ${p.opacity})`;
            this.ctx.fill();
        });

        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const dx = this.particles[i].x - this.particles[j].x;
                const dy = this.particles[i].y - this.particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 130) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
                    this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
                    this.ctx.strokeStyle = `rgba(167, 139, 250, ${0.04 * (1 - dist / 130)})`;
                    this.ctx.lineWidth = 0.4;
                    this.ctx.stroke();
                }
            }
        }
        
        requestAnimationFrame(() => this.animate());
    }
}

// === Global State ===
let selectedDate = null;
let selectedTime = null;

// === Initialize ===
document.addEventListener('DOMContentLoaded', () => {
    new ParticlesBackground();
    initMobileMenu();
    initCalendar();
    initModals();
    loadServices();
    loadPortfolio();
    initBookingForm();
    initActiveNavLink();
});

// === Mobile Menu ===
function initMobileMenu() {
    const toggle = document.getElementById('menuToggle');
    const menu = document.getElementById('mobileMenu');
    
    toggle.addEventListener('click', () => {
        menu.classList.toggle('active');
        toggle.classList.toggle('active');
    });
    
    document.querySelectorAll('.mobile-link').forEach(link => {
        link.addEventListener('click', () => {
            menu.classList.remove('active');
            toggle.classList.remove('active');
        });
    });
}

// === Active Nav Link ===
function initActiveNavLink() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    
    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            if (window.scrollY >= sectionTop) {
                current = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });
}

// === Calendar ===
function initCalendar() {
    const calendar = document.getElementById('calendar');
    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();
    
    function render() {
        const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
            'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
        
        calendar.innerHTML = `
            <div class="calendar-header">
                <button class="calendar-nav" id="prevMonth">←</button>
                <span class="calendar-title">${months[currentMonth]} ${currentYear}</span>
                <button class="calendar-nav" id="nextMonth">→</button>
            </div>
            <div class="calendar-weekdays">
                <span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span>
            </div>
            <div class="calendar-grid" id="calendarGrid"></div>
        `;
        
        const grid = document.getElementById('calendarGrid');
        
        for (let i = 0; i < adjustedFirstDay; i++) {
            const empty = document.createElement('div');
            empty.className = 'calendar-day empty';
            grid.appendChild(empty);
        }
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentYear, currentMonth, day);
            const isPast = date < today;
            const isToday = date.getTime() === today.getTime();
            
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';
            dayEl.textContent = day;
            
            if (isPast) dayEl.classList.add('past');
            if (isToday) dayEl.classList.add('today');
            
            if (!isPast) {
                dayEl.addEventListener('click', () => selectDate(date, dayEl));
            }
            
            grid.appendChild(dayEl);
        }
        
        document.getElementById('prevMonth').onclick = () => {
            currentMonth--;
            if (currentMonth < 0) { currentMonth = 11; currentYear--; }
            render();
        };
        
        document.getElementById('nextMonth').onclick = () => {
            currentMonth++;
            if (currentMonth > 11) { currentMonth = 0; currentYear++; }
            render();
        };
    }
    
    render();
}

function selectDate(date, element) {
    selectedDate = date;
    document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
    element.classList.add('selected');
    
    const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    
    document.getElementById('modalDate').textContent = 
        `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    
    generateTimeSlots();
    openModal('timeModal');
}

// === Time Slots (12:00 - 18:00, шаг 20 минут, все доступны) ===
function generateTimeSlots() {
    const container = document.getElementById('timeSlots');
    const slots = [];
    
    // Генерируем слоты с 12:00 до 18:00 с шагом 20 минут
    for (let h = 12; h < 18; h++) {
        slots.push(`${String(h).padStart(2, '0')}:00`);
        slots.push(`${String(h).padStart(2, '0')}:20`);
        slots.push(`${String(h).padStart(2, '0')}:40`);
    }
    
    container.innerHTML = slots.map(time => `
        <button class="time-slot">${time}</button>
    `).join('');
    
    selectedTime = null;
    document.getElementById('confirmTimeBtn').disabled = true;
    
    container.querySelectorAll('.time-slot').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.time-slot').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedTime = btn.textContent;
            document.getElementById('confirmTimeBtn').disabled = false;
        });
    });
    
    document.getElementById('confirmTimeBtn').onclick = () => {
        if (!selectedTime) return;
        closeModal('timeModal');
        
        const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
            'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
        document.getElementById('modalBookingInfo').textContent = 
            `${selectedDate.getDate()} ${months[selectedDate.getMonth()]} в ${selectedTime}`;
        
        openModal('contactModal');
    };
}

// === Modals ===
function initModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.querySelector('.modal-backdrop')?.addEventListener('click', () => closeModal(modal.id));
        modal.querySelector('.modal-close')?.addEventListener('click', () => closeModal(modal.id));
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(m => closeModal(m.id));
        }
    });
}

function openModal(id) {
    document.getElementById(id).classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    document.body.style.overflow = '';
}

// === Booking Form ===
function initBookingForm() {
    document.getElementById('bookingForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('clientName').value.trim();
        const phone = document.getElementById('clientPhone').value.trim();
        
        if (!name || !phone) {
            showToast('Заполните все поля', 'error');
            return;
        }
        
        const data = {
            name,
            phone,
            date: selectedDate.toISOString().split('T')[0],
            time: selectedTime,
            comment: `Запись с сайта на ${selectedDate.toLocaleDateString('ru-RU')} в ${selectedTime}`,
            status: 'new',
            source: 'website'
        };
        
        try {
            const res = await fetch('/api/requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (res.ok) {
                closeModal('contactModal');
                openModal('successModal');
                document.getElementById('bookingForm').reset();
                selectedDate = null;
                selectedTime = null;
            } else {
                showToast('Ошибка отправки', 'error');
            }
        } catch (err) {
            showToast('Ошибка соединения', 'error');
        }
    });
}

// === Toast ===
function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// === Load Services ===
async function loadServices() {
    try {
        const res = await fetch('/api/services');
        const services = await res.json();
        
        const grid = document.getElementById('servicesGrid');
        
        if (!services.length) {
            grid.innerHTML = '<p style="text-align:center;color:var(--text-muted);grid-column:1/-1;padding:3rem;">Услуги скоро появятся</p>';
            return;
        }
        
        grid.innerHTML = services.map(svc => `
            <div class="service-card">
                <img src="${svc.photo || 'https://images.unsplash.com/photo-1551739440-5dd934d3a94a?w=600&q=80'}" 
                     alt="${svc.name}" loading="lazy"
                     onerror="this.src='https://images.unsplash.com/photo-1551739440-5dd934d3a94a?w=600&q=80'">
                <div class="service-card-body">
                    <h3>${svc.name}</h3>
                    <p>${svc.description}</p>
                    <span class="service-price">${svc.price.toLocaleString()} ₽</span>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Services error:', err);
    }
}

// === Load Portfolio ===
async function loadPortfolio() {
    try {
        const res = await fetch('/api/portfolio');
        const portfolio = await res.json();
        
        const grid = document.getElementById('portfolioGrid');
        const filters = document.getElementById('portfolioFilters');
        
        if (!portfolio.length) return;
        
        const categories = [...new Set(portfolio.map(item => item.serviceName))];
        
        filters.innerHTML = `
            <button class="filter-btn active" data-filter="all">Все</button>
            ${categories.map(cat => `
                <button class="filter-btn" data-filter="${cat}">${cat}</button>
            `).join('')}
        `;
        
        grid.innerHTML = portfolio.map(item => `
            <div class="portfolio-item" data-category="${item.serviceName}">
                <img src="${item.photo}" alt="${item.serviceName}" loading="lazy">
                <div class="portfolio-overlay">
                    <h4>${item.serviceName}</h4>
                    <p>${item.description || ''}</p>
                </div>
            </div>
        `).join('');
        
        filters.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                filters.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const filter = btn.dataset.filter;
                grid.querySelectorAll('.portfolio-item').forEach(item => {
                    item.style.display = (filter === 'all' || item.dataset.category === filter) ? 'block' : 'none';
                });
            });
        });
    } catch (err) {
        console.error('Portfolio error:', err);
    }
}
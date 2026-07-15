// ===== MOBILE MENU =====
const burgerBtn = document.getElementById('burgerBtn');
const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');

window.toggleMobileMenu = function() {
  burgerBtn.classList.toggle('active');
  mobileMenuOverlay.classList.toggle('active');
  document.body.style.overflow = mobileMenuOverlay.classList.contains('active') ? 'hidden' : '';
};

window.closeMobileMenu = function() {
  burgerBtn.classList.remove('active');
  mobileMenuOverlay.classList.remove('active');
  document.body.style.overflow = '';
};

window.navigateMobile = function(link) {
  document.querySelectorAll('#navDesktop a, .mobile-menu a').forEach(l => l.classList.remove('active'));
  link.classList.add('active');
  const href = link.getAttribute('href');
  if (href) {
    const desktopLink = document.querySelector(`#navDesktop a[href="${href}"]`);
    if (desktopLink) desktopLink.classList.add('active');
  }
  closeMobileMenu();
};

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMobileMenu(); });

// ===== DESKTOP NAV =====
document.querySelectorAll('#navDesktop a').forEach(l => l.addEventListener('click', function() {
  document.querySelectorAll('#navDesktop a').forEach(x => x.classList.remove('active'));
  this.classList.add('active');
}));

// ===== FULLSCREEN =====
const fsO = document.getElementById('fullscreenOverlay'), fsI = document.getElementById('fullscreenImage');

window.openFullscreen = s => { fsI.src = s; fsO.classList.add('active'); document.body.style.overflow = 'hidden'; };
window.closeFullscreen = () => { fsO.classList.remove('active'); document.body.style.overflow = ''; };
document.addEventListener('keydown', e => { if (e.key === 'Escape' && fsO.classList.contains('active')) closeFullscreen(); });

// ===== CATALOG =====
window.toggleCatalog = function() {
  const h = document.querySelectorAll('.catalog-card.hidden'), b = document.getElementById('showMoreBtn');
  const v = h[0]?.style.display === 'block';
  h.forEach(c => c.style.display = v ? 'none' : 'block');
  b.textContent = v ? 'Показать ещё' : 'Скрыть';
};

// ===== MODALS =====
const mO = document.getElementById('modalOverlay'), mT = document.getElementById('modalTitle'), mD = document.getElementById('modalDesc'), mB = document.getElementById('modalBtn'), mEx = document.getElementById('modalExtra');

window.openModal = (t, d) => { mT.innerHTML = t; mD.innerHTML = d; mEx.innerHTML = ''; mB.textContent = 'Понятно'; mB.onclick = closeModal; mO.classList.add('active'); };

window.openServiceModal = (t, d, p, img) => {
  mT.innerHTML = t;
  mD.innerHTML = d + '<br><br><b style=color:var(--accent)>Стоимость: ' + p + '</b>';
  mEx.innerHTML = img ? '<img src="'+img+'" style="width:100%;border-radius:0.5rem;margin-bottom:1rem;cursor:pointer;" onclick="openFullscreen(\''+img+'\')">' : '';
  mB.textContent = 'Записаться';
  mB.onclick = () => { closeModal(); document.getElementById('booking').scrollIntoView({ behavior: 'smooth' }); };
  mO.classList.add('active');
};

window.closeModal = () => mO.classList.remove('active');
mO.addEventListener('click', e => { if (e.target === mO) closeModal(); });

const lO = document.getElementById('loginModalOverlay');
window.openLoginModal = () => lO.classList.add('active');
window.closeLoginModal = () => lO.classList.remove('active');
lO.addEventListener('click', e => { if (e.target === lO) closeLoginModal(); });

// ===== CALENDAR =====
const calGrid = document.getElementById('calGrid'), sD = document.getElementById('sumDate'), sT = document.getElementById('sumTime'), oTB = document.getElementById('openTimeModalBtn');
let selD = null, selT = null;
let occupiedTimes = [];

const now = new Date(), cm = now.getMonth(), cy = now.getFullYear(), td = now.getDate();
const mn = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'], dh = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

async function fetchOccupiedTimes(date) {
    try {
        const response = await fetch(`/api/occupied-times?date=${date}`);
        const data = await response.json();
        occupiedTimes = data.occupied || [];
        return occupiedTimes;
    } catch (error) {
        console.error('Ошибка загрузки занятых времен:', error);
        occupiedTimes = [];
        return [];
    }
}

async function renderCalendar(selectedDate) {
    calGrid.innerHTML = '';
    
    dh.forEach(d => { const h = document.createElement('div'); h.className = 'cal-header'; h.textContent = d; calGrid.appendChild(h); });
    
    const fd = new Date(cy, cm, 1).getDay();
    const dim = new Date(cy, cm + 1, 0).getDate();
    const stD = fd === 0 ? 6 : fd - 1;
    
    for (let i = 0; i < stD; i++) { const e = document.createElement('div'); e.className = 'cal-day empty'; calGrid.appendChild(e); }
    
    for (let day = 1; day <= dim; day++) {
        const de = document.createElement('button');
        de.className = 'cal-day';
        de.textContent = day;
        
        const dateStr = `${cy}-${String(cm + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        if (day === td && cm === now.getMonth() && cy === now.getFullYear()) {
            de.classList.add('today');
        }
        
        const isPast = (cy < now.getFullYear()) || 
            (cy === now.getFullYear() && cm < now.getMonth()) || 
            (cy === now.getFullYear() && cm === now.getMonth() && day < td);
        
        if (isPast) {
            de.classList.add('past');
            de.disabled = true;
        } else {
            de.addEventListener('click', async function() {
                document.querySelectorAll('.cal-day').forEach(d => d.classList.remove('selected'));
                this.classList.add('selected');
                selD = day;
                selT = null;
                sD.textContent = day + ' ' + mn[cm] + ' ' + cy;
                sT.textContent = '—';
                
                const dateStr = `${cy}-${String(cm + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                await fetchOccupiedTimes(dateStr);
                oTB.disabled = false;
            });
        }
        calGrid.appendChild(de);
    }
    
    if (selectedDate) {
        await fetchOccupiedTimes(selectedDate);
    }
}

renderCalendar(null);

// ===== TIME =====
const tMO = document.getElementById('timeModalOverlay'), tG = document.getElementById('timeGrid'), tMD = document.getElementById('timeModalDate'), cTB = document.getElementById('confirmTimeBtn');

window.openTimeModal = function() {
  if (!selD) return;
  
  const dateStr = `${cy}-${String(cm + 1).padStart(2, '0')}-${String(selD).padStart(2, '0')}`;
  tMD.textContent = selD + ' ' + mn[cm] + ' ' + cy;
  tG.innerHTML = '';
  selT = null;
  cTB.disabled = true;
  
  const allSlots = [];
  for (let h = 10; h < 20; h++) {
      for (let m = 0; m < 60; m += 30) {
          allSlots.push(String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'));
      }
  }
  
  allSlots.forEach(t => {
    const cell = document.createElement('button');
    cell.className = 'time-cell';
    cell.textContent = t;
    
    if (occupiedTimes.includes(t)) {
      cell.classList.add('unavailable');
      cell.disabled = true;
    } else {
      cell.addEventListener('click', () => {
        document.querySelectorAll('.time-cell').forEach(x => x.classList.remove('selected'));
        cell.classList.add('selected');
        selT = t;
        cTB.disabled = false;
      });
    }
    tG.appendChild(cell);
  });
  
  tMO.classList.add('active');
};

window.closeTimeModal = () => tMO.classList.remove('active');
tMO.addEventListener('click', e => { if (e.target === tMO) closeTimeModal(); });

window.confirmTime = () => { if (!selT) return; sT.textContent = selT; closeTimeModal(); openBookingForm(); };

// ===== BOOKING FORM =====
const bFO = document.getElementById('bookingFormOverlay'), bFI = document.getElementById('bookingFormInfo');

window.openBookingForm = () => { bFI.textContent = 'Дата: ' + selD + ' ' + mn[cm] + ' ' + cy + ' • Время: ' + selT; document.getElementById('clientName').value = ''; document.getElementById('clientPhone').value = ''; bFO.classList.add('active'); };

window.closeBookingForm = () => bFO.classList.remove('active');
bFO.addEventListener('click', e => { if (e.target === bFO) closeBookingForm(); });

window.submitBooking = () => {
  const name = document.getElementById('clientName').value.trim(), phone = document.getElementById('clientPhone').value.trim();
  if (!name || !phone) { alert('Заполните имя и телефон.'); return; }
  
  const dateStr = `${cy}-${String(cm + 1).padStart(2, '0')}-${String(selD).padStart(2, '0')}`;
  const service = document.getElementById('bookingService')?.value || 'Не указана';
  
  fetch('/api/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: name,
      phone: phone,
      date: dateStr,
      time: selT,
      service: service,
      source: 'Сайт'
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      closeBookingForm();
      mT.innerHTML = '✓ Запись подтверждена';
      mD.innerHTML = '<b style=color:var(--accent)>' + name + '</b>, вы записаны на <b style=color:var(--accent)>' + selD + ' ' + mn[cm] + ' ' + cy + '</b> в <b style=color:var(--accent)>' + selT + '</b>.<br><br>Менеджер свяжется по телефону <b style=color:var(--accent)>' + phone + '</b>.';
      mEx.innerHTML = ''; mB.textContent = 'Отлично'; mB.onclick = closeModal; mO.classList.add('active');
      
      fetchOccupiedTimes(dateStr);
    } else {
      alert('Ошибка отправки заявки');
    }
  })
  .catch(() => alert('Ошибка сервера'));
};

setTimeout(() => { document.getElementById('bonusBar').style.width = '30%'; }, 600);

// ===== ЗАГРУЗКА ПАРТНЁРОВ =====
async function loadPartners() {
  try {
    const response = await fetch('/api/partners');
    const partners = await response.json();
    
    const grid = document.getElementById('partnersGrid');
    if (grid) {
      if (partners && partners.length > 0) {
        grid.innerHTML = partners.map(p => `
          <div class="trusted-logo">
            <div class="logo-icon" style="background: transparent; box-shadow: none; border: none; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
              ${p.logo ? `<img src="${p.logo}" alt="${p.name}" class="partner-logo-img" style="width: 80px; height: 80px; object-fit: contain; filter: brightness(0) saturate(100%) invert(73%) sepia(41%) saturate(507%) hue-rotate(14deg) brightness(95%) contrast(92%); transition: all 0.3s ease;" onerror="this.style.display='none';this.parentElement.textContent='${p.name.charAt(0).toUpperCase()}'">` : p.name.charAt(0).toUpperCase()}
            </div>
          </div>
        `).join('');
        
        document.querySelectorAll('.partner-logo-img').forEach(img => {
          img.addEventListener('mouseenter', function() {
            this.style.filter = 'brightness(0) saturate(100%) invert(85%) sepia(50%) saturate(600%) hue-rotate(14deg) brightness(110%) contrast(95%)';
            this.style.transform = 'scale(1.05)';
          });
          img.addEventListener('mouseleave', function() {
            this.style.filter = 'brightness(0) saturate(100%) invert(73%) sepia(41%) saturate(507%) hue-rotate(14deg) brightness(95%) contrast(92%)';
            this.style.transform = 'scale(1)';
          });
        });
      } else {
        grid.innerHTML = `
          <div style="text-align:center;width:100%;color:var(--text-muted);font-size:0.85rem;padding:1rem;">
            Партнёры добавляются в панели управления
          </div>
        `;
      }
    }
  } catch (error) {
    console.error('Ошибка загрузки партнёров:', error);
    const grid = document.getElementById('partnersGrid');
    if (grid) {
      grid.innerHTML = `
        <div style="text-align:center;width:100%;color:var(--text-muted);font-size:0.85rem;padding:1rem;">
          ⚠️ Не удалось загрузить партнёров
        </div>
      `;
    }
  }
}

// ===== ЗАГРУЗКА ПОРТФОЛИО =====
async function loadPortfolio() {
  try {
    const response = await fetch('/api/portfolio');
    const items = await response.json();
    
    const grid = document.querySelector('.portfolio-grid');
    if (grid && items && items.length > 0) {
      grid.innerHTML = '';
      
      items.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'portfolio-item';
        if (index === 0) div.classList.add('wide', 'tall');
        if (index === 3) div.classList.add('tall');
        if (index === 5) div.classList.add('wide');
        
        div.style.backgroundImage = `url(${item.image})`;
        div.style.backgroundSize = 'cover';
        div.style.backgroundPosition = 'center';
        div.onclick = () => openFullscreen(item.image);
        
        grid.appendChild(div);
      });
    }
  } catch (error) {
    console.error('Ошибка загрузки портфолио:', error);
  }
}

// ===== ЗАГРУЗКА УСЛУГ =====
async function loadServices() {
  try {
    const response = await fetch('/api/services');
    const services = await response.json();
    
    const grid = document.getElementById('catalogGrid');
    if (grid && services && services.length > 0) {
      grid.innerHTML = '';
      
      services.forEach((service, index) => {
        const card = document.createElement('div');
        card.className = 'catalog-card';
        if (index >= 4) card.classList.add('hidden');
        
        card.innerHTML = `
          <div class="catalog-card-img" style="background-image:url('${service.image || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop'}');" onclick="event.stopPropagation(); openFullscreen('${service.image || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&auto=format&fit=crop'}')"></div>
          <div class="catalog-card-body">
            <h3>${service.name}</h3>
            <p class="desc">${service.description || 'Без описания'}</p>
            <div class="price">${service.price}</div>
          </div>
        `;
        
        card.onclick = () => openServiceModal(
          service.name,
          service.description || 'Без описания',
          service.price,
          service.image || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop'
        );
        
        grid.appendChild(card);
      });
      
      const showMoreBtn = document.getElementById('showMoreBtn');
      if (showMoreBtn) {
        const hiddenCards = grid.querySelectorAll('.catalog-card.hidden');
        if (hiddenCards.length === 0) {
          showMoreBtn.style.display = 'none';
        }
      }
    }
  } catch (error) {
    console.error('Ошибка загрузки услуг:', error);
  }
}

// ===== ЗАГРУЗКА УСЛУГ ДЛЯ ФОРМЫ ЗАПИСИ =====
async function loadServicesForBooking() {
  try {
    const response = await fetch('/api/services');
    const services = await response.json();
    const select = document.getElementById('bookingService');
    if (select) {
      if (services && services.length > 0) {
        select.innerHTML = '<option value="">Выберите услугу</option>' + 
          services.map(s => `<option value="${s.id}">${s.name} - ${s.price}</option>`).join('');
      } else {
        select.innerHTML = '<option value="">Услуги временно недоступны</option>';
      }
    }
  } catch (error) {
    console.error('Ошибка загрузки услуг для записи:', error);
  }
}

// Загружаем данные при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  loadPartners();
  loadPortfolio();
  loadServices();
  loadServicesForBooking();
});

// Также загружаем услуги при открытии формы записи
document.addEventListener('click', function(e) {
  if (e.target.id === 'openTimeModalBtn' || e.target.closest('#openTimeModalBtn')) {
    // Уже загружено в openBookingForm
  }
});

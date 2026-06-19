/* ============================================================
   CxC 2026 – main.js
   ============================================================ */

/* --- NAV SCROLL BEHAVIOUR --- */
const nav = document.getElementById('nav');
/* - const heroLogo = document.querySelector('.hero-logo'); -*/
const navLogo = document.querySelector('.nav-logo img');
const navLogoWrap = document.querySelector('.nav-logo');
let heroLogoRect;
const floatLogo = document.getElementById('cxcLogoFloat');
if (floatLogo) {
  floatLogo.style.cursor = 'pointer';
  floatLogo.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

if (floatLogo) {
  floatLogo.classList.toggle('sticky', scrollY > 60);
}

function updateNav() {
  const scrollY = window.scrollY;
  nav.classList.toggle('scrolled', scrollY > 60);
  if (floatLogo) {
    floatLogo.classList.toggle('sticky', scrollY > 60);
  }
  const wordmark = document.getElementById('swa-wordmark');
if (wordmark) {
  wordmark.style.filter = scrollY > 60 ? 'brightness(0)' : 'brightness(0) invert(1)';
}
if (floatLogo) {
  floatLogo.classList.toggle('sticky', scrollY > 60);
  floatLogo.style.filter = scrollY > 60 ? 'invert(1) brightness(0)' : 'none';
}
}

window.addEventListener('scroll', updateNav, { passive: true });
updateNav();

/* Hero loaded class for bg zoom */
window.addEventListener('load', () => {
  const hero = document.getElementById('hero');
  if (hero) hero.classList.add('loaded');
});

/* --- MOBILE NAV TOGGLE --- */
const hamburger = document.querySelector('.nav-hamburger');
const navLinks = document.querySelector('.nav-links');

function openNav() {
  Object.assign(navLinks.style, {
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    top: '0', left: '0', right: '0', bottom: '0',
    width: '100vw', height: '100vh',
    background: 'rgba(28,28,28,0.98)',
    padding: '80px 40px 40px',
    gap: '28px',
    zIndex: '3000',
    alignItems: 'center',
    justifyContent: 'center'
  });
  navLinks.querySelectorAll('a').forEach(a => a.style.color = '#fff');
  document.body.style.overflow = 'hidden';
  hamburger.style.display = 'none';
  document.getElementById('navClose').style.display = 'block';
}

function closeNav() {
  navLinks.style.display = 'none';
  document.body.style.overflow = '';
  hamburger.style.display = 'flex';
  document.getElementById('navClose').style.display = 'none';
}

// Create close button once
const closeBtn = document.createElement('button');
closeBtn.id = 'navClose';
closeBtn.innerHTML = '✕';
closeBtn.style.cssText = 'display:none;position:fixed;top:24px;right:24px;color:#fff;font-size:28px;background:none;border:none;cursor:pointer;z-index:3001;';
closeBtn.addEventListener('click', closeNav);
document.body.appendChild(closeBtn);

if (hamburger) {
  hamburger.addEventListener('click', () => {
    navLinks.style.display === 'flex' ? closeNav() : openNav();
  });

  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      if (window.innerWidth < 768) closeNav();
    });
  });
}

/* --- SCROLL REVEAL --- */
const revealEls = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
revealEls.forEach(el => observer.observe(el));

/* --- JUDGES CAROUSEL --- */
const track = document.querySelector('.judges-track');
const cards = document.querySelectorAll('.judge-card');
const prevBtn = document.getElementById('judgesPrev');
const nextBtn = document.getElementById('judgesNext');
const dots = document.querySelectorAll('.carousel-dot');

let current = 0;
const visibleCount = () => window.innerWidth < 768 ? 1 : window.innerWidth < 1024 ? 2 : 3;

function moveCarousel(idx) {
  if (!track) return;
  const card = cards[0];
  if (!card) return;
  const cardW = card.offsetWidth + 24;
  const total = cards.length;
  current = ((idx % total) + total) % total;
  track.style.transform = `translateX(-${current * cardW}px)`;
  dots.forEach((d, i) => d.classList.toggle('active', i === current));
}



if (prevBtn) prevBtn.addEventListener('click', () => moveCarousel(current - 1));
if (nextBtn) nextBtn.addEventListener('click', () => moveCarousel(current + 1));
dots.forEach((d, i) => d.addEventListener('click', () => moveCarousel(i)));
window.addEventListener('resize', () => moveCarousel(current));

/* Auto-advance */
let autoTimer = setInterval(() => moveCarousel(current + 1), 4500);

if (track) {
  track.addEventListener('mouseenter', () => clearInterval(autoTimer));
  track.addEventListener('mouseleave', () => {
    autoTimer = setInterval(() => moveCarousel(current + 1 > cards.length - visibleCount() ? 0 : current + 1), 4500);
  });
}

/* --- FAQ ACCORDION --- */
document.querySelectorAll('.faq-q').forEach(q => {
  q.addEventListener('click', () => {
    const item = q.parentElement;
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  });
});

/* --- COUNTDOWN TIMER --- */
function updateCountdown() {
  const target = new Date('2025-06-25T00:00:00+05:30'); // Registration opens
  const now = new Date();
  const diff = target - now;
  if (diff <= 0) {
    ['days','hours','mins','secs'].forEach(id => {
      const el = document.getElementById('cd-' + id);
      if (el) el.textContent = '0';
    });
    return;
  }
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = String(v).padStart(2,'0'); };
  el('cd-days', days); el('cd-hours', hours); el('cd-mins', mins); el('cd-secs', secs);
}
setInterval(updateCountdown, 1000);
updateCountdown();

/* --- REGISTRATION FORM SUBMIT --- */
const form = document.getElementById('registerForm');
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('.form-submit');
    btn.textContent = 'Submitting…';
    btn.disabled = true;

    const data = Object.fromEntries(new FormData(form));

    try {
      // TODO: Replace with actual Google Apps Script URL
      const SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';
      if (SCRIPT_URL !== 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
        const res = await fetch(SCRIPT_URL, {
          method: 'POST',
          body: JSON.stringify(data),
          headers: { 'Content-Type': 'application/json' }
        });
        const json = await res.json();
        if (json.result === 'success') {
          showSuccess();
        } else {
          showError();
        }
      } else {
        // Demo mode
        setTimeout(showSuccess, 1200);
      }
    } catch (err) {
      showError();
    }
  });
}

function showSuccess() {
  const form = document.getElementById('registerForm');
  const card = form?.closest('.register-form-card');
  if (card) {
    card.innerHTML = `
      <div style="text-align:center;padding:40px 0">
        <div style="font-size:56px;margin-bottom:20px">🎉</div>
        <h3 style="font-family:var(--font-head);font-size:24px;margin-bottom:12px;color:var(--ink)">You're Registered!</h3>
        <p style="color:var(--ink-light);font-size:14px;line-height:1.7;max-width:320px;margin:0 auto 24px">
          Your sample pack will be dispatched to your address. Watch your WhatsApp for updates from Swa.
        </p>
        <p style="font-size:13px;color:var(--olive);font-weight:600">Submission deadline: 31 July 2026</p>
      </div>`;
  }
}

function showError() {
  const btn = document.querySelector('.form-submit');
  if (btn) {
    btn.textContent = 'Something went wrong — try again';
    btn.disabled = false;
    btn.style.background = '#cc3333';
    setTimeout(() => {
      btn.textContent = 'Register Now →';
      btn.style.background = '';
    }, 3000);
  }
}

/* --- SMOOTH SCROLL FOR ANCHOR LINKS --- */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const offset = target.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: offset, behavior: 'smooth' });
    }
  });
});

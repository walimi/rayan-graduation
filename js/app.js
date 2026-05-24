// ============================================================
//  Rayan's Graduation Website — Frontend Logic
// ============================================================

const API_BASE = '/api';

// ---- State ----
let photos = [];
let currentSlide = 0;
let carouselTimer = null;
let lightboxIndex = 0;

// ---- Boot ----
document.addEventListener('DOMContentLoaded', () => {
  setupConfetti();
  setupNavScroll();
  loadPhotos();
  setupRSVP();
  setupMusic();
});

// ---- Navigation scroll effect ----
function setupNavScroll() {
  const nav = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    nav.style.boxShadow = window.scrollY > 20
      ? '0 2px 20px rgba(0,0,0,0.3)'
      : 'none';
  }, { passive: true });
}

// ============================================================
//  Photos — load, carousel, grid
// ============================================================

async function loadPhotos() {
  try {
    const res = await fetch(`${API_BASE}/photos`);
    if (!res.ok) return;
    const data = await res.json();
    photos = data.photos || [];
    renderCarousel();
    renderGrid();
  } catch {
    // silently fail — no photos yet
  }
}

function renderCarousel() {
  const track = document.getElementById('carouselTrack');
  const dots  = document.getElementById('carouselDots');

  if (photos.length === 0) {
    track.innerHTML = `
      <div class="carousel-placeholder">
        <span>📸</span>
        <p>Photos will appear here once uploaded</p>
      </div>`;
    dots.innerHTML = '';
    stopAutoPlay();
    return;
  }

  track.innerHTML = photos.map((url, i) => `
    <div class="carousel-slide${i === 0 ? ' active' : ''}">
      <img src="${escHtml(url)}" alt="Photo ${i + 1}" onclick="openLightbox(${i})" loading="lazy">
    </div>
  `).join('');

  dots.innerHTML = photos.map((_, i) => `
    <button class="dot${i === 0 ? ' active' : ''}" onclick="goToSlide(${i})" aria-label="Slide ${i + 1}"></button>
  `).join('');

  currentSlide = 0;
  startAutoPlay();
}

function renderGrid() {
  const grid = document.getElementById('photoGrid');
  if (photos.length === 0) { grid.innerHTML = ''; return; }

  grid.innerHTML = photos.map((url, i) => `
    <div class="grid-item" onclick="openLightbox(${i})">
      <img src="${escHtml(url)}" alt="Photo ${i + 1}" loading="lazy">
      <div class="grid-overlay">🔍</div>
    </div>
  `).join('');
}

// ---- Carousel controls ----
function nextSlide() {
  if (!photos.length) return;
  currentSlide = (currentSlide + 1) % photos.length;
  updateCarousel();
}

function prevSlide() {
  if (!photos.length) return;
  currentSlide = (currentSlide - 1 + photos.length) % photos.length;
  updateCarousel();
}

function goToSlide(index) {
  currentSlide = index;
  updateCarousel();
  resetAutoPlay();
}

function updateCarousel() {
  document.querySelectorAll('.carousel-slide').forEach((s, i) =>
    s.classList.toggle('active', i === currentSlide)
  );
  document.querySelectorAll('.dot').forEach((d, i) =>
    d.classList.toggle('active', i === currentSlide)
  );
}

function startAutoPlay() {
  stopAutoPlay();
  if (photos.length > 1) {
    carouselTimer = setInterval(nextSlide, 4500);
  }
}

function stopAutoPlay() {
  if (carouselTimer) { clearInterval(carouselTimer); carouselTimer = null; }
}

function resetAutoPlay() {
  stopAutoPlay();
  startAutoPlay();
}

// ---- Keyboard nav for carousel ----
document.addEventListener('keydown', (e) => {
  if (document.getElementById('lightbox').classList.contains('open')) {
    if (e.key === 'ArrowLeft')  lightboxPrev();
    if (e.key === 'ArrowRight') lightboxNext();
    if (e.key === 'Escape')     closeLightbox();
  } else {
    if (e.key === 'ArrowLeft')  prevSlide();
    if (e.key === 'ArrowRight') nextSlide();
  }
});

// ============================================================
//  Lightbox
// ============================================================

function openLightbox(index) {
  lightboxIndex = index;
  const lb  = document.getElementById('lightbox');
  const img = document.getElementById('lightboxImg');
  img.src = photos[lightboxIndex];
  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
  stopAutoPlay();
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
  document.body.style.overflow = '';
  startAutoPlay();
}

function lightboxPrev() {
  lightboxIndex = (lightboxIndex - 1 + photos.length) % photos.length;
  document.getElementById('lightboxImg').src = photos[lightboxIndex];
}

function lightboxNext() {
  lightboxIndex = (lightboxIndex + 1) % photos.length;
  document.getElementById('lightboxImg').src = photos[lightboxIndex];
}

// ============================================================
//  RSVP Form
// ============================================================

function adjustGuests(delta) {
  const input = document.getElementById('guests');
  const current = parseInt(input.value) || 1;
  const next = Math.min(10, Math.max(1, current + delta));
  input.value = next;
}

function setupRSVP() {
  document.getElementById('rsvpForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn      = document.getElementById('submitBtn');
    const textEl   = document.getElementById('submitText');
    const feedback = document.getElementById('formFeedback');

    const name    = document.getElementById('name').value.trim();
    const email   = document.getElementById('email').value.trim();
    const guests  = parseInt(document.getElementById('guests').value);
    const message = document.getElementById('message').value.trim();

    if (!name) {
      showFeedback(feedback, 'error', 'Please enter your name.');
      return;
    }

    btn.disabled    = true;
    textEl.textContent = 'Sending…';
    feedback.hidden = true;

    try {
      const res = await fetch(`${API_BASE}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, guests, message }),
      });

      if (res.ok) {
        showFeedback(feedback, 'success',
          `🎉 Thank you, ${name}! Your RSVP for ${guests} ${guests === 1 ? 'person' : 'people'} has been received. We can't wait to celebrate with you!`
        );
        e.target.reset();
        document.getElementById('guests').value = 1;
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Server error');
      }
    } catch (err) {
      showFeedback(feedback, 'error',
        '❌ Something went wrong. Please try again or email wahid.alimi@gmail.com directly.'
      );
      console.error('RSVP error:', err);
    }

    btn.disabled    = false;
    textEl.textContent = 'Send RSVP';
  });
}

function showFeedback(el, type, text) {
  el.hidden    = false;
  el.className = `form-feedback ${type}`;
  el.textContent = text;
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ============================================================
//  Confetti
// ============================================================

function setupConfetti() {
  const container = document.getElementById('confetti');
  const colors = ['#FFCC00', '#006633', '#ffffff', '#FFE066', '#004922', '#7FC97F'];
  const shapes = ['50%', '0', '2px'];

  for (let i = 0; i < 70; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    const size = 5 + Math.random() * 9;
    piece.style.cssText = [
      `left: ${Math.random() * 100}%`,
      `background: ${colors[Math.floor(Math.random() * colors.length)]}`,
      `animation-delay: ${(Math.random() * 5).toFixed(2)}s`,
      `animation-duration: ${(4 + Math.random() * 5).toFixed(2)}s`,
      `width: ${size.toFixed(1)}px`,
      `height: ${(size * (0.4 + Math.random() * 1.2)).toFixed(1)}px`,
      `border-radius: ${shapes[Math.floor(Math.random() * shapes.length)]}`,
      `opacity: ${(0.6 + Math.random() * 0.4).toFixed(2)}`,
    ].join(';');
    container.appendChild(piece);
  }
}

// ============================================================
//  Background Music
// ============================================================

function setMusicPlaying(playing) {
  const btn  = document.getElementById('musicBtn');
  const icon = document.getElementById('musicIcon');
  btn.classList.toggle('playing', playing);
  icon.textContent = playing ? '♫' : '♪';
}

function setupMusic() {
  const audio = document.getElementById('bgMusic');

  // Attempt autoplay immediately
  audio.play()
    .then(() => setMusicPlaying(true))
    .catch(() => {
      // Browser blocked autoplay — play on first user interaction
      const startOnInteraction = () => {
        audio.play()
          .then(() => setMusicPlaying(true))
          .catch(() => {});
        document.removeEventListener('click', startOnInteraction);
        document.removeEventListener('keydown', startOnInteraction);
      };
      document.addEventListener('click', startOnInteraction);
      document.addEventListener('keydown', startOnInteraction);
    });
}

function toggleMusic() {
  const audio = document.getElementById('bgMusic');
  if (audio.paused) {
    audio.play().then(() => setMusicPlaying(true)).catch(() => {});
  } else {
    audio.pause();
    setMusicPlaying(false);
  }
}

// ============================================================
//  Utility
// ============================================================

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

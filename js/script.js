const form = document.getElementById('thumb-form');
const input = document.getElementById('url-input');
const errorMsg = document.getElementById('error-msg');
const resultsSection = document.getElementById('results');
const resultsHeading = document.getElementById('results-heading');
const resultsGrid = document.getElementById('results-grid');

const QUALITIES = [
  { key: 'maxresdefault', label: 'Max Resolution', size: '1280 × 720' },
  { key: 'sddefault', label: 'Standard Definition', size: '640 × 480' },
  { key: 'hqdefault', label: 'High Quality', size: '480 × 360' },
  { key: 'mqdefault', label: 'Medium Quality', size: '320 × 180' },
  { key: 'default', label: 'Default', size: '120 × 90' },
];

function extractVideoId(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '');

  if (host === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0];
    return isValidId(id) ? id : null;
  }

  if (host === 'youtube.com' || host === 'music.youtube.com') {
    if (url.searchParams.has('v')) {
      const id = url.searchParams.get('v');
      return isValidId(id) ? id : null;
    }
    const parts = url.pathname.split('/').filter(Boolean);
    const idx = parts.findIndex(p => ['shorts', 'embed', 'live', 'v'].includes(p));
    if (idx !== -1 && parts[idx + 1]) {
      const id = parts[idx + 1];
      return isValidId(id) ? id : null;
    }
  }

  return null;
}

function isValidId(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(id);
}

function showError(message) {
  errorMsg.textContent = message;
  errorMsg.hidden = false;
}

function clearError() {
  errorMsg.hidden = true;
  errorMsg.textContent = '';
}

// Skeleton cards reserve the exact grid space real results will use, so
// nothing below the results section shifts once a search fills them in.
function renderSkeleton() {
  QUALITIES.forEach(({ key, label, size }) => {
    const card = document.createElement('div');
    card.className = 'thumb-card skeleton';
    card.dataset.quality = key;

    const media = document.createElement('div');
    media.className = 'thumb-media';

    const info = document.createElement('div');
    info.className = 'thumb-info';
    info.innerHTML = `
      <span>
        <span class="thumb-label">${label}</span>
        <span class="thumb-size">${size}</span>
      </span>
    `;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'download-btn';
    btn.textContent = 'Download';
    btn.disabled = true;
    info.appendChild(btn);

    card.appendChild(media);
    card.appendChild(info);
    resultsGrid.appendChild(card);
  });
}

// One delegated listener handles every card's Download button, including
// ones that get (re)populated after a later search.
resultsGrid.addEventListener('click', (e) => {
  const btn = e.target.closest('.download-btn');
  if (!btn || btn.disabled) return;
  downloadImage(btn.dataset.src, btn.dataset.filename);
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  clearError();

  const videoId = extractVideoId(input.value);
  if (!videoId) {
    showError('That doesn\'t look like a valid YouTube video URL. Try something like https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    return;
  }

  input.value = `https://www.youtube.com/watch?v=${videoId}`;
  buildResults(videoId);
});

function buildResults(videoId) {
  resultsHeading.hidden = false;
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  QUALITIES.forEach(({ key, label }) => {
    const card = resultsGrid.querySelector(`[data-quality="${key}"]`);
    card.hidden = false;
    card.classList.remove('skeleton');

    const src = `https://img.youtube.com/vi/${videoId}/${key}.jpg`;
    const media = card.querySelector('.thumb-media');
    let img = media.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      img.loading = 'lazy';
      img.alt = `${label} thumbnail`;
      media.appendChild(img);
    }

    // maxresdefault falls back to a 120x90 placeholder when unavailable — hide that card.
    if (key === 'maxresdefault') {
      img.onload = () => {
        card.hidden = img.naturalWidth === 120 && img.naturalHeight === 90;
      };
    }
    img.src = src;

    const btn = card.querySelector('.download-btn');
    btn.disabled = false;
    btn.dataset.src = src;
    btn.dataset.filename = `${videoId}-${key}.jpg`;
  });
}

async function downloadImage(src, filename) {
  try {
    const response = await fetch(src, { mode: 'cors' });
    if (!response.ok) throw new Error('Network response was not ok');
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    // Fallback for browsers/CORS setups that block the fetch — open the image directly.
    window.open(src, '_blank', 'noopener');
  }
}

renderSkeleton();

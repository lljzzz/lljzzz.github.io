'use strict';

// All enhancements run locally. No analytics, cookies or persistent settings.
const demoButtons = [...document.querySelectorAll('[data-demo]')];
const demoPanels = [...document.querySelectorAll('.demo-panel')];
if (demoButtons.length && demoPanels.length) {
  document.querySelector('.demo-tabs').hidden = false;
  function selectDemo(name) {
    for (const button of demoButtons) {
      button.setAttribute('aria-pressed', String(button.dataset.demo === name));
    }
    for (const panel of demoPanels) {
      panel.hidden = panel.id !== `demo-${name}`;
      if (panel.hidden) panel.querySelector('video').pause();
    }
  }
  for (const button of demoButtons) {
    button.addEventListener('click', () => selectDemo(button.dataset.demo));
  }
  selectDemo('snippets');
}

// Playback is always user initiated. Only one demo plays at a time.
for (const video of document.querySelectorAll('video')) {
  video.addEventListener('play', () => {
    for (const other of document.querySelectorAll('video')) {
      if (other !== video) other.pause();
    }
  });
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) document.querySelectorAll('video').forEach(video => video.pause());
});

const appearanceControls = document.querySelector('.appearance-controls');
if (appearanceControls) {
  appearanceControls.hidden = false;
  const screenshot = document.getElementById('appearance-image');
  const link = document.getElementById('appearance-link');
  const caption = document.getElementById('appearance-caption');
  let request = 0;
  appearanceControls.addEventListener('change', () => {
    const theme = appearanceControls.querySelector('[name="theme"]:checked').value;
    const accent = appearanceControls.querySelector('[name="accent"]:checked').value;
    if (!['dark', 'light'].includes(theme) || !['orange', 'blue', 'teal', 'pink', 'violet'].includes(accent)) return;
    const token = ++request;
    const path = `img/appearance-${theme}-${accent}.webp`;
    const title = `${theme[0].toUpperCase()}${theme.slice(1)} theme · ${accent[0].toUpperCase()}${accent.slice(1)} accent`;
    const next = new Image();
    caption.textContent = `Loading ${title.toLowerCase()}…`;
    next.onload = () => {
      if (token !== request) return;
      screenshot.src = path;
      screenshot.alt = `Volt's autoclicker in the ${theme} theme with the ${accent} accent.`;
      link.href = path;
      link.dataset.caption = `Volt 0.8 · ${title}`;
      caption.textContent = title;
    };
    next.onerror = () => {
      if (token === request) caption.textContent = 'This preview could not load. Select another colour or try again.';
    };
    next.src = path;
  });
}

const dialog = document.getElementById('screenshot-dialog');
if (dialog && typeof dialog.showModal === 'function') {
  let opener;
  document.querySelectorAll('a[data-zoom]').forEach(link => {
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      opener = link;
      const title = link.dataset.caption || 'Volt screenshot';
      document.getElementById('screenshot-title').textContent = title;
      const image = document.getElementById('screenshot-image');
      image.src = link.href;
      image.alt = link.querySelector('img')?.alt || title;
      document.getElementById('screenshot-original').href = link.href;
      dialog.showModal();
    });
  });
  document.getElementById('close-screenshot').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => opener?.focus());
}

// Direct links open the relevant help text before the browser scrolls to it.
function revealHash(hash) {
  if (!hash || hash === '#') return;
  let target;
  try { target = document.getElementById(decodeURIComponent(hash.slice(1))); } catch { return; }
  if (!target) return;
  for (let element = target; element; element = element.parentElement) {
    if (element.tagName === 'DETAILS') element.open = true;
  }
}
document.addEventListener('click', event => {
  const anchor = event.target.closest('a[href^="#"]');
  if (anchor) revealHash(anchor.hash);
});
window.addEventListener('hashchange', () => revealHash(location.hash));
revealHash(location.hash);

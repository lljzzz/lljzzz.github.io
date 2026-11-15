'use strict';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const animations = new Map();
function loadAnimation(url) {
  if (!animations.has(url)) {
    animations.set(url, fetch(url).then(response => (response.ok ? response.blob() : null)).catch(() => null));
  }
  return animations.get(url);
}
const motionDemos = [...document.querySelectorAll('.motion-demo')].map(container => (
  { container, image: container.querySelector('.animated-demo'), inView: false, playing: false, token: 0, url: null }
));
function release(demo) {
  if (demo.url) {
    URL.revokeObjectURL(demo.url);
    demo.url = null;
  }
}
async function startDemo(demo) {
  const token = ++demo.token;
  const blob = await loadAnimation(demo.image.dataset.animation);
  if (token !== demo.token) return;
  if (!blob) {
    demo.image.src = demo.image.dataset.animation;
    return;
  }
  const url = URL.createObjectURL(blob);
  const probe = new Image();
  probe.src = url;
  try { await probe.decode(); } catch {}
  if (token !== demo.token) {
    URL.revokeObjectURL(url);
    return;
  }
  const previous = demo.url;
  demo.url = url;
  demo.image.src = url;
  if (previous) URL.revokeObjectURL(previous);
}
function stopDemo(demo) {
  demo.token++;
  demo.image.src = demo.image.dataset.poster;
  release(demo);
}
function updateMotion() {
  for (const demo of motionDemos) {
    const playing = !reducedMotion.matches && demo.inView && !document.hidden && !demo.container.hidden;
    if (playing !== demo.playing) {
      demo.playing = playing;
      if (playing) startDemo(demo);
      else stopDemo(demo);
    }
    demo.image.dataset.playing = String(playing);
  }
}
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) motionDemos.find(item => item.container === entry.target).inView = entry.isIntersecting;
    updateMotion();
  }, { threshold: 0.1 });
  motionDemos.forEach(demo => observer.observe(demo.container));
  const warm = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      warm.unobserve(entry.target);
      entry.target.querySelectorAll('.animated-demo').forEach(image => {
        new Image().src = image.dataset.poster;
        if (!reducedMotion.matches) loadAnimation(image.dataset.animation);
      });
    }
  }, { rootMargin: '600px 0px' });
  document.querySelectorAll('#palette, #demos').forEach(section => warm.observe(section));
} else {
  motionDemos.forEach(demo => { demo.inView = true; });
}
reducedMotion.addEventListener('change', updateMotion);
document.addEventListener('visibilitychange', updateMotion);
const demoButtons = [...document.querySelectorAll('[data-demo]')];
const demoPanels = [...document.querySelectorAll('.demo-panel')];
if (demoButtons.length && demoPanels.length) {
  document.querySelector('.demo-tabs').hidden = false;
  function selectDemo(name) {
    demoButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.demo === name)));
    demoPanels.forEach(panel => { panel.hidden = panel.id !== `demo-${name}`; });
    updateMotion();
  }
  demoButtons.forEach(button => button.addEventListener('click', () => selectDemo(button.dataset.demo)));
  selectDemo('snippets');
}
updateMotion();

const appearanceControls = document.querySelector('.appearance-controls');
if (appearanceControls) {
  appearanceControls.hidden = false;
  const frames = [...document.querySelectorAll('.appearance-frame')];
  const stage = document.querySelector('.appearance-stage');
  const link = document.getElementById('appearance-link');
  const caption = document.getElementById('appearance-caption');
  const error = document.getElementById('appearance-error');
  let request = 0;
  let fadeTimeout;
  function warmPreviews() {
    return Promise.allSettled(frames.map(frame => { frame.loading = 'eager'; return frame.decode(); }));
  }
  if ('IntersectionObserver' in window) {
    const warmup = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { warmPreviews(); warmup.disconnect(); }
    }, { rootMargin: '450px' });
    warmup.observe(appearanceControls);
  }
  appearanceControls.addEventListener('pointerenter', warmPreviews, { once: true });
  appearanceControls.addEventListener('focusin', warmPreviews, { once: true });
  appearanceControls.addEventListener('change', async () => {
    const theme = appearanceControls.querySelector('[name="theme"]:checked').value;
    const accent = appearanceControls.querySelector('[name="accent"]:checked').value;
    const next = frames.find(frame => frame.dataset.theme === theme && frame.dataset.accent === accent);
    if (!next) return;
    const token = ++request;
    stage.setAttribute('aria-busy', 'true');
    error.hidden = true;
    try {
      next.loading = 'eager';
      await next.decode();
      if (token !== request) return;
      const previous = frames.find(frame => frame.classList.contains('is-current'));
      if (previous === next) return;
      frames.forEach(frame => {
        frame.classList.remove('was-current');
        frame.classList.toggle('is-current', frame === next);
        frame.setAttribute('aria-hidden', String(frame !== next));
      });
      if (previous) {
        previous.classList.add('was-current');
        clearTimeout(fadeTimeout);
        fadeTimeout = setTimeout(() => previous.classList.remove('was-current'), 260);
      }
      const title = `${theme[0].toUpperCase()}${theme.slice(1)} theme · ${accent[0].toUpperCase()}${accent.slice(1)} accent`;
      link.href = next.src;
      link.dataset.caption = `Volt 0.8 · ${title}`;
      caption.textContent = title;
    } catch {
      if (token !== request) return;
      error.textContent = 'This preview could not load. Please try another colour.';
      error.hidden = false;
    } finally {
      if (token === request) stage.removeAttribute('aria-busy');
    }
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
      image.alt = (link.querySelector('.is-current') || link.querySelector('img'))?.alt || title;
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

let highlighted;
let highlightTimeout;
function revealHash(hash) {
  if (!hash || hash === '#') return;
  let target;
  try { target = document.getElementById(decodeURIComponent(hash.slice(1))); } catch { return; }
  if (!target) return;
  for (let element = target; element; element = element.parentElement) {
    if (element.tagName === 'DETAILS') element.open = true;
  }
  if (!target.matches('.help-detail, .shortcut-details')) return;
  clearTimeout(highlightTimeout);
  highlighted?.classList.remove('jump-highlight');
  highlighted = target;
  target.classList.add('jump-highlight');
  highlightTimeout = setTimeout(() => target.classList.remove('jump-highlight'), 1200);
}
document.addEventListener('click', event => {
  const anchor = event.target.closest('a[href^="#"]');
  if (anchor) revealHash(anchor.hash);
});
window.addEventListener('hashchange', () => revealHash(location.hash));
revealHash(location.hash);

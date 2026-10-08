const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const nav = document.getElementById('nav');
const menu = document.getElementById('menu-btn');
const links = document.getElementById('nav-links');
function closeMenu() { links.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); }
menu.addEventListener('click', () => menu.setAttribute('aria-expanded', String(links.classList.toggle('open'))));
links.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && links.classList.contains('open')) { closeMenu(); menu.focus(); } });
document.addEventListener('click', event => { if (!event.target.closest('#nav')) closeMenu(); });
window.matchMedia('(min-width: 641px)').addEventListener('change', closeMenu);
const progress = document.getElementById('progress');
const timeline = document.querySelector('.timeline');
const fill = document.getElementById('tl-fill');
let scheduled = false;
function updateScroll() {
  scheduled = false;
  nav.classList.toggle('scrolled', window.scrollY > 30);
  const max = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.width = `${max > 0 ? window.scrollY / max * 100 : 0}%`;
  const rect = timeline.getBoundingClientRect();
  fill.style.height = `${Math.min(Math.max(window.innerHeight * .65 - rect.top, 0), rect.height)}px`;
}
window.addEventListener('scroll', () => { if (!scheduled) { scheduled = true; requestAnimationFrame(updateScroll); } }, { passive: true });
window.addEventListener('resize', updateScroll);
document.querySelectorAll('details').forEach(details => details.addEventListener('toggle', updateScroll));
updateScroll();
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
  }), { threshold: .1 });
  document.querySelectorAll('.reveal').forEach(item => observer.observe(item));
}
const filters = document.querySelectorAll('[data-filter]');
const cards = document.querySelectorAll('.card');
filters.forEach(button => button.addEventListener('click', () => {
  let count = 0;
  cards.forEach(card => { card.hidden = button.dataset.filter !== 'all' && !card.dataset.category.split(' ').includes(button.dataset.filter); if (!card.hidden) count++; });
  filters.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  document.getElementById('project-count').textContent = `${count} project${count === 1 ? '' : 's'}`;
  updateScroll();
}));
if (window.matchMedia('(hover: hover)').matches) cards.forEach(card => {
  card.addEventListener('pointermove', event => {
    if (reduced.matches) return;
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - .5;
    const y = (event.clientY - rect.top) / rect.height - .5;
    card.style.transform = `perspective(1000px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) translateY(-4px)`;
  });
  card.addEventListener('pointerleave', () => { card.style.transform = ''; });
});
reduced.addEventListener('change', () => cards.forEach(card => { card.style.transform = ''; }));
document.getElementById('copy-email').addEventListener('click', async () => {
  const status = document.getElementById('copy-status');
  try { await navigator.clipboard.writeText('macaraigjohnroyce@gmail.com'); status.textContent = 'Email copied. Let’s start a conversation!'; }
  catch { status.textContent = 'Select the email address to copy it, or click it to open your email app.'; }
});

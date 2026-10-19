(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hoverPointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const nav = document.getElementById('nav');
  const menu = document.getElementById('menu-btn');
  const links = document.getElementById('nav-links');

  function onMediaChange(query, callback) {
    if (query.addEventListener) query.addEventListener('change', callback);
    else query.addListener(callback);
  }

  function closeMenu() {
    links?.classList.remove('open');
    menu?.setAttribute('aria-expanded', 'false');
  }

  if (menu && links) {
    menu.addEventListener('click', () => {
      const isOpen = links.classList.toggle('open');
      menu.setAttribute('aria-expanded', String(isOpen));
    });
    links.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && links.classList.contains('open')) {
        closeMenu();
        menu.focus();
      }
    });
    document.addEventListener('click', event => {
      if (event.target instanceof Node && !nav?.contains(event.target)) closeMenu();
    });
    onMediaChange(window.matchMedia('(min-width: 769px)'), closeMenu);
  }

  const progress = document.getElementById('progress');
  const timeline = document.querySelector('.timeline');
  const fill = document.getElementById('tl-fill');
  const sectionLinks = Array.from(links?.querySelectorAll('a[href^="#"]') || [])
    .map(link => {
      const id = link.dataset.section || link.getAttribute('href').slice(1);
      const section = id === 'top' ? document.querySelector('.hero') : document.getElementById(id);
      return { link, section };
    })
    .filter(item => item.section)
    .sort((a, b) => {
      if (a.section === b.section) return 0;
      return a.section.compareDocumentPosition(b.section) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
  let scheduled = false;

  function updateScroll() {
    scheduled = false;
    const scrollTop = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    nav?.classList.toggle('scrolled', scrollTop > 30);
    if (progress) progress.style.width = `${maxScroll > 0 ? Math.min(100, Math.max(0, scrollTop / maxScroll * 100)) : 0}%`;
    if (timeline && fill) {
      const rect = timeline.getBoundingClientRect();
      fill.style.height = `${Math.min(Math.max(window.innerHeight * .65 - rect.top, 0), rect.height)}px`;
    }

    const marker = Math.max((nav?.offsetHeight || 0) + 24, window.innerHeight * .24);
    let active = sectionLinks[0];
    sectionLinks.forEach(item => {
      if (item.section.getBoundingClientRect().top <= marker) active = item;
    });
    if (maxScroll > 0 && scrollTop >= maxScroll - 2) active = sectionLinks.at(-1);
    sectionLinks.forEach(item => {
      const isActive = item === active;
      item.link.classList.toggle('active', isActive);
      if (isActive) item.link.setAttribute('aria-current', 'location');
      else item.link.removeAttribute('aria-current');
    });
  }

  function scheduleScrollUpdate() {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(updateScroll);
    }
  }

  window.addEventListener('scroll', scheduleScrollUpdate, { passive: true });
  window.addEventListener('resize', scheduleScrollUpdate);
  window.addEventListener('load', scheduleScrollUpdate);
  document.querySelectorAll('details').forEach(details => details.addEventListener('toggle', scheduleScrollUpdate));

  const revealItems = document.querySelectorAll('.reveal');
  let revealObserver;
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    }), { threshold: .1 });
    revealItems.forEach(item => revealObserver.observe(item));
  } else {
    revealItems.forEach(item => item.classList.add('visible'));
  }

  const filters = Array.from(document.querySelectorAll('[data-filter]'));
  const cards = Array.from(document.querySelectorAll('.card[data-category]'));
  const projectCount = document.getElementById('project-count');

  function applyFilter(button) {
    const selected = button?.dataset.filter || 'all';
    let count = 0;
    cards.forEach(card => {
      const categories = (card.dataset.category || '').split(/\s+/);
      card.hidden = selected !== 'all' && !categories.includes(selected);
      if (!card.hidden) count++;
      card.style.transform = '';
    });
    filters.forEach(item => {
      const isActive = item === button;
      item.setAttribute('aria-pressed', String(isActive));
      item.classList.toggle('active', isActive);
    });
    if (projectCount) projectCount.textContent = `${count} project${count === 1 ? '' : 's'}`;
    scheduleScrollUpdate();
  }

  filters.forEach(button => button.addEventListener('click', () => applyFilter(button)));
  if (filters.length) {
    applyFilter(filters.find(button => button.getAttribute('aria-pressed') === 'true') || filters[0]);
  } else if (projectCount) {
    const count = cards.filter(card => !card.hidden).length;
    projectCount.textContent = `${count} project${count === 1 ? '' : 's'}`;
  }

  function resetCardTilt() {
    cards.forEach(card => { card.style.transform = ''; });
  }

  cards.forEach(card => {
    card.addEventListener('pointermove', event => {
      if (reducedMotion.matches || !hoverPointer.matches || event.pointerType === 'touch') return;
      const rect = card.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - rect.top) / rect.height - .5;
      card.style.transform = `perspective(1100px) rotateY(${x * 4}deg) rotateX(${-y * 4}deg) translateY(-3px)`;
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    card.addEventListener('pointercancel', () => { card.style.transform = ''; });
  });
  onMediaChange(hoverPointer, resetCardTilt);
  onMediaChange(reducedMotion, () => {
    resetCardTilt();
    if (reducedMotion.matches) {
      revealObserver?.disconnect();
      revealItems.forEach(item => item.classList.add('visible'));
    }
  });

  const copyEmail = document.getElementById('copy-email');
  const copyStatus = document.getElementById('copy-status');
  copyEmail?.addEventListener('click', async () => {
    const email = copyEmail.dataset.email || 'macaraigjohnroyce@gmail.com';
    if (copyStatus) copyStatus.textContent = 'Copying email…';
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(email);
      if (copyStatus) copyStatus.textContent = 'Email copied. Let’s start a conversation!';
    } catch {
      if (copyStatus) copyStatus.textContent = 'Select the email address to copy it, or click it to open your email app.';
    }
  });

  updateScroll();
})();

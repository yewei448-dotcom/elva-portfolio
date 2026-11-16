(() => {
  'use strict';
  const draft = window.websiteDefaults;
  const ui = window.PortfolioUI;
  if (!draft || !ui) return;
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const main = document.querySelector('#portfolio-main');
  const pages = ['experience', 'capability', 'ai', 'contact'];
  const labels = ['EXPERIENCE', 'CAPABILITY', 'AI APPLICATIONS', 'CONTACT'];
  pages.forEach((id, i) => {
    const page = draft.pages.find(x => x.id === id);
    if (!page) return;
    const section = el('section', `portfolio-section section paper portfolio-${id}`); section.id = id;
    const shell = el('div', 'section-shell');
    if (id === 'contact') {
      section.classList.remove('paper'); section.classList.add('photo-finale');
      const bg = page.background || {};
      const image = ui.safeUrl(bg.image, true);
      const overlay = Math.max(0, Math.min(.8, Number(bg.overlay) || 0));
      section.classList.toggle('has-photo', Boolean(image));
      section.style.backgroundColor = /^#[0-9a-f]{3,8}$/i.test(bg.color || '') ? bg.color : '#7094ac';
      section.style.backgroundImage = image ? `linear-gradient(rgba(18,27,23,${overlay}),rgba(18,27,23,${Math.min(.8, overlay + .1)})),url(${JSON.stringify(image)})` : 'none';
      shell.append(ui.contactScene(page, draft.site)); section.append(shell); main.append(section); return;
    }
    const heading = el('header', 'portfolio-heading');
    const title = el('div');
    title.append(el('span', 'portfolio-kicker', `${String(i + 1).padStart(2, '0')} / ${labels[i]}`), el('h2', '', page.title));
    heading.append(title);
    if (page.subtitle) heading.append(el('p', '', page.subtitle));
    shell.append(heading);
    if (id === 'experience') {
      const grid = el('div', 'experience-grid');
      page.sections.flatMap(x => x.items || []).forEach((item, index) => grid.append(ui.companyCard(item, index)));
      shell.append(grid);
    } else if (id === 'capability') {
      const list = el('div', 'capability-list');
      page.sections.forEach(s => list.append(ui.capability(s)));
      shell.append(list);
    } else if (id === 'ai') {
      const grid = el('div', 'workbench-grid');
      page.sections.flatMap(x => x.items || []).forEach((item, index) => grid.append(ui.workflow(item, index)));
      shell.append(grid);
    }
    section.append(shell); main.append(section);
  });
  const home = draft.pages.find(x => x.id === 'home');
  if (home?.subtitle) document.querySelector('.hero-intro').textContent = home.subtitle;
  const menuButton = document.querySelector('.menu-toggle');
  const menu = document.querySelector('#mobile-menu');
  function closeMenu() { menu.hidden = true; menuButton.setAttribute('aria-expanded', 'false'); menuButton.setAttribute('aria-label', '打开菜单'); }
  menuButton.addEventListener('click', () => {
    const open = menu.hidden; menu.hidden = !open;
    menuButton.setAttribute('aria-expanded', String(open)); menuButton.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
  });
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
  const portrait = document.querySelector('#portrait-card');
  if (portrait && matchMedia('(pointer:fine)').matches && !matchMedia('(prefers-reduced-motion:reduce)').matches) {
    let start = null;
    portrait.addEventListener('pointerdown', event => {
      if (event.button !== 0) return; start = event.clientX;
      portrait.setPointerCapture(event.pointerId); portrait.classList.add('dragging'); event.preventDefault();
    });
    portrait.addEventListener('pointermove', event => {
      if (start === null) return;
      portrait.style.setProperty('--badge-angle', `${Math.max(-22, Math.min(18, -8 + (event.clientX - start) / 12))}deg`);
    });
    const release = () => { start = null; portrait.classList.remove('dragging'); portrait.style.setProperty('--badge-angle', '-8deg'); };
    portrait.addEventListener('pointerup', release); portrait.addEventListener('pointercancel', release);
  }
  if ('IntersectionObserver' in window) {
    const links = [...document.querySelectorAll('.dock-item')];
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      links.forEach(a => { const active = a.hash === `#${entry.target.id}`; a.classList.toggle('is-active', active); if (active) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
    }), { rootMargin: '-15% 0px -45% 0px' });
    main.querySelectorAll(':scope > section').forEach(s => observer.observe(s));
  }
  const legacy = { about: 'experience', accounts: 'capability', photos: 'capability', projects: 'ai' };
  const hash = location.hash.slice(1); const target = legacy[hash] || hash;
  if (target && 'scrollRestoration' in history) history.scrollRestoration = 'manual';
  function scrollToInitialSection() { requestAnimationFrame(() => {
    if (!target) return;
    const node = document.getElementById(target);
    if (!node) return;
    if (legacy[hash]) history.replaceState(null, '', `#${target}`);
    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    node.scrollIntoView({ behavior: 'auto', block: 'start' });
    requestAnimationFrame(() => { root.style.scrollBehavior = previous; });
  }); }
  scrollToInitialSection();
  if (document.readyState !== 'complete') window.addEventListener('load', scrollToInitialSection, { once: true });
})();

(() => {
  'use strict';
  const language = window.WebsiteLanguage?.getLanguage() || 'zh';
  const draft = window.WebsiteLanguage?.resolve(window.websiteDefaults, language) || window.websiteDefaults;
  const copy = (zh, en) => language === 'en' ? en : zh;
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
  const labels = ['PAST EXPERIENCE', 'CAPABILITIES', 'AI APPLICATIONS', 'CONTACT'];
  pages.forEach((id, i) => {
    const page = draft.pages.find(x => x.id === id);
    if (!page || page.archived) return;
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
    shell.append(heading);
    if (id === 'experience') {
      const grid = el('div', 'experience-grid');
      page.sections.flatMap(x => x.items || []).forEach((item, index) => grid.append(ui.companyCard(item, index)));
      shell.append(grid);
    } else if (id === 'capability') {
      const list = el('div', 'portfolio-gallery');
      page.sections.forEach((s, index) => list.append(ui.portfolioSection(s, index)));
      shell.append(ui.capabilityReveal(list));
    } else if (id === 'ai') {
      if (page.subtitle) shell.append(ui.aiStatement(page.subtitle));
      page.sections.forEach((section, sectionIndex) => {
        if (section.kind === 'links') { shell.append(ui.resourceLinks(section)); return; }
        if (section.kind !== 'workflow') { shell.append(ui.portfolioSection(section, sectionIndex)); return; }
        const grid = el('div', 'workbench-grid');
        (section.items || []).forEach((item, index) => grid.append(ui.workflow(item, index)));
        shell.append(grid);
      });
    }
    section.append(shell); main.append(section);
  });
  const home = draft.pages.find(x => x.id === 'home');
  document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
  document.querySelectorAll('.desktop-nav a, #mobile-menu a, .dock-item').forEach(anchor => {
    const page = draft.pages.find(page => `#${page.id}` === anchor.hash);
    if (!page) return;
    if (anchor.classList.contains('dock-item')) anchor.querySelector('.dock-tooltip').textContent = page.name;
    else anchor.textContent = page.name;
    anchor.setAttribute('aria-label', page.name);
  });
  const languageButton = document.querySelector('.language-toggle');
  languageButton.textContent = language === 'en' ? '中' : 'EN';
  languageButton.setAttribute('aria-label', copy('切换为英文', 'Switch to Chinese'));
  languageButton.addEventListener('click', () => {
    const next = language === 'en' ? 'zh' : 'en';
    window.WebsiteLanguage?.setLanguage(next);
    const url = new URL(location.href); url.searchParams.set('lang', next); history.replaceState(null, '', url); location.reload();
  });
  document.querySelector('.hero-status > span:last-child').textContent = home?.statusText ?? copy('探索世界中', 'Exploring the world');
  document.querySelector('.id-bottom > span:first-child').textContent = home?.portraitFooterLeft ?? copy('西南财经大学硕士', 'SWUFE · Master’s');
  document.querySelector('.id-bottom > span:last-child').textContent = home?.portraitFooterRight ?? 'ENTP';
  document.querySelector('.skip-link').textContent = copy('跳到主要内容', 'Skip to content');
  document.querySelector('.desktop-nav').setAttribute('aria-label', copy('主导航', 'Main navigation'));
  document.querySelector('.logo').setAttribute('aria-label', copy('Elva 首页', 'Elva home'));
  document.querySelector('#portrait-card > img').alt = copy('Elva 在户外的个人照片', 'Elva outdoors');
  if (typeof home?.subtitle === 'string') document.querySelector('.hero-intro').textContent = home.subtitle;
  if (typeof home?.title === 'string') {
    const heading = document.querySelector('.hero h1');
    const [name, ...motto] = home.title.split('\n');
    heading.replaceChildren(el('span', 'hero-name', name));
    if (motto.length) heading.append(el('span', 'hero-motto', motto.join('\n')));
  }
  const avatar = ui.safeUrl(home?.avatarImage, true);
  const portraitImage = ui.safeUrl(home?.portraitImage, true);
  const avatarNode = document.querySelector('.hero-status img');
  avatarNode.hidden = !avatar;
  if (avatar) avatarNode.src = avatar;
  if (portraitImage) document.querySelector('#portrait-card > img').src = portraitImage;
  else { document.querySelector('.hanging-photo').hidden = true; document.querySelector('.mobile-cord').hidden = true; }
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
    const links = [...document.querySelectorAll('.dock-item, .desktop-nav a')];
    document.querySelector('.desktop-nav a')?.classList.add('is-active');
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      links.forEach(a => { const active = a.hash === `#${entry.target.id}`; a.classList.toggle('is-active', active); if (active) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
    }), { rootMargin: '-15% 0px -45% 0px' });
    main.querySelectorAll(':scope > section').forEach(s => observer.observe(s));
  }
  const legacy = { about: 'experience', accounts: 'capability', photos: 'capability', projects: 'ai', life: 'contact', education: 'contact' };
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

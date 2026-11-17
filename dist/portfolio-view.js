(() => {
  'use strict';
  const textFor = (zh, en) => window.WebsiteLanguage?.getLanguage() === 'en' ? en : zh;
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  };
  function safeUrl(value, image = false) {
    if (typeof value !== 'string' || value.length > 14000000) return '';
    const url = value.trim();
    if (!url || /[\u0000-\u001f\u007f]/.test(url)) return '';
    if (image && /^data:image\/(?:png|jpe?g|webp|gif|avif);base64,[a-z\d+/=\s]+$/i.test(url)) return url;
    if (/^assets\//i.test(url)) {
      try {
        const path = decodeURIComponent(url);
        return !path.includes('..') && !/[<>\\?#]/.test(path) && (image || /\.pdf$/i.test(path)) ? url : '';
      } catch { return ''; }
    }
    if (!image && /^(mailto|tel):[^\s]+$/i.test(url)) return url;
    try {
      const parsed = new URL(url);
      return ['https:', 'http:'].includes(parsed.protocol) ? parsed.href : '';
    } catch { return ''; }
  }
  function link(url, label, cls = '') {
    const a = el('a', cls, label);
    if (/^editor\.html(?:\?|$)/.test(url)) {
      const target = new URL(url, location.href); target.searchParams.set('lang', window.WebsiteLanguage?.getLanguage() || 'zh');
      a.href = `editor.html${target.search}`;
    } else a.href = url;
    if (/^https?:/i.test(url)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    return a;
  }
  function image(src, alt, cls) {
    const img = el('img', cls);
    img.src = src; img.alt = alt; img.loading = 'lazy';
    img.addEventListener('error', () => {
      img.hidden = true;
      const fallback = el('span', 'logo-fallback', alt);
      img.after(fallback);
    }, { once: true });
    return img;
  }
  function metricList(metrics = []) {
    const row = el('div', 'portfolio-metrics');
    metrics.slice(0, 6).forEach(metric => {
      const item = el('div');
      item.append(el('strong', '', metric.value), el('span', '', metric.label));
      row.append(item);
    });
    return row;
  }
  function paragraphs(value, cls = 'portfolio-copy') {
    const div = el('div', cls);
    String(value || '').split(/\n\s*\n/).filter(Boolean).forEach(p => div.append(el('p', '', p)));
    return div;
  }
  function uniqueLinks(item) {
    const source = Array.isArray(item.links) ? item.links : [];
    const valid = source.map(x => ({ label: x.label || textFor('查看作品', 'View work'), url: safeUrl(x.url) })).filter(x => x.url);
    const primary = safeUrl(item.url);
    if (primary && !valid.some(x => x.url === primary)) valid.push({ label: textFor('查看作品', 'View work'), url: primary });
    const seen = new Set();
    return valid.filter(x => { if (seen.has(x.url)) return false; seen.add(x.url); return true; });
  }
  function proofLinks(item, compact = false) {
    const links = uniqueLinks(item);
    const hasSlots = Array.isArray(item.links) && item.links.length > 0;
    if (!links.length && !hasSlots) return null;
    const details = el('details', 'proof-fold');
    const summary = el('summary');
    summary.append(el('span', '', compact ? textFor('链接与演示', 'Links & demos') : textFor('代表作品 / 合作', 'Selected work / collaborations')), el('span', 'fold-plus', '+'));
    const body = el('div', 'proof-links');
    links.forEach(x => {
      const a = link(x.url, '', 'proof-link');
      a.append(el('span', '', x.label), el('span', '', '↗')); body.append(a);
    });
    if (!links.length) {
      if (document.body.dataset.draftContext === 'true') {
        body.append(link('editor.html?page=capability', textFor('添加作品链接 ↗', 'Add work links ↗'), 'proof-link'));
      } else body.append(el('span', 'proof-pending', textFor('作品待补充', 'Work to be added')));
    }
    details.append(summary, body); return details;
  }
  function companyCard(item, index) {
    const card = el('details', `xp-company xp-${index % 5}`);
    const summary = el('summary', 'xp-summary');
    const top = el('span', 'xp-top');
    top.append(el('span', '', item.period || item.meta || ''), el('span', 'fold-plus', '+'));
    const logo = el('span', 'xp-logo');
    const src = safeUrl(item.image, true);
    if (src) logo.append(image(src, item.title || '公司', 'company-logo'));
    else logo.append(el('span', 'logo-fallback', item.title || '公司'));
    const identity = el('span', 'xp-identity');
    identity.append(el('strong', '', item.title || '公司'), el('span', 'xp-role', item.role || item.text || ''));
    const industry = el('span', 'xp-industry', item.industry || '');
    summary.append(top, logo, identity, industry);
    const detail = el('div', 'xp-detail');
    if (item.details) detail.append(paragraphs(item.details));
    if (item.metrics?.length) detail.append(metricList(item.metrics));
    const proofs = proofLinks(item); if (proofs) detail.append(proofs);
    card.append(summary, detail); return card;
  }
  function socialCard(item) {
    const card = el('article', 'social-account');
    const url = safeUrl(item.url) || uniqueLinks(item)[0]?.url;
    const head = url ? link(url, '', 'social-account-link') : el('div', 'social-account-link');
    const platform = /xiaohongshu/i.test(url || '') ? '小红书' : 'TikTok';
    const platformRow = el('span', 'social-platform');
    platformRow.append(el('span', '', platform), el('span', '', '↗'));
    head.append(platformRow, el('strong', '', item.title), el('span', 'social-meta', item.meta || item.text || ''));
    card.append(head);
    if (item.details) {
      const fold = el('details', 'social-note'); fold.append(el('summary', '', '运营内容 +'), paragraphs(item.details)); card.append(fold);
    }
    return card;
  }
  function branch(item, index) {
    const fold = el('details', 'capability-branch');
    const summary = el('summary');
    const copy = el('span', 'branch-summary-copy');
    if (item.meta) copy.append(el('span', 'branch-meta', item.meta));
    copy.append(el('strong', '', item.title || '案例'));
    summary.append(el('span', 'branch-index', String(index + 1).padStart(2, '0')), copy, el('span', 'fold-plus', '+'));
    const body = el('div', 'branch-body');
    if (item.text) body.append(el('p', 'branch-intro', item.text));
    if (item.metrics?.length) body.append(metricList(item.metrics));
    if (item.details) body.append(paragraphs(item.details));
    if (item.steps?.length) {
      const steps = el('ol', 'branch-steps');
      item.steps.slice(0, 12).forEach(step => steps.append(el('li', '', step))); body.append(steps);
    }
    const src = safeUrl(item.image, true); if (src) body.append(image(src, item.title, 'case-cover'));
    const proofs = proofLinks(item); if (proofs) body.append(proofs);
    fold.append(summary, body); return fold;
  }
  function capability(section) {
    const root = el('details', 'capability-root'); root.id = section.id;
    const summary = el('summary', 'capability-summary');
    const titleRow = el('span', 'capability-title-row');
    titleRow.append(el('h3', '', section.title || '能力'), el('span', 'capability-arrow', '↗'));
    summary.append(titleRow);
    if (section.subtitle) summary.append(el('span', 'capability-deck', section.subtitle));
    const preview = el('span', 'capability-preview'); preview.setAttribute('aria-hidden', 'true');
    (section.items || []).slice(0, 6).forEach(item => {
      const chip = el('span', 'branch-preview');
      chip.append(el('b', '', item.title));
      if (item.text) chip.append(el('small', '', item.text));
      preview.append(chip);
    });
    summary.append(preview);
    const panel = el('div', 'capability-expanded');
    const isSocial = section.id === 'social' || /社媒/.test(section.title || '');
    if (isSocial) panel.classList.add('social-account-grid');
    (section.items || []).forEach((item, i) => panel.append(isSocial ? socialCard(item) : branch(item, i)));
    root.append(summary, panel);
    // The first click opens the case summaries; proof links remain a deeper fold.
    root.addEventListener('toggle', event => {
      if (event.target !== root || !root.open || root.dataset.visited) return;
      root.dataset.visited = 'true';
      panel.querySelectorAll(':scope > .capability-branch').forEach(item => { item.open = true; });
    });
    return root;
  }
  function workflow(item, index) {
    const card = el('details', 'ai-workbench');
    const summary = el('summary');
    const top = el('span', 'workbench-top');
    top.append(el('span', '', `WORKBENCH / ${String(index + 1).padStart(2, '0')}`), el('span', 'fold-plus', '+'));
    summary.append(top, el('h3', '', item.title));
    if (item.text) summary.append(el('span', 'workbench-text', item.text));
    if (item.meta) summary.append(el('span', 'workbench-result', item.meta));
    const body = el('div', 'workbench-body');
    if (item.steps?.length) {
      const steps = el('ol', 'workbench-steps'); item.steps.forEach(step => steps.append(el('li', '', step))); body.append(steps);
    }
    if (item.details) body.append(paragraphs(item.details));
    if (item.metrics?.length) body.append(metricList(item.metrics));
    const proofs = proofLinks(item, true); if (proofs) body.append(proofs);
    card.append(summary, body); return card;
  }
  function portfolioPiece(item, index, sectionId) {
    const card = el('details', 'portfolio-piece');
    const summary = el('summary', 'piece-summary');
    const cover = el('span', 'piece-cover');
    const src = safeUrl(item.image, true);
    if (src) cover.append(image(src, item.title || '作品封面', 'piece-image'));
    else {
      const placeholder = el('span', 'piece-placeholder');
      placeholder.append(el('span', '', String(index + 1).padStart(2, '0')), el('small', '', textFor('封面待补充', 'Add a cover')));
      cover.append(placeholder);
    }
    const copy = el('span', 'piece-copy');
    if (item.meta) copy.append(el('span', 'piece-meta', item.meta));
    copy.append(el('h4', '', item.title || textFor('新作品', 'New work')));
    if (item.text) copy.append(el('span', 'piece-description', item.text));
    const highlight = item.metrics?.find(metric => metric.value);
    if (highlight) copy.append(el('span', 'piece-highlight', `${highlight.value} · ${highlight.label || '项目成果'}`));
    const action = el('span', 'piece-action', textFor('查看案例 +', 'View case +')); copy.append(action);
    summary.append(cover, copy);
    const body = el('div', 'piece-body');
    if (item.details) body.append(paragraphs(item.details));
    if (item.metrics?.length) body.append(metricList(item.metrics));
    if (item.steps?.length) {
      const steps = el('ol', 'branch-steps'); item.steps.forEach(step => steps.append(el('li', '', step))); body.append(steps);
    }
    const proofs = uniqueLinks(item);
    const links = el('div', 'proof-links');
    const groupedLinks = new Map();
    const groupTitles = {
      '云台原创': textFor('云台 · 原创模板', 'Gimbal · Original templates'),
      '百万播放': textFor('云台 · 百万播放案例', 'Gimbal · Million-view videos'),
      'Mic': textFor('Mic · 达人合作', 'Mic · Creator collaboration')
    };
    proofs.forEach(proof => {
      const separator = proof.label.indexOf('｜');
      const group = separator >= 0 ? proof.label.slice(0, separator) : '';
      if (!Object.hasOwn(groupTitles, group)) { links.append(link(proof.url, `${proof.label} ↗`, 'proof-link')); return; }
      if (!groupedLinks.has(group)) {
        const fold = el('details', 'case-proof-group');
        const summary = el('summary'); summary.append(el('span', '', groupTitles[group]), el('span', 'fold-plus', '+'));
        const list = el('div', 'proof-links'); fold.append(summary, list); links.append(fold); groupedLinks.set(group, list);
      }
      groupedLinks.get(group).append(link(proof.url, `${proof.label.slice(separator + 1)} ↗`, 'proof-link'));
    });
    if (!proofs.length) links.append(link(`editor.html?page=capability&section=${encodeURIComponent(sectionId)}`, textFor('补充作品链接 ↗', 'Add work links ↗'), 'proof-link'));
    body.append(links); card.append(summary, body);
    card.addEventListener('toggle', () => { action.textContent = card.open ? textFor('收起案例 −', 'Close case −') : textFor('查看案例 +', 'View case +'); });
    return card;
  }
  function portfolioSection(section, index = 0) {
    const block = el('section', 'work-category'); block.dataset.sectionId = section.id; block.id = section.id;
    const heading = el('header', 'work-category-heading');
    heading.append(el('span', 'portfolio-kicker', String(index + 1).padStart(2, '0')), el('h3', '', section.title || textFor('能力', 'Capabilities')));
    if (section.subtitle) heading.append(el('p', '', section.subtitle));
    const cards = el('div', 'work-cards');
    (section.items || []).forEach((item, i) => cards.append(portfolioPiece(item, i, section.id)));
    if (!(section.items || []).length) cards.append(link(`editor.html?page=capability&section=${encodeURIComponent(section.id)}`, textFor('添加第一件作品 ↗', 'Add your first work ↗'), 'section-edit-link'));
    block.append(heading, cards); return block;
  }
  function educationSection(section) {
    const group = el('div', 'education-list');
    (section.items || []).forEach((item, index) => {
      const card = el('article', 'education-card');
      const top = el('div', 'education-topline');
      top.append(el('span', 'education-mark', String(index + 1).padStart(2, '0')), el('span', '', 'EDUCATION'));
      const copy = el('div', 'education-copy');
      copy.append(el('h3', '', item.title || textFor('学校名称', 'University')));
      if (item.meta) copy.append(el('p', 'education-meta', item.meta));
      if (item.text) copy.append(paragraphs(item.text));
      if (item.details) copy.append(paragraphs(item.details, 'portfolio-copy education-detail'));
      if (item.metrics?.length) copy.append(metricList(item.metrics));
      const proofs = uniqueLinks(item);
      proofs.forEach(proof => copy.append(link(proof.url, `${proof.label} ↗`, 'section-edit-link')));
      card.append(top, copy); group.append(card);
    }); return group;
  }
  function lifeSection(section) {
    const group = el('div', section.kind === 'photo' ? 'life-gallery' : 'life-notes');
    (section.items || []).forEach((item, index) => {
      if (section.kind === 'photo') {
        const figure = el('figure', 'life-photo');
        const src = safeUrl(item.image, true);
        const frame = el('div', 'life-photo-image');
        if (src) frame.append(image(src, item.title || '生活照片', 'life-image'));
        else {
          const placeholder = link(`editor.html?page=life&section=${encodeURIComponent(section.id)}`, '', 'life-photo-placeholder');
          placeholder.append(el('span', '', '+'), el('small', '', textFor('放一张生活照片', 'Add a photo'))); frame.append(placeholder);
        }
        figure.append(frame, el('figcaption', '', item.title || `MOMENT ${String(index + 1).padStart(2, '0')}`));
        if (item.text) figure.append(el('p', 'life-photo-note', item.text));
        group.append(figure);
      } else {
        const note = el('article', 'life-note');
        note.append(el('h3', '', item.title || textFor('写一点关于自己', 'A little about me')));
        if (item.meta) note.append(el('p', 'piece-meta', item.meta));
        if (item.text || item.details) note.append(paragraphs([item.text, item.details].filter(Boolean).join('\n\n')));
        else note.append(link(`editor.html?page=life&section=${encodeURIComponent(section.id)}`, textFor('写点什么 ↗', 'Write something ↗'), 'section-edit-link'));
        uniqueLinks(item).forEach(proof => note.append(link(proof.url, `${proof.label} ↗`, 'section-edit-link')));
        group.append(note);
      }
    }); return group;
  }
  function contacts(section, site = {}) {
    const group = el('div', 'portfolio-contact-links');
    const feedback = el('span', 'contact-feedback'); feedback.hidden = true;
    feedback.setAttribute('role', 'status'); feedback.setAttribute('aria-live', 'polite');
    let feedbackTimer;
    ['phone', 'email', 'wechat'].forEach(key => {
      const item = (section.items || []).find(x => x.id === key);
      const value = Object.hasOwn(site, key) ? String(site[key] ?? '').trim() : String(item?.text || '').trim();
      if (!value) return;
      const label = key === 'phone' ? textFor(`拨打电话 ${value}`, `Call ${value}`) : key === 'email' ? textFor(`发送邮件 ${value}`, `Email ${value}`) : textFor(`复制微信号 ${value}`, `Copy WeChat ID ${value}`);
      const url = key === 'phone' ? safeUrl(`tel:${value.replace(/[\s-]/g, '')}`) : key === 'email' ? safeUrl(`mailto:${value}`) : '';
      if (key !== 'wechat' && !url) return;
      const node = key === 'wechat' ? el('button', `portfolio-contact-icon contact-${key}`) : link(url, '', `portfolio-contact-icon contact-${key}`);
      node.setAttribute('aria-label', label);
      const wrap = el('span', `contact-icon-wrap contact-wrap-${key}`);
      const tooltip = el('span', 'contact-tooltip'); tooltip.id = `contact-tooltip-${key}`; tooltip.setAttribute('role', 'tooltip');
      tooltip.append(el('span', 'contact-tooltip-label', key === 'phone' ? textFor('电话', 'Phone') : key === 'email' ? textFor('邮箱', 'Email') : textFor('微信', 'WeChat')), el('span', 'contact-tooltip-value', value));
      node.setAttribute('aria-describedby', tooltip.id);
      const icon = el('img'); icon.src = `assets/ui/${key === 'phone' ? 'phone' : key === 'email' ? 'email' : 'wechat'}.svg`;
      icon.alt = ''; icon.width = 25; icon.height = 25; node.append(icon);
      if (key === 'wechat') {
        node.type = 'button';
        node.addEventListener('click', async () => {
          clearTimeout(feedbackTimer);
          try { await navigator.clipboard.writeText(value); feedback.textContent = textFor('微信号已复制', 'WeChat ID copied'); }
          catch { feedback.textContent = textFor(`微信：${value}`, `WeChat: ${value}`); }
          feedback.hidden = false; feedbackTimer = setTimeout(() => { feedback.hidden = true; }, 3500);
        });
      }
      wrap.append(node, tooltip); group.append(wrap);
    }); group.append(feedback); return group;
  }
  function contactScene(page, site = {}, options = {}) {
    const scene = el('div', 'contact-scene');
    const bar = el('div', 'contact-topbar');
    const links = page.sections?.find(s => s.kind === 'links') || { items: [] };
    const back = link(options.onHome ? '#home' : '#top', textFor('回到顶部 ↗', 'Back to top ↗'), 'contact-back');
    if (options.onHome) back.addEventListener('click', event => { event.preventDefault(); options.onHome(); });
    bar.append(contacts(links, site), back);
    const message = el('div', 'contact-message');
    message.append(el('h2', '', page.title || textFor('一起做点\n值得被记住的事。', 'Let’s make\nsomething memorable.')));
    const footer = el('footer', 'contact-signature');
    const edit = link('editor.html?page=contact', textFor('编辑 ↗', 'Edit ↗'), 'contact-edit');
    if (options.onEdit) edit.addEventListener('click', event => { event.preventDefault(); options.onEdit(); });
    const education = link('#education', `${textFor('硕士', 'Master’s')} · ${options.educationName || '西南财经大学'} ↗`, 'education-contact-hint');
    if (options.onEducation) education.addEventListener('click', event => { event.preventDefault(); options.onEducation(); });
    footer.append(el('span', '', `${site.name || 'Elva'} / ${textFor('个人网站', 'Personal website')}`), education, edit, el('span', '', `© ${new Date().getFullYear()}`));
    scene.append(bar, message, footer); return scene;
  }
  window.PortfolioUI = { companyCard, capability, workflow, portfolioSection, educationSection, lifeSection, contacts, contactScene, safeUrl };
})();

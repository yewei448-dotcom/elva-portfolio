(() => {
  'use strict';
  const STORAGE_KEY = 'yewei.visualDraft.v1';
  const BACKUP_STORAGE_KEY = 'yewei.visualDraft.beforeCapabilities.v1';
  const KINDS = { text: '文字介绍', photo: '照片相册', links: '账号与链接', companies: '公司经历', videos: '视频作品', workflow: 'AI 工作流', capability: '能力与证明' };
  const PAGE_LABELS = { home: '首页', experience: 'Experience', capability: 'Capability', ai: 'AI应用', contact: '联系方式', building: '作品', life: '生活' };
  const MAX_JSON_BYTES = 24 * 1024 * 1024;
  const $ = selector => document.querySelector(selector);
  const els = {
    sidebar: $('#editor-sidebar'), tabs: $('#page-tabs'), settings: $('#page-settings'),
    sectionList: $('#section-list'), sectionEditor: $('#section-editor'), add: $('#add-section'),
    status: $('#save-status'), iframe: $('#draft-preview'), label: $('#preview-page-label'),
    input: $('#draft-import'), toast: $('#editor-toast')
  };
  const clone = value => JSON.parse(JSON.stringify(value));
  let draft;
  const editorParams = new URLSearchParams(location.search);
  let pageId = editorParams.get('page') || 'experience';
  let selectedSectionId = editorParams.get('section') || '';
  let saveTimer, previewTimer, toastTimer;
  let dirty = false;
  let savingFailed = false;
  let importWarning = '';
  let fieldCounter = 0;
  let addPickerOpen = false;
  let pendingImageJobs = 0;
  let legacyBackupRaw = null;

  function node(tag, className, text) {
    const value = document.createElement(tag);
    if (className) value.className = className;
    if (text !== undefined) value.textContent = text;
    return value;
  }
  function button(text, className, action, ariaLabel) {
    const value = node('button', className, text);
    value.type = 'button';
    if (ariaLabel) value.setAttribute('aria-label', ariaLabel);
    value.addEventListener('click', action);
    return value;
  }
  function id(prefix) {
    return `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`}`;
  }
  function showToast(message, long = false) {
    clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.add('visible');
    toastTimer = setTimeout(() => els.toast.classList.remove('visible'), long ? 7000 : 3500);
  }
  function setStatus(message, state = '') {
    els.status.textContent = message;
    els.status.dataset.state = state;
    els.status.title = message;
  }
  function currentPage() { return draft.pages.find(page => page.id === pageId) || draft.pages[0]; }
  function currentSection() { return currentPage().sections.find(section => section.id === selectedSectionId); }
  function selectInitialSection() {
    const page = currentPage();
    pageId = page.id;
    if (!page.sections.some(section => section.id === selectedSectionId)) selectedSectionId = page.sections[0]?.id || '';
  }

  function safeUrl(value, image = false) {
    if (typeof value !== 'string') return false;
    const input = value.trim();
    if (!input) return true;
    if (/[\u0000-\u001f\u007f]/.test(input)) return false;
    if (image && /^data:image\/(?:png|jpe?g|webp|gif|avif);base64,[a-z\d+/=\s]+$/i.test(input)) return true;
    if (/^(?:javascript|vbscript|data|file|blob):/i.test(input)) return false;
    if (image && /^assets\//i.test(input)) {
      try { const path = decodeURIComponent(input); return !path.includes('..') && !/[<>\\]/.test(path); }
      catch { return false; }
    }
    if (!image && /^assets\//i.test(input)) {
      try { const path = decodeURIComponent(input); return /\.pdf$/i.test(path) && !path.includes('..') && !/[<>\\?#]/.test(path); }
      catch { return false; }
    }
    if (!image && /^(?:mailto|tel):/i.test(input)) return /^(?:mailto|tel):[^\s]+$/i.test(input);
    const allowed = /^https?:\/\//i;
    if (!allowed.test(input)) return false;
    try { const url = new URL(input); return (image ? ['http:', 'https:'] : ['http:', 'https:', 'mailto:', 'tel:']).includes(url.protocol); }
    catch { return false; }
  }
  function requireString(value, label, max = 20000) {
    if (value === undefined || value === null) return '';
    if (typeof value !== 'string' || value.length > max) throw new Error(`${label}格式不正确或文字过长。`);
    return value;
  }
  function validId(value, label) {
    if (typeof value !== 'string' || !value.trim() || value.length > 150 || /[\u0000-\u001f]/.test(value)) throw new Error(`${label}缺少有效标识。`);
    return value;
  }
  function normalizeDraft(value) {
    if (typeof window.migrateWebsiteDraftPhotos === 'function') value = window.migrateWebsiteDraftPhotos(value);
    if (!value || typeof value !== 'object' || Array.isArray(value) || value.schemaVersion !== 1 || !value.site || typeof value.site !== 'object' || Array.isArray(value.site)) throw new Error('这不是受支持的网站编辑稿（需要 schemaVersion: 1）。');
    if (!Array.isArray(value.pages) || value.pages.length < 1 || value.pages.length > 12) throw new Error('编辑稿需要包含 1–12 个页面。');
    const normalized = { schemaVersion: 1, site: {}, pages: [] };
    if (value.structureVersion !== undefined) {
      if (![1, 2].includes(value.structureVersion)) throw new Error('编辑稿的页面结构版本暂不支持。');
      normalized.structureVersion = value.structureVersion;
    }
    for (const key of ['name', 'tagline', 'phone', 'email', 'wechat']) normalized.site[key] = requireString(value.site[key], '网站基本信息', key === 'tagline' ? 2000 : 500);
    let sectionCount = 0, itemCount = 0;
    const pageIds = new Set();
    for (const page of value.pages) {
      if (!page || typeof page !== 'object' || Array.isArray(page)) throw new Error('页面格式不正确。');
      const pid = validId(page.id, '页面');
      if (pageIds.has(pid)) throw new Error('页面标识重复，请检查编辑稿。');
      pageIds.add(pid);
      if (!Array.isArray(page.sections)) throw new Error('页面缺少板块列表。');
      sectionCount += page.sections.length;
      if (sectionCount > 100) throw new Error('编辑稿最多支持 100 个板块。');
      const bg = page.background || {};
      const color = typeof bg.color === 'string' && /^#[\da-f]{6}$/i.test(bg.color) ? bg.color : '#faf8ef';
      const bgImage = requireString(bg.image, '背景图片', 12 * 1024 * 1024);
      if (!safeUrl(bgImage, true)) throw new Error('背景图片包含不支持的地址。请使用图片文件、http 或 https 地址。');
      const np = {
        id: pid, name: requireString(page.name, '页面名称', 200), title: requireString(page.title, '页面标题', 2000),
        subtitle: requireString(page.subtitle, '页面副标题', 5000),
        background: { color, image: bgImage, overlay: Number.isFinite(Number(bg.overlay)) ? Math.min(0.85, Math.max(0, Number(bg.overlay))) : 0.2 }, sections: []
      };
      if (pid === 'home' || Object.prototype.hasOwnProperty.call(page, 'portraitImage')) {
        const portraitImage = requireString(page.portraitImage, '悬挂照片', 12 * 1024 * 1024);
        if (!safeUrl(portraitImage, true)) throw new Error('悬挂照片包含不支持的图片地址。');
        np.portraitImage = portraitImage;
      }
      const sectionIds = new Set();
      for (const section of page.sections) {
        if (!section || typeof section !== 'object' || Array.isArray(section) || !Object.hasOwn(KINDS, section.kind) || !Array.isArray(section.items)) throw new Error('板块类型或内容格式不正确。');
        const sid = validId(section.id, '板块');
        if (sectionIds.has(sid)) throw new Error('同一页面的板块标识重复。');
        sectionIds.add(sid);
        itemCount += section.items.length;
        if (itemCount > 500) throw new Error('编辑稿最多支持 500 个内容条目。');
        const ns = { id: sid, kind: section.kind, title: requireString(section.title, '板块标题', 1000), subtitle: requireString(section.subtitle, '板块说明', 5000), items: [] };
        const itemIds = new Set();
        for (const item of section.items) {
          if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('内容条目格式不正确。');
          const iid = validId(item.id, '内容条目');
          if (itemIds.has(iid)) throw new Error('同一板块的内容条目标识重复。');
          itemIds.add(iid);
          const ni = { id: iid };
          for (const key of ['title', 'text', 'url', 'image', 'meta', 'details', 'role', 'industry', 'period']) ni[key] = requireString(item[key], '条目内容', key === 'image' ? 12 * 1024 * 1024 : key === 'details' ? 40000 : 20000);
          if (!safeUrl(ni.url)) throw new Error('条目链接含不安全的地址，请使用 http、https、mailto 或 tel 链接。');
          if (!safeUrl(ni.image, true)) throw new Error('条目图片包含不支持的地址。');
          if (item.links !== undefined && (!Array.isArray(item.links) || item.links.length > 30)) throw new Error('每个条目最多支持 30 个关联链接。');
          ni.links = (item.links || []).map(link => {
            if (!link || typeof link !== 'object' || Array.isArray(link)) throw new Error('关联链接格式不正确。');
            const label = requireString(link.label, '链接文字', 1000);
            const url = requireString(link.url, '链接地址', 20000).trim();
            if (!safeUrl(url)) throw new Error('关联链接含不安全的地址，请使用 http、https、mailto 或 tel 链接。');
            return { label, url };
          });
          if (item.steps !== undefined && (!Array.isArray(item.steps) || item.steps.length > 100)) throw new Error('流程步骤格式不正确。');
          ni.steps = (item.steps || []).map(step => requireString(step, '流程步骤', 2000));
          if (item.metrics !== undefined) {
            if (!Array.isArray(item.metrics) || item.metrics.length > 30) throw new Error('成果指标格式不正确。');
            ni.metrics = item.metrics.map(metric => {
              if (!metric || typeof metric !== 'object') throw new Error('成果指标格式不正确。');
              return { value: requireString(metric.value, '指标数值', 300), label: requireString(metric.label, '指标说明', 1000) };
            });
          }
          ns.items.push(ni);
        }
        np.sections.push(ns);
      }
      normalized.pages.push(np);
    }
    return normalized;
  }

  function pushPreview() {
    clearTimeout(previewTimer);
    if (!els.iframe.contentWindow) return;
    els.iframe.contentWindow.postMessage({ type: 'yewei-draft:update', draft, pageId }, location.origin);
  }
  function schedulePreview() { clearTimeout(previewTimer); previewTimer = setTimeout(pushPreview, 120); }
  function backupLegacyDraft(raw, value) {
    if (!raw || value?.structureVersion === 2) return;
    legacyBackupRaw = raw;
    try {
      if (localStorage.getItem(BACKUP_STORAGE_KEY) === null) localStorage.setItem(BACKUP_STORAGE_KEY, raw);
      legacyBackupRaw = null;
    } catch {
      importWarning = '旧编辑稿已在当前页面保留，但本机空间不足，原稿备份暂未完成。请先导出当前编辑稿；备份完成前不会覆盖旧暂存。';
    }
  }
  function persistDraft() {
    clearTimeout(saveTimer);
    try {
      if (legacyBackupRaw !== null) {
        if (localStorage.getItem(BACKUP_STORAGE_KEY) === null) localStorage.setItem(BACKUP_STORAGE_KEY, legacyBackupRaw);
        legacyBackupRaw = null;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      dirty = false; savingFailed = false;
      setStatus('已暂存到本机', 'saved');
    } catch {
      dirty = true;
      const firstFailure = !savingFailed;
      savingFailed = true;
      setStatus('本机暂存失败，请导出保存', 'warning');
      if (firstFailure) showToast('浏览器存储空间不足或不可用。修改仍在当前页面，请先导出编辑稿，避免关闭后丢失。', true);
    }
  }
  function changed(options = {}) {
    dirty = true;
    setStatus('正在暂存…', 'saving');
    clearTimeout(saveTimer); saveTimer = setTimeout(persistDraft, 400);
    schedulePreview();
    if (options.render) render();
    if (options.message) showToast(options.message);
  }

  function field(label, value, onChange, options = {}) {
    const wrapper = node('div', `editor-field${options.wide ? ' field-wide' : ''}`);
    const inputId = `draft-field-${++fieldCounter}`;
    const labelNode = node('label', '', label); labelNode.htmlFor = inputId;
    const input = node(options.multiline ? 'textarea' : options.select ? 'select' : 'input', 'editor-input');
    input.id = inputId;
    if (options.select) {
      Object.entries(options.select).forEach(([key, text]) => {
        const option = node('option', '', text); option.value = key; input.append(option);
      });
    } else if (!options.multiline) input.type = options.type || 'text';
    input.value = value ?? '';
    if (options.multiline) { input.rows = options.rows || 3; input.spellcheck = false; }
    if (options.placeholder) input.placeholder = options.placeholder;
    if (options.maxLength) input.maxLength = options.maxLength;
    const hint = options.hint ? node('small', 'field-hint', options.hint) : null;
    const error = node('small', 'field-error'); error.hidden = true;
    input.addEventListener(options.select || options.commit ? 'change' : 'input', () => {
      const next = input.value;
      if (options.url && !safeUrl(next, options.url === 'image')) {
        input.setAttribute('aria-invalid', 'true'); error.hidden = false;
        error.textContent = options.url === 'image' ? '请使用有效的图片地址。' : '请使用 http、https、邮箱或电话链接。';
        return;
      }
      input.removeAttribute('aria-invalid'); error.hidden = true;
      onChange(next, input);
    });
    wrapper.append(labelNode, input);
    if (hint) wrapper.append(hint);
    wrapper.append(error);
    return wrapper;
  }
  function group(title, subtitle, open = false) {
    const details = node('details', 'settings-group'); details.open = open;
    const summary = node('summary');
    const summaryCopy = node('span'); summaryCopy.append(node('strong', '', title));
    if (subtitle) summaryCopy.append(node('small', '', subtitle));
    summary.append(summaryCopy, node('span', 'settings-chevron', '⌄'));
    const body = node('div', 'settings-group-body'); details.append(summary, body);
    return { details, body };
  }
  async function readImage(file) {
    if (!file) throw new Error('没有选择图片。');
    if (file.size > 25 * 1024 * 1024) throw new Error('请选 25 MB 以内的照片。');
    if (!/^image\/(?:jpeg|png|webp|gif|avif)$/i.test(file.type)) throw new Error('请使用 JPG、PNG、WebP、GIF 或 AVIF 图片。');
    let bitmap, objectUrl;
    try {
      if (typeof createImageBitmap === 'function') {
        try { bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch {}
      }
      if (!bitmap) {
        objectUrl = URL.createObjectURL(file);
        bitmap = await new Promise((resolve, reject) => {
          const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('这张图片无法读取，请换一张试试。')); image.src = objectUrl;
        });
      }
      const ratio = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
      canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('浏览器无法处理图片。');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', .82);
    } finally { if (objectUrl) URL.revokeObjectURL(objectUrl); bitmap?.close?.(); }
  }
  function imageControl(value, onChange, options = {}) {
    const wrapper = node('div', 'image-control');
    if (value) {
      const preview = node('div', 'image-control-preview');
      const image = node('img'); image.src = value; image.alt = options.background ? '当前页面背景' : options.portrait ? '当前悬挂照片' : '当前条目图片';
      image.addEventListener('error', () => { preview.classList.add('image-error'); image.hidden = true; preview.append(node('span', '', '图片暂时无法显示')); }, { once: true });
      preview.append(image); wrapper.append(preview);
    }
    const actions = node('div', 'image-actions');
    const input = node('input'); input.type = 'file'; input.accept = 'image/jpeg,image/png,image/webp,image/gif,image/avif'; input.hidden = true;
    const uploadButton = button(value ? '替换图片' : '上传图片', 'button-secondary', () => input.click());
    input.addEventListener('change', async () => {
      const file = input.files?.[0]; if (!file) return;
      pendingImageJobs += 1; uploadButton.disabled = true; uploadButton.textContent = '正在处理…';
      try { const image = await readImage(file); onChange(image); showToast('图片已加入，预览已更新。'); }
      catch (error) { showToast(error.message || '图片处理失败，请重试。', true); }
      finally { pendingImageJobs -= 1; input.value = ''; uploadButton.disabled = false; uploadButton.textContent = value ? '替换图片' : '上传图片'; }
    });
    actions.append(uploadButton);
    if (value) actions.append(button('移除图片', 'button-quiet danger-text', () => onChange('')));
    wrapper.append(actions, input);
    wrapper.append(node('small', 'field-hint', '照片会压缩后存入编辑稿；建议每张 25 MB 以内。'));
    const urlGroup = group('使用图片地址', '', false);
    urlGroup.details.classList.add('image-url-group');
    urlGroup.body.append(field('图片链接 / 资源路径', value?.startsWith('data:') ? '' : value, next => onChange(next), { url: 'image', commit: true, placeholder: 'https://… 或 assets/photo.jpg', hint: value?.startsWith('data:') ? '当前使用的是已上传的照片；填写地址会替换它。' : '' }));
    wrapper.append(urlGroup.details);
    return wrapper;
  }
  function syncListTitle(sectionId, title) {
    const rows = els.sectionList.querySelectorAll('[data-section-id]');
    rows.forEach(row => { if (row.dataset.sectionId === sectionId) row.querySelector('.section-name').textContent = title || '未命名板块'; });
  }

  function renderTabs() {
    els.tabs.replaceChildren();
    draft.pages.forEach(page => {
      const tab = button(PAGE_LABELS[page.id] || page.name || '页面', 'page-tab', () => selectPage(page.id));
      tab.dataset.pageId = page.id; tab.setAttribute('aria-pressed', String(page.id === pageId));
      if (page.id === pageId) tab.classList.add('selected');
      els.tabs.append(tab);
    });
  }
  function matchesContactEmail(url, previousValues) {
    if (typeof url !== 'string' || !/^mailto:/i.test(url)) return false;
    try {
      const address = decodeURIComponent(url.slice(7).split('?')[0]).trim().toLowerCase();
      return previousValues.some(value => String(value || '').trim().toLowerCase() === address);
    } catch { return false; }
  }
  function phoneDialValue(value) {
    return String(value || '').replace(/[\s-]/g, '');
  }
  function matchesContactPhone(url, previousValues) {
    if (typeof url !== 'string' || !/^tel:/i.test(url)) return false;
    try {
      const number = phoneDialValue(decodeURIComponent(url.slice(4)));
      return previousValues.some(value => phoneDialValue(value) === number);
    } catch { return false; }
  }
  function syncContactValue(key, value, sourceInput) {
    if (!['phone', 'email', 'wechat'].includes(key)) return;
    const oldSiteValue = draft.site[key] || '';
    const contacts = draft.pages.filter(page => page.id === 'contact').flatMap(page => page.sections || []).flatMap(section => section.items || []).filter(item => item.id === key);
    draft.site[key] = value;
    contacts.forEach(item => {
      const oldText = item.text || '';
      const previousValues = [oldSiteValue, oldText];
      item.text = value;
      if (key === 'email') {
        const updateMailto = previous => {
          if (!value.trim()) return '';
          const queryAt = typeof previous === 'string' ? previous.indexOf('?') : -1;
          return `mailto:${value.trim()}${queryAt >= 0 ? previous.slice(queryAt) : ''}`;
        };
        if (!item.url || matchesContactEmail(item.url, previousValues)) item.url = updateMailto(item.url);
        (item.links || []).forEach(link => {
          if (matchesContactEmail(link.url, previousValues)) link.url = updateMailto(link.url);
        });
      } else if (key === 'phone') {
        const number = phoneDialValue(value);
        const url = number ? `tel:${number}` : '';
        if (!item.url || matchesContactPhone(item.url, previousValues)) item.url = url;
        (item.links || []).forEach(link => {
          if (matchesContactPhone(link.url, previousValues)) link.url = url;
        });
      } else if (previousValues.some(previous => item.details === `微信号：${previous}` || item.details === `微信号: ${previous}`)) {
        item.details = value ? `微信号：${value}` : '';
      }
    });
    document.querySelectorAll(`[data-contact-field="${key}"]`).forEach(input => { if (input !== sourceInput) input.value = value; });
    if (key === 'email' || key === 'phone') {
      const item = contacts[0];
      if (item) {
        document.querySelectorAll(`[data-contact-url="${key}"]`).forEach(input => { input.value = item.url || ''; });
        document.querySelectorAll(`[data-contact-proof="${key}"]`).forEach(input => { input.value = item.links?.[Number(input.dataset.linkIndex)]?.url || ''; });
      }
    }
  }
  function renderPageSettings() {
    const page = currentPage();
    els.settings.replaceChildren();
    const pageGroup = group('页面标题', page.name || PAGE_LABELS[page.id], false);
    pageGroup.body.append(
      field('导航名称', page.name, value => { page.name = value; changed(); els.label.textContent = `${value || '当前页面'} · 实时预览`; }),
      field('主标题', page.title, value => { page.title = value; changed(); }, { multiline: true, rows: 2, hint: '可以换行，预览会保留换行。' }),
      field('副标题', page.subtitle, value => { page.subtitle = value; changed(); }, { multiline: true, rows: 2 })
    );
    const background = group('页面背景', page.background.image ? '照片背景 · 可替换' : '纯色背景', true);
    const colorRow = node('div', 'background-color-row');
    const colorLabel = node('label', '', '背景颜色');
    const colorInput = node('input', 'color-input'); colorInput.type = 'color'; colorInput.value = page.background.color; colorInput.id = `background-color-${page.id}`; colorLabel.htmlFor = colorInput.id;
    const colorText = node('span', 'color-value', page.background.color.toUpperCase());
    colorInput.addEventListener('input', () => { page.background.color = colorInput.value; colorText.textContent = colorInput.value.toUpperCase(); changed(); });
    colorRow.append(colorLabel, colorText, colorInput);
    background.body.append(colorRow);
    background.body.append(imageControl(page.background.image, value => {
      const target = draft.pages.find(p => p.id === page.id); if (!target) return;
      target.background.image = value; changed({ render: true });
    }, { background: true }));
    const overlay = node('div', 'editor-field overlay-field');
    const overlayLabel = node('label'); overlayLabel.htmlFor = `background-overlay-${page.id}`;
    const overlayValue = node('span', 'range-value', `${Math.round(page.background.overlay * 100)}%`);
    overlayLabel.append(node('span', '', '照片压暗'), overlayValue);
    const range = node('input', 'overlay-range'); range.id = overlayLabel.htmlFor; range.type = 'range'; range.min = 0; range.max = 85; range.step = 1; range.value = Math.round(page.background.overlay * 100);
    range.addEventListener('input', () => { page.background.overlay = Number(range.value) / 100; overlayValue.textContent = `${range.value}%`; changed(); });
    overlay.append(overlayLabel, range, node('small', 'field-hint', '有背景照片时使用，让标题更清楚。'));
    background.body.append(overlay);
    const siteGroup = group('网站基本信息', '姓名、简介与联系方式', false);
    [['name', '姓名'], ['tagline', '个人简介'], ['phone', '电话号码'], ['email', '联系邮箱'], ['wechat', '微信号']].forEach(([key, label]) => {
      const basicField = field(label, draft.site[key], (value, input) => {
        if (['phone', 'email', 'wechat'].includes(key)) syncContactValue(key, value, input);
        else draft.site[key] = value;
        changed();
      }, { multiline: key === 'tagline', rows: 2, type: key === 'phone' ? 'tel' : 'text' });
      if (['phone', 'email', 'wechat'].includes(key)) basicField.querySelector('input').dataset.contactField = key;
      siteGroup.body.append(basicField);
    });
    els.settings.append(pageGroup.details, background.details);
    if (page.id === 'home') {
      const portrait = group('悬挂照片', page.portraitImage ? '首页右侧的个人照片' : '已隐藏，可重新上传', true);
      portrait.body.append(imageControl(page.portraitImage || '', value => {
        const target = draft.pages.find(p => p.id === page.id); if (!target) return;
        target.portraitImage = value; changed({ render: true });
      }, { portrait: true }));
      portrait.body.append(node('small', 'field-hint', '仅显示在首页；移除后保留页面背景。'));
      els.settings.append(portrait.details);
    }
    els.settings.append(siteGroup.details);
  }
  function moveSection(sectionId, direction) {
    const sections = currentPage().sections;
    const index = sections.findIndex(section => section.id === sectionId);
    const destination = index + direction;
    if (destination < 0 || destination >= sections.length) return;
    [sections[index], sections[destination]] = [sections[destination], sections[index]];
    changed({ render: true });
  }
  function removeSection(sectionId) {
    const page = currentPage();
    const index = page.sections.findIndex(section => section.id === sectionId);
    if (index < 0) return;
    const section = page.sections[index];
    if (!window.confirm(`删除“${section.title || '未命名板块'}”及其中的 ${section.items.length} 个内容条目？此操作会同步到本机编辑稿。`)) return;
    page.sections.splice(index, 1); selectInitialSection(); changed({ render: true, message: '板块已移除。' });
  }
  function renderSectionList() {
    const page = currentPage();
    els.sectionList.replaceChildren();
    const heading = node('div', 'panel-section-heading');
    heading.append(node('h2', '', '页面板块'), node('span', 'count-badge', String(page.sections.length)));
    els.sectionList.append(heading);
    if (!page.sections.length) els.sectionList.append(node('p', 'panel-empty', '这一页还是空白。添加一个板块，开始整理内容。'));
    page.sections.forEach((section, index) => {
      const row = node('div', `section-list-row${section.id === selectedSectionId ? ' selected' : ''}`); row.dataset.sectionId = section.id;
      const select = button('', 'section-select', () => selectSection(section.id, true));
      select.setAttribute('aria-pressed', String(section.id === selectedSectionId));
      select.append(node('span', 'section-order', String(index + 1).padStart(2, '0')));
      const copy = node('span', 'section-list-copy'); copy.append(node('strong', 'section-name', section.title || '未命名板块'), node('small', '', `${KINDS[section.kind]} · ${section.items.length} 项`));
      select.append(copy);
      const actions = node('div', 'row-actions');
      const up = button('↑', 'icon-button', () => moveSection(section.id, -1), `上移板块 ${section.title || index + 1}`); up.disabled = index === 0;
      const down = button('↓', 'icon-button', () => moveSection(section.id, 1), `下移板块 ${section.title || index + 1}`); down.disabled = index === page.sections.length - 1;
      const remove = button('×', 'icon-button delete-button', () => removeSection(section.id), `删除板块 ${section.title || index + 1}`);
      actions.append(up, down, remove); row.append(select, actions); els.sectionList.append(row);
    });
  }
  function renderAddPicker() {
    const old = $('#section-kind-picker'); old?.remove();
    els.add.setAttribute('aria-expanded', String(addPickerOpen));
    if (!addPickerOpen) return;
    const picker = node('div', 'section-kind-picker'); picker.id = 'section-kind-picker';
    picker.append(node('p', '', '选择一个板块类型'));
    Object.entries(KINDS).forEach(([kind, label]) => picker.append(button(`＋ ${label}`, 'kind-option', () => {
      const page = currentPage();
      if (draft.pages.reduce((sum, p) => sum + p.sections.length, 0) >= 100) { showToast('最多支持 100 个板块。'); return; }
      const section = { id: id(kind), kind, title: label, subtitle: '', items: [] };
      page.sections.push(section); selectedSectionId = section.id; addPickerOpen = false;
      changed({ render: true, message: '板块已添加，可以继续加入内容。' });
      scrollToInspector();
    })));
    els.add.after(picker);
  }
  function addItem() {
    const section = currentSection(); if (!section) return;
    const itemCount = draft.pages.reduce((total, page) => total + page.sections.reduce((sum, block) => sum + block.items.length, 0), 0);
    if (itemCount >= 500) { showToast('编辑稿最多支持 500 个内容条目。'); return; }
    const item = { id: id('item'), title: '', text: '', url: '', image: '', meta: '', details: '', role: '', industry: '', period: '', links: [], steps: [] };
    section.items.push(item); changed(); renderSectionList(); renderSectionEditor(item.id);
    requestAnimationFrame(() => {
      const input = els.sectionEditor.querySelector(`[data-item-id="${item.id}"] input`);
      input?.focus();
    });
  }
  function moveItem(itemId, direction) {
    const section = currentSection(); if (!section) return;
    const index = section.items.findIndex(item => item.id === itemId), destination = index + direction;
    if (destination < 0 || destination >= section.items.length) return;
    [section.items[index], section.items[destination]] = [section.items[destination], section.items[index]];
    changed(); renderSectionList(); renderSectionEditor(itemId);
  }
  function removeItem(itemId) {
    const section = currentSection(); if (!section) return;
    const index = section.items.findIndex(item => item.id === itemId); if (index < 0) return;
    if (!window.confirm(`删除内容“${section.items[index].title || '未命名条目'}”？`)) return;
    section.items.splice(index, 1); changed(); renderSectionList(); renderSectionEditor(); showToast('内容条目已移除。');
  }
  function renderMetrics(item, body) {
    const metricGroup = group('成果指标', '数值与说明', false);
    const metricsList = node('div', 'metrics-editor');
    const redraw = () => {
      metricsList.replaceChildren();
      (item.metrics || []).forEach((metric, index) => {
        const row = node('div', 'metric-editor-row');
        row.append(field(`指标 ${index + 1}`, metric.value, value => { metric.value = value; changed(); }, { placeholder: '如 250+' }), field('指标说明', metric.label, value => { metric.label = value; changed(); }, { placeholder: '合作创作者' }));
        row.append(button('×', 'icon-button delete-button', () => { item.metrics.splice(index, 1); changed(); redraw(); }, `删除指标 ${index + 1}`));
        metricsList.append(row);
      });
    };
    redraw(); metricGroup.body.append(metricsList, button('＋ 添加指标', 'button-quiet', () => {
      item.metrics ||= [];
      if (item.metrics.length >= 30) { showToast('每个条目最多支持 30 个成果指标。'); return; }
      item.metrics.push({ value: '', label: '' }); changed(); redraw();
    }));
    body.append(metricGroup.details);
  }
  function renderLinks(item, body, kind) {
    const linkGroup = group('关联作品与证明链接', '可填写多个链接；留空可保留位置', ['capability', 'workflow', 'links'].includes(kind));
    const list = node('div', 'proof-links-editor');
    const redraw = () => {
      list.replaceChildren();
      if (!(item.links || []).length) list.append(node('p', 'proof-links-empty', '把作品、账号、视频或文档放在这里。'));
      (item.links || []).forEach((link, index) => {
        const row = node('div', 'proof-link-row');
        row.append(node('span', 'proof-link-index', `链接 ${String(index + 1).padStart(2, '0')}`));
        const targetField = field('目标地址', link.url, value => { link.url = value.trim(); changed(); }, { url: true, placeholder: 'https://…', hint: '可以先留空，之后再补链接。' });
        if (currentPage().id === 'contact' && ['phone', 'email'].includes(item.id)) {
          const input = targetField.querySelector('input'); input.dataset.contactProof = item.id; input.dataset.linkIndex = String(index);
        }
        row.append(field('链接文字', link.label, value => { link.label = value; changed(); }, { placeholder: '如：查看视频 / 作品说明' }), targetField);
        row.append(button('×', 'icon-button delete-button proof-link-remove', () => { item.links.splice(index, 1); changed(); redraw(); }, `删除关联链接 ${index + 1}`));
        list.append(row);
      });
    };
    redraw();
    linkGroup.body.append(list, button('＋ 添加关联链接', 'button-quiet add-proof-link', () => {
      item.links ||= [];
      if (item.links.length >= 30) { showToast('每个条目最多支持 30 个关联链接。'); return; }
      item.links.push({ label: '', url: '' }); changed(); redraw();
    }));
    body.append(linkGroup.details);
  }
  function renderSectionEditor(openItemId = '') {
    const editingPageId = currentPage().id;
    const section = currentSection();
    els.sectionEditor.replaceChildren();
    if (!section) {
      els.sectionEditor.append(node('div', 'inspector-empty', '选中一个板块，或在上方添加新板块。'));
      return;
    }
    const title = node('div', 'inspector-heading');
    title.append(node('span', 'inspector-eyebrow', '正在编辑'), node('h2', '', KINDS[section.kind]));
    els.sectionEditor.append(title);
    const sectionFields = node('div', 'section-fields');
    sectionFields.append(
      field('板块标题', section.title, value => { section.title = value; syncListTitle(section.id, value); changed(); }),
      field('板块说明', section.subtitle, value => { section.subtitle = value; changed(); }, { multiline: true, rows: 2 }),
      field('展示类型', section.kind, value => { section.kind = value; changed(); renderSectionList(); renderSectionEditor(); }, { select: KINDS, hint: '切换展示方式会保留已有内容。' })
    );
    els.sectionEditor.append(sectionFields);
    const itemsHeading = node('div', 'panel-section-heading item-heading');
    itemsHeading.append(node('h3', '', '内容条目'), node('span', 'count-badge', String(section.items.length)));
    els.sectionEditor.append(itemsHeading);
    if (!section.items.length) els.sectionEditor.append(node('p', 'panel-empty', '还没有内容。添加文字、照片或链接，让这一块完整起来。'));
    section.items.forEach((item, index) => {
      const details = node('details', 'item-editor'); details.dataset.itemId = item.id;
      details.open = openItemId ? item.id === openItemId : section.items.length === 1;
      const summary = node('summary');
      const summaryCopy = node('span', 'item-summary-copy');
      const summaryTitle = node('strong', '', item.title || `未命名条目 ${index + 1}`);
      summaryCopy.append(node('small', '', `内容 ${String(index + 1).padStart(2, '0')}`), summaryTitle);
      summary.append(summaryCopy, node('span', 'settings-chevron', '⌄'));
      const body = node('div', 'item-editor-body');
      const toolbar = node('div', 'item-toolbar');
      const up = button('↑ 上移', 'button-quiet', () => moveItem(item.id, -1), `上移条目 ${index + 1}`); up.disabled = index === 0;
      const down = button('↓ 下移', 'button-quiet', () => moveItem(item.id, 1), `下移条目 ${index + 1}`); down.disabled = index === section.items.length - 1;
      toolbar.append(up, down, button('删除', 'button-quiet danger-text', () => removeItem(item.id), `删除条目 ${index + 1}`));
      const itemLabel = section.kind === 'companies' ? '公司 / 项目名称' : section.kind === 'photo' ? '照片标题' : '标题';
      body.append(toolbar,
        field(itemLabel, item.title, value => { item.title = value; summaryTitle.textContent = value || `未命名条目 ${index + 1}`; changed(); })
      );
      if (section.kind === 'companies') {
        const companyFields = node('div', 'company-fields');
        companyFields.append(field('职位', item.role, value => { item.role = value; changed(); }, { placeholder: '如：英语 SEO 运营' }),
          field('行业', item.industry, value => { item.industry = value; changed(); }, { placeholder: '如：软件出海' }),
          field('时间', item.period, value => { item.period = value; changed(); }, { placeholder: '如：2026.07 — 至今' }));
        body.append(companyFields);
      }
      const contactKey = editingPageId === 'contact' && ['phone', 'email', 'wechat'].includes(item.id) ? item.id : '';
      const descriptionField = field(contactKey === 'phone' ? '电话号码' : contactKey === 'email' ? '邮箱地址' : contactKey === 'wechat' ? '微信号' : section.kind === 'photo' ? '照片说明' : '简短介绍', item.text, (value, input) => {
        if (contactKey) syncContactValue(contactKey, value, input); else item.text = value;
        changed();
      }, { multiline: !contactKey, rows: 3, type: contactKey === 'phone' ? 'tel' : 'text' });
      if (contactKey) descriptionField.querySelector('input').dataset.contactField = contactKey;
      const urlField = field(section.kind === 'videos' ? '视频链接' : '跳转链接', item.url, value => { item.url = value.trim(); changed(); }, { url: true, placeholder: 'https://…', hint: '留空时不显示外部跳转。' });
      if (contactKey === 'email' || contactKey === 'phone') urlField.querySelector('input').dataset.contactUrl = contactKey;
      body.append(
        field(section.kind === 'companies' ? '补充标签 / 备注' : '标签 / 时间 / 备注', item.meta, value => { item.meta = value; changed(); }, { placeholder: '可选' }),
        descriptionField, urlField
      );
      renderLinks(item, body, section.kind);
      const imageGroup = group(section.kind === 'companies' ? '公司图片 / 标志' : section.kind === 'videos' ? '视频封面' : '照片 / 封面', item.image ? '已加入图片' : '未添加图片', section.kind === 'photo');
      imageGroup.body.append(imageControl(item.image, value => {
        const target = draft.pages.find(p => p.id === editingPageId)?.sections.find(s => s.id === section.id)?.items.find(i => i.id === item.id);
        if (!target) return;
        target.image = value; changed(); renderSectionEditor(item.id);
      }));
      body.append(imageGroup.details);
      const extra = group('详细内容', '点击卡片后显示的正文与步骤', section.kind === 'companies' || section.kind === 'workflow');
      extra.body.append(field('详细说明', item.details, value => { item.details = value; changed(); }, { multiline: true, rows: section.kind === 'companies' ? 9 : 5, hint: '可以按段落写工作职责、成果或项目过程。' }),
        field('流程步骤', (item.steps || []).join('\n'), value => { item.steps = value.split('\n').map(step => step.trim()).filter(Boolean).slice(0, 100); changed(); }, { multiline: true, rows: 3, hint: '每行一个步骤；没有流程时可以留空。', placeholder: '发现问题\n整理流程\n实践验证' }));
      body.append(extra.details);
      if (section.kind === 'companies' || Array.isArray(item.metrics)) renderMetrics(item, body);
      details.append(summary, body); els.sectionEditor.append(details);
    });
    els.sectionEditor.append(button('＋ 添加内容条目', 'add-item-button', addItem));
  }
  function scrollToInspector() {
    requestAnimationFrame(() => els.sectionEditor.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
  function selectSection(sectionId, scroll = false) {
    if (!currentPage().sections.some(section => section.id === sectionId)) return;
    selectedSectionId = sectionId; renderSectionList(); renderSectionEditor();
    if (scroll) scrollToInspector();
  }
  function selectPage(nextPageId) {
    if (!draft.pages.some(page => page.id === nextPageId)) return;
    pageId = nextPageId; selectedSectionId = ''; addPickerOpen = false; selectInitialSection(); render();
    $('.editor-scroll').scrollTop = 0; pushPreview();
  }
  function render() {
    selectInitialSection(); renderTabs(); renderPageSettings(); renderSectionList(); renderAddPicker(); renderSectionEditor();
    els.label.textContent = `${currentPage().name || PAGE_LABELS[pageId] || '当前页面'} · 实时预览`;
  }
  function exportDraft() {
    if (pendingImageJobs) { showToast('图片正在处理中，请稍后再导出。'); return; }
    try {
      const validated = normalizeDraft(draft);
      const blob = new Blob([JSON.stringify(validated, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = node('a'); link.href = url; link.download = 'yewei-website-draft.json'; document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      persistDraft();
      showToast('已导出编辑稿。把 JSON 文件发给我，就能继续完善网站。', true);
    } catch (error) { showToast(error.message || '导出失败，请检查内容。', true); }
  }

  try {
    draft = normalizeDraft(clone(window.websiteDefaults));
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        let parsed;
        try { parsed = JSON.parse(saved); }
        catch (error) { backupLegacyDraft(saved, null); throw error; }
        backupLegacyDraft(saved, parsed);
        draft = normalizeDraft(parsed);
        setStatus(legacyBackupRaw !== null ? '原稿备份待完成，请先导出' : '已打开本机编辑稿', legacyBackupRaw !== null ? 'warning' : 'saved');
      } else setStatus('初稿已就绪', 'saved');
    } catch {
      importWarning = '本机旧编辑稿暂时无法读取，已打开初稿。原暂存尚未覆盖；可先导出当前内容再修改。';
      setStatus('已打开初稿，请检查内容', 'warning');
    }
  } catch (error) {
    setStatus('初稿加载失败', 'warning');
    els.sectionEditor.append(node('p', 'panel-empty', error.message || '请刷新页面重试。'));
    return;
  }
  selectInitialSection(); render();
  if (editorParams.get('section') && selectedSectionId === editorParams.get('section')) scrollToInspector();
  if (importWarning) showToast(importWarning, true);
  els.add.addEventListener('click', () => { addPickerOpen = !addPickerOpen; renderAddPicker(); });
  $('#export-draft').addEventListener('click', exportDraft);
  $('#import-draft').addEventListener('click', () => els.input.click());
  els.input.addEventListener('change', async () => {
    const file = els.input.files?.[0]; if (!file) return;
    try {
      if (pendingImageJobs) throw new Error('请等图片处理完成后再导入。');
      if (file.size > MAX_JSON_BYTES) throw new Error('编辑稿超过 24 MB，请先减少图片数量。');
      const imported = normalizeDraft(JSON.parse(await file.text()));
      if (!window.confirm('导入后会替换当前编辑稿。建议先导出当前版本，是否继续？')) return;
      draft = imported; selectedSectionId = ''; addPickerOpen = false; selectInitialSection(); changed({ render: true }); persistDraft(); pushPreview();
      showToast('编辑稿已导入，预览已更新。');
    } catch (error) { showToast(error instanceof SyntaxError ? '这个文件不是有效的 JSON 编辑稿。' : error.message || '导入失败，请检查文件。', true); }
    finally { els.input.value = ''; }
  });
  $('#reset-draft').addEventListener('click', () => {
    if (pendingImageJobs) { showToast('请等图片处理完成后再恢复初稿。'); return; }
    if (!window.confirm('恢复到初稿会替换当前页面里的所有修改。请先导出需要保留的版本，是否继续？')) return;
    draft = normalizeDraft(clone(window.websiteDefaults)); selectedSectionId = ''; addPickerOpen = false; selectInitialSection(); changed({ render: true }); persistDraft(); pushPreview(); showToast('已恢复初稿。');
  });
  const toggleSidebar = $('#toggle-sidebar');
  toggleSidebar.setAttribute('aria-expanded', 'true'); toggleSidebar.setAttribute('aria-controls', 'editor-sidebar');
  toggleSidebar.addEventListener('click', () => {
    const hidden = document.body.classList.toggle('sidebar-hidden');
    toggleSidebar.setAttribute('aria-expanded', String(!hidden)); toggleSidebar.textContent = hidden ? '显示面板' : '编辑面板';
  });
  function setDevice(mobile) {
    document.body.classList.toggle('mobile-preview', mobile);
    $('#preview-desktop').setAttribute('aria-pressed', String(!mobile)); $('#preview-mobile').setAttribute('aria-pressed', String(mobile));
  }
  $('#preview-desktop').addEventListener('click', () => setDevice(false));
  $('#preview-mobile').addEventListener('click', () => setDevice(true));
  els.iframe.addEventListener('load', pushPreview);
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== els.iframe.contentWindow || !event.data || typeof event.data !== 'object') return;
    if (event.data.type === 'yewei-draft:ready') pushPreview();
    if (event.data.type === 'yewei-draft:page' && typeof event.data.pageId === 'string') {
      if (event.data.pageId !== pageId) selectPage(event.data.pageId);
    }
    if (event.data.type === 'yewei-draft:select' && typeof event.data.sectionId === 'string') {
      if (typeof event.data.pageId === 'string' && event.data.pageId !== pageId && draft.pages.some(p => p.id === event.data.pageId)) { pageId = event.data.pageId; render(); }
      selectSection(event.data.sectionId, true);
    }
  });
  window.addEventListener('beforeunload', event => {
    if (dirty) persistDraft();
    if (savingFailed || pendingImageJobs) { event.preventDefault(); event.returnValue = ''; }
  });
  window.addEventListener('pagehide', () => { if (dirty) persistDraft(); });
  window.addEventListener('storage', event => {
    if (event.key === STORAGE_KEY) showToast('另一个标签页的编辑稿有变化。当前修改会继续保留；请先导出，再决定是否重新载入。', true);
  });
  pushPreview();
})();

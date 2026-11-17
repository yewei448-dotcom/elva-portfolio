(() => {
  'use strict';
  const PREFERENCE_KEY = 'yewei.websiteLanguage.v1';
  const valid = value => value === 'en' ? 'en' : 'zh';
  const clone = value => JSON.parse(JSON.stringify(value));
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const dictionaries = {
    zh: {
      'nav.home': '首页', 'nav.experience': '经历', 'nav.capability': '能力',
      'nav.ai': 'AI 应用', 'nav.life': '生活', 'nav.education': '学历', 'nav.contact': '联系方式',
      'ui.edit': '编辑', 'ui.backToTop': '回到顶部', 'ui.openLink': '查看作品',
      'ui.copyWechat': '复制微信号', 'ui.copied': '微信号已复制', 'ui.email': '邮件',
      'ui.phone': '电话', 'ui.wechat': '微信', 'ui.resume': '简历',
      'editor.language': '编辑语言', 'editor.preview': '实时预览',
      'editor.seedHint': 'English 初稿已提供英文导航和标题，作品描述沿用中文，方便你自行翻译。两种语言独立保存。'
    },
    en: {
      'nav.home': 'Home', 'nav.experience': 'Experience', 'nav.capability': 'Capabilities',
      'nav.ai': 'AI Apps', 'nav.life': 'Life', 'nav.education': 'Education', 'nav.contact': 'Contact',
      'ui.edit': 'Edit', 'ui.backToTop': 'Back to top', 'ui.openLink': 'View work',
      'ui.copyWechat': 'Copy WeChat ID', 'ui.copied': 'WeChat ID copied', 'ui.email': 'Email',
      'ui.phone': 'Phone', 'ui.wechat': 'WeChat', 'ui.resume': 'Resume',
      'editor.language': 'Editing language', 'editor.preview': 'Live preview',
      'editor.seedHint': 'Navigation and headings are in English. Project descriptions start with the Chinese text for you to translate. Both languages are saved separately.'
    }
  };
  let language = 'zh';
  try { language = valid(localStorage.getItem(PREFERENCE_KEY)); } catch {}
  try {
    const requested = new URLSearchParams(location.search).get('lang');
    if (['zh', 'en'].includes(requested)) language = requested;
  } catch {}
  function getLanguage() { return language; }
  function setLanguage(next, { persist = true } = {}) {
    const previous = language;
    language = valid(next);
    if (persist) { try { localStorage.setItem(PREFERENCE_KEY, language); } catch {} }
    if (previous !== language && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
      window.dispatchEvent(new CustomEvent('website-language-change', { detail: { language } }));
    }
    return language;
  }
  function t(key, selectedLanguage = language) {
    return dictionaries[valid(selectedLanguage)][key] ?? dictionaries.zh[key] ?? key;
  }
  function standalone(document, selectedLanguage) {
    const result = clone(document);
    delete result.localizations;
    return typeof window.migrateWebsiteDraftPhotos === 'function'
      ? window.migrateWebsiteDraftPhotos(result, { language: selectedLanguage })
      : result;
  }
  function createEnglish(document) {
    const draft = standalone(document, 'zh');
    const exact = {
      '工作经历': 'Experience', '过往经历': 'Past Experience', '作品集': 'Capabilities', '能力': 'Capabilities', 'AI 应用': 'AI Applications',
      '生活里的片段': 'Life', '教育经历': 'Education',
      '一起做点\n值得被记住的事。': 'Let’s make something\nworth remembering.',
      '达人 · SEO · AI': 'Influencers · SEO · AI',
      '公司 / 职位 / 行业': 'Company / Role / Industry',
      '案例、内容与合作。': 'Projects, content and collaborations.',
      'BD / 内容生产 / CMS': 'Outreach / Content / CMS',
      '拥抱 AI，拥抱世界。\nAI 帮助我打开工作的新世界。': 'Embrace AI, embrace the world.\nAI opens a new world of work for me.',
      '探索世界中': 'Exploring the world', '西南财经大学硕士': 'SWUFE · Master’s',
      '工作与实习': 'Work & Internships', '达人营销': 'Influencer Marketing',
      '社媒运营': 'Social Media', 'SEO运营': 'SEO', '业务工作流': 'AI Workflows',
      '相册': 'Photos', '日常记录': 'Notes', '保持联系': 'Stay in Touch'
    };
    const translate = value => Object.hasOwn(exact, value) ? exact[value] : value;
    if (object(draft.site)) {
      if (draft.site.name === '叶薇') draft.site.name = 'Elva';
      draft.site.tagline = translate(draft.site.tagline);
    }
    (draft.pages || []).forEach(page => {
      const key = 'nav.' + page.id;
      if (Object.hasOwn(dictionaries.en, key)) page.name = dictionaries.en[key];
      page.title = translate(page.title);
      page.subtitle = translate(page.subtitle);
      if (page.id === 'home') ['statusText', 'portraitFooterLeft', 'portraitFooterRight'].forEach(key => {
        if (Object.hasOwn(page, key)) page[key] = translate(page[key]);
      });
      (page.sections || []).forEach(section => {
        section.title = translate(section.title);
        if (page.id === 'ai' && section.id === 'ai-resources') (section.items || []).forEach(item => {
          if (item.id === 'github' && item.text === '代码与实验') item.text = 'Code & experiments';
        });
        if (page.id === 'contact') (section.items || []).forEach(item => {
          const names = { phone: 'Phone', email: 'Email', wechat: 'WeChat', resume: 'Resume' };
          if (names[item.id]) item.title = names[item.id];
          (item.links || []).forEach(link => {
            const labels = { '拨打电话': 'Call', '发送邮件': 'Email', '下载简历': 'Download Resume' };
            if (Object.hasOwn(labels, link.label)) link.label = labels[link.label];
          });
        });
      });
    });
    delete draft.localizations;
    return draft;
  }
  function resolve(document, selectedLanguage = language) {
    if (!object(document)) throw new TypeError('A website document is required.');
    const selected = valid(selectedLanguage);
    const result = selected === 'en'
      ? object(document.localizations?.en) ? standalone(document.localizations.en, 'en') : createEnglish(document)
      : standalone(document, 'zh');
    delete result.localizations;
    return result;
  }
  window.WebsiteLanguage = { getLanguage, setLanguage, resolve, createEnglish, t };
})();

const projectNotes = {
  bd: {
    category: 'AI WORKFLOW / 01 · 软牛科技',
    title: '海外达人 BD 工作台',
    intro: '把关键词挖掘、频道筛选、英语建联和效果评估串联起来，让重复执行有规则，让资源投入有依据。',
    metrics: [['50 → 100', '单人日均有效触达 / 位'], ['800+', '沉淀达人频道']],
    sections: [
      ['业务问题', '达人开发涉及多个分散环节：先判断频道是否适配，再查历史合作、建联与议价，最后回收数据评估合作效果。大量时间花在信息整理和重复筛选上。'],
      ['我的工作', ['使用 Codex 等 AI 工具自主搭建工作台，将筛选标准拆为可校验规则：粉丝规模、活跃度、英语内容，以及排除竞品官方账号。', '串联频道筛选、历史合作查询、达人入库、邮件建联、议价跟进与效果评估，监测目标达人的更新。', '接入运营系统、YouTube 与 GA4 数据，计算转化率与单次下载成本，辅助复投判断。标准任务由 AI 执行，关键选择与投入由人工确认。']],
      ['实践结果', '经反复验证，单人日均有效触达由 50 位提升到 100 位，沉淀 800+ 个达人频道。该模块与内容、CMS 系统一起用于日常业务，并沉淀为部门可参考的 SOP。']
    ],
    flow: ['挖掘关键词', '筛选频道', '建联与跟进', '效果评估']
  },
  seo: {
    category: 'AI WORKFLOW / 02 · 软牛科技',
    title: '把内容生产与发布连起来',
    intro: '围绕英文 SEO 的真实交付，搭建内容生产工作台与 CMS 自动发布系统，将选题、撰稿、质检和上稿连成完整流程。',
    metrics: [['4h → 1h', '单篇筹备人工工时'], ['120 → 25min', '单篇 CMS 上稿耗时']],
    sections: [
      ['内容生产工作台', ['从热点监测与竞品内容缺口发现选题，用 Keywords Planner API 验证搜索量并筛选关键词。', '由 AI 生成文章初稿和配图，人工完成事实核对、产品信息校准与质量检查。单篇筹备人工工时由 4 小时降至 1 小时。']],
      ['CMS 自动发布系统', ['将文章模板与 HTML 规范拆解并封装为 AI Skill，接入公司 CMS API。', '由 AI 生成符合站点规范的 HTML 并通过接口完成上稿。单篇上稿耗时由 120 分钟降至 25 分钟。']],
      ['在业务中验证', '两套系统用于本人日常文章制作。同期英文内容累计交付 40 篇，新文章 7 天内收录率 90%；新增 62 个目标关键词进入 Google 前 30，其中 19 个进入前 10。上述内容结果属于同期 SEO 业务表现。']
    ],
    flow: ['热点与内容缺口', '关键词验证', 'AI 初稿与配图', '人工质检', 'CMS 上稿']
  },
  insta: {
    category: 'GROWTH / 03 · 影石 Insta360',
    title: '从场景创意，到创作者共创',
    intro: '围绕 Insta360 Flow 产品线，将 AI 追踪、盗梦空间等功能转化为具体的拍摄场景，再通过创作者合作验证与复用。',
    metrics: [['250+', '3 个月内合作抖音 KOC'], ['4,200 万+', '合作内容累计曝光']],
    sections: [
      ['从卖点到内容', '围绕产品能力提炼颜值、影像、舞蹈和大众运动等内容方向。输出 20 份 Brief，建立内容生产 SOP，降低合作沟通与内容复刻的成本。'],
      ['从验证到复用', ['3 个月内自主建联并合作 250+ 位 KOC，累计发布 400+ 条视频。球类模板对应 123 条内容，累计获得 2,000 万曝光。', '验证情侣盗梦空间创意玩法后与 KOC 合作，首条视频获得 200 万+播放，后续复刻累计获得 500 万+曝光。']],
      ['创作者项目', '主导 Flow2 系列创作者招募，结合账号分层与激励机制，半个月吸引 800+ 报名并促成 200+ 合作。该项目为单独的招募口径，不与 3 个月 KOC 合作数相加。']
    ],
    flow: ['提炼产品卖点', '验证创意场景', '创作者共创', '内容模板复用']
  },
  shop: {
    category: 'ENTREPRENEURSHIP / 04 · 2026.04 起',
    title: 'TikTok Shop 墨西哥电商',
    intro: '一次从 0 开始的跨境经营实践。2026 年 4 月启动海运备货，6 月底商品上架并持续运营，亲自负责从供应链到售后的经营链路。',
    metrics: [['3 家 / 26 个', '店铺 / 上架 SKU'], ['300 笔', '累计完成订单']],
    sections: [
      ['完整经营链路', ['负责选品、供应链对接与海运备货，完成商品上架和本地化。', '持续开展店铺运营、内容与达人合作，跟进订单履约和售后。']],
      ['经营结果', '累计运营 3 家店铺、上架 26 个 SKU，完成 300 笔订单，GMV 4 万墨西哥比索，退款率低于 5%。'],
      ['这段实践的意义', '从营销环节走向完整经营，实际接触货品、物流、平台与合作成本，理解内容获客之后的履约与售后。']
    ],
    flow: ['选品', '供应链与海运', '上架本地化', '内容与达人', '履约售后']
  }
};

const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
function closeMenu() {
  navigation.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', '打开导航');
}
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  navigation.classList.toggle('open', open);
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? '关闭导航' : '打开导航');
});
navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });

document.querySelectorAll('[data-filter]').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach(filter => {
      const active = filter === button;
      filter.classList.toggle('active', active);
      filter.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('.project-card').forEach(project => {
      project.hidden = button.dataset.filter !== 'all' && project.dataset.category !== button.dataset.filter;
    });
  });
});

const dialog = document.querySelector('#case-dialog');
const content = document.querySelector('#case-content');
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}
document.querySelectorAll('[data-project]').forEach(button => {
  button.addEventListener('click', () => {
    const project = projectNotes[button.dataset.project];
    content.replaceChildren();
    content.append(element('p', 'case-eyebrow', project.category));
    const title = element('h2', '', project.title);
    title.id = 'case-title';
    content.append(title, element('p', 'case-intro', project.intro));
    const metrics = element('div', 'case-metrics');
    project.metrics.forEach(([value, label]) => {
      const metric = element('div');
      metric.append(element('strong', '', value), element('span', '', label));
      metrics.append(metric);
    });
    content.append(metrics);
    project.sections.forEach(([heading, body]) => {
      const section = element('section', 'case-section');
      section.append(element('h3', '', heading));
      if (Array.isArray(body)) {
        const list = element('ul');
        body.forEach(item => list.append(element('li', '', item)));
        section.append(list);
      } else section.append(element('p', '', body));
      content.append(section);
    });
    const flow = element('div', 'case-flow');
    flow.setAttribute('aria-label', '项目流程');
    project.flow.forEach((step, index) => {
      if (index) { const arrow = element('i', '', '→'); arrow.setAttribute('aria-hidden', 'true'); flow.append(arrow); }
      flow.append(element('span', '', step));
    });
    content.append(flow);
    dialog.showModal();
    dialog.scrollTop = 0;
    document.body.style.overflow = 'hidden';
  });
});
function closeDialog() { dialog.close(); }
document.querySelector('.dialog-close').addEventListener('click', closeDialog);
document.querySelector('.dialog-done').addEventListener('click', closeDialog);
dialog.addEventListener('close', () => { document.body.style.overflow = ''; });
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog();
});

let toastTimer;
function showToast(message) {
  const toast = document.querySelector('#toast');
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('visible');
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 3500);
}
document.querySelectorAll('[data-copy]').forEach(button => {
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      showToast(`${button.dataset.copyLabel}已复制：${button.dataset.copy}`);
    } catch {
      showToast(`请手动复制${button.dataset.copyLabel}：${button.dataset.copy}`);
    }
  });
});
document.querySelector('#year').textContent = new Date().getFullYear();

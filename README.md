# 叶薇的个人网站

首页海景与悬挂照片来自用户，齐刘海插画头像由 ImageGen 生成。主内容依次为经历、能力、AI 应用、生活、学历、联系方式；学历仅展示硕士院校，并在联系区提供小字入口。

- `dist/website-config.js`：公开版初始内容与旧编辑稿迁移；公司、能力案例、三个工作台及证明链接均在此配置。
- `dist/index.html` / `portfolio.js`：展示版首页和四个板块。
- `dist/portfolio-view.js` / `portfolio.css` / `chapters.css`：主站与草稿共用的学历、公司、作品集、工作台、生活和联系组件。
- `dist/editor.html`：可编辑背景、头像、照片、学历、职位、行业、时间、作品封面、指标与多条证明链接。
- `dist/draft.html`：实时草稿预览；作品按封面卡片展示，点击展开详情和代表链接。
- `dist/assets/logos/SOURCES.txt`：四家公司的官方 Logo 来源；GURU 保留公司文字。
- `dist/journal-type.css` / `journal-cursor.*`：系统字体搭配与桌面像素拖尾；触摸和减少动态效果时停用拖尾。
- `dist/finale.css` / `dist/assets/ui/`：全屏海景封面与联系区、粗黑无衬线字体、iPhone 风格快捷导航与联系图标。工作经历与 AI 应用采用可展开的白色玻璃叠放卡片。
- `dist/language.js` / `dist/navigation-locale.css`：公开中英切换、白玻璃导航，以及联系图标下方的 hover / 键盘焦点信息。
- `dist/compact-layout.css`：居中短导航、半屏联系区和影石案例的三组折叠链接。
- `dist/assets/platforms/`：抖音、YouTube、TikTok、Google 平台封面及用户提供的小红书花束截图；Logo 来源见 `SOURCES.txt`。

编辑暂存在当前浏览器 `yewei.visualDraft.v1`，通过“导出给我”下载 JSON 交回完善，不会直接覆盖线上展示版。结构版本 5 的英文稿保存在 `localizations.en`，编辑器可分别编辑中文 / English，导出包含两种语言。英文初稿提供英文导航与标题，具体案例描述保留原文供用户自己翻译。

能力内容升级前原稿备份到 `yewei.visualDraft.beforeCapabilitiesRefresh.v4`；早期 `beforeLocalization.v3`、`beforeEducationLife.v2`、`beforeCapabilities.v1` 备份保留。自定义背景、照片及兼容内容会保留，旧关联链接合并去重。生活页的照片和文字留空供用户填写。

用户提供的 AIO 引用与 SERP 第 1 位按项目期表现展示；未声称核验当前搜索排名。TikTok 的重复账号链接已合并。原始简历见 `dist/assets/yewei-cv.pdf`。

静态网站，无构建步骤。本地运行 `python3 -m http.server 4178 --directory dist`，访问 `http://127.0.0.1:4178`。`.openai/hosting.json` 保留原 Sites 项目标识。

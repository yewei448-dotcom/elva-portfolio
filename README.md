# 叶薇的个人网站

首页海景与悬挂照片来自用户，主内容为四个板块：Experience、Capability、AI 应用、联系方式。

- `dist/website-config.js`：公开版初始内容与旧编辑稿迁移；公司、能力案例、三个工作台及证明链接均在此配置。
- `dist/index.html` / `portfolio.js`：展示版首页和四个板块。
- `dist/portfolio-view.js` / `portfolio.css`：主站与草稿共用的公司、能力、工作台和联系组件。
- `dist/editor.html`：可编辑背景、照片、职位、行业、时间、案例、指标与多条证明链接。
- `dist/draft.html`：实时草稿预览；鼠标悬停显示能力分支，点击展开案例，再展开代表作品。
- `dist/assets/logos/SOURCES.txt`：四家公司的官方 Logo 来源；GURU 保留公司文字。
- `dist/journal-type.css` / `journal-cursor.*`：系统字体搭配与桌面像素拖尾；触摸和减少动态效果时停用拖尾。

编辑暂存在当前浏览器 `yewei.visualDraft.v1`，通过“导出给我”下载 JSON 交回完善，不会直接覆盖线上展示版。升级前旧稿原文备份到 `yewei.visualDraft.beforeCapabilities.v1`；自定义背景、照片及兼容内容会保留。空证明链接可以继续补充，不构造作品地址。

用户提供的 AIO 引用与 SERP 第 1 位按项目期表现展示；未声称核验当前搜索排名。TikTok 的重复账号链接已合并。原始简历见 `dist/assets/yewei-cv.pdf`。

静态网站，无构建步骤。本地运行 `python3 -m http.server 4178 --directory dist`，访问 `http://127.0.0.1:4178`。`.openai/hosting.json` 保留原 Sites 项目标识。

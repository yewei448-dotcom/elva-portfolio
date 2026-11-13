# 叶薇的个人空间

静态个人网站，包含六个板块：关于我、账号与内容、照片、项目、工作与教育经历、联系。参考用户指定的 fffhh.me 的剪贴簿式布局，重新制作页面，不复用参考站的代码或个人照片。

## 内容

- `dist/index.html`：正文、导航和链接。
- `dist/styles.css`：桌面和手机布局。
- `dist/script.js`：项目详情、照片放大、导航与微信号复制。
- `dist/content.js`：个人相册。将照片放在 `dist/assets/`，设置每个条目的 `src` 和 `caption`；`src` 为空时显示明确的照片预留位置。
- `dist/assets/yewei.jpg`：用户简历中提取的个人照片。
- `dist/assets/yewei-cv.pdf`：用户提供的原简历。
- `dist/assets/meadow.jpg`：装饰背景，Adrien Olichon / Unsplash，https://unsplash.com/photos/green-hill-under-a-blue-sky-with-clouds-yOkNxeFoh-s 。不是用户的摄影作品。
- `.openai/hosting.json`：原 Sites 项目标识和部署目录。

账号内容链接由用户直接提供：TikTok `@jesus.holds.you`、小红书指定帖子。它们不使用其他简历项目的成绩数据。小红书未能读取标题和封面，使用自制文字封面和原始直达链接。

照片按用户要求预留，未代填虚构的个人照片。页面可在未来通过 `content.js` 加入照片，并自动启用照片放大功能。

## 本地预览

在此目录执行 `python3 -m http.server 4178 --directory dist`，浏览 `http://127.0.0.1:4178`。无构建步骤和第三方前端依赖。

原简历中的 Insta360 结束月份不完整，页面只显示开始月份；CMS 案例使用可核对的前后耗时“120 分钟 → 25 分钟”。

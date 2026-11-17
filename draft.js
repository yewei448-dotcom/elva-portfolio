(() => {
  'use strict';
  const STORAGE_KEY='yewei.visualDraft.v1';
  const BACKUP_STORAGE_KEY='yewei.visualDraft.beforePresentationRefresh.v5';
  document.body.dataset.draftContext='true';
  const params=new URLSearchParams(location.search);
  const embedded=params.get('editor')==='1'&&parent!==window;
  const migratePhotos=value=>typeof window.migrateWebsiteDraftPhotos==='function'?window.migrateWebsiteDraftPhotos(value):value;
  let sourceDraft=migratePhotos(structuredClone(window.websiteDefaults));
  let language=window.WebsiteLanguage?.getLanguage()||'zh';
  const textFor=(zh,en)=>language==='en'?en:zh;
  let draft=window.WebsiteLanguage?.resolve(sourceDraft,language)||sourceDraft;
  let pageId=params.get('page')||location.hash.slice(1)||'experience';
  function readCachedDraft(raw){
    if(!raw)return null;
    let cached;
    try{cached=JSON.parse(raw);}catch{try{if(localStorage.getItem(BACKUP_STORAGE_KEY)===null)localStorage.setItem(BACKUP_STORAGE_KEY,raw);}catch{}return null;}
    if(cached?.structureVersion!==6){try{if(localStorage.getItem(BACKUP_STORAGE_KEY)===null)localStorage.setItem(BACKUP_STORAGE_KEY,raw);}catch{}}
    return cached?.schemaVersion===1&&Array.isArray(cached.pages)?migratePhotos(cached):null;
  }
  if(!embedded){try{const cached=readCachedDraft(localStorage.getItem(STORAGE_KEY));if(cached){sourceDraft=cached;draft=window.WebsiteLanguage?.resolve(sourceDraft,language)||sourceDraft;}}catch{}}
  const app=document.querySelector('#draft-app');
  const dialog=document.querySelector('#detail-dialog');
  const detailContent=document.querySelector('#detail-content');
  let activeDetailId=null,activeDetailPhoto=false;
  const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!=null)node.textContent=String(text);return node;};
  function safeUrl(value,image=false){
    if(typeof value!=='string'||value.length>14000000)return '';
    const v=value.trim();
    if(/[\u0000-\u001f\u007f]/.test(v))return '';
    if(!image&&/^(?:mailto|tel):/i.test(v))return /^(?:mailto|tel):[^\s]+$/i.test(v)?v:'';
    if(image&&/^data:image\/(?:png|jpe?g|webp|gif|avif);base64,[a-zA-Z0-9+/=\s]+$/.test(v))return v;
    if(/^https?:\/\//i.test(v)){try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}}
    if(/^assets\//i.test(v)){try{const path=decodeURIComponent(v);if(path.includes('..')||/[<>\\]/.test(path))return '';if(image)return v;return /\.pdf$/i.test(path)&&!/[?#]/.test(path)?v:'';}catch{return '';}}
    return '';
  }
  function send(message){if(embedded)parent.postMessage(message,location.origin);}
  function goToPage(id){if(!draft.pages.some(p=>p.id===id&&!p.archived))return;pageId=id;history.replaceState(null,'',`${location.pathname}${location.search}#${id}`);render();scrollTo({top:0,behavior:'instant'});send({type:'yewei-draft:page',pageId:id});}
  function externalLink(url,text,cls){const node=el('a',cls,text);node.href=url;node.target='_blank';node.rel='noopener noreferrer';return node;}
  function appendProofLinks(container,item){
    if(!Array.isArray(item.links))return;
    const list=el('div','item-actions proof-links');
    item.links.slice(0,64).forEach(link=>{if(!link||typeof link!=='object')return;const url=safeUrl(link.url);const label=typeof link.label==='string'?link.label:textFor('相关作品','Related work');if(url)list.append(externalLink(url,(label||textFor('打开链接','Open link'))+' ↗','item-link'));else if(label)list.append(el('span','pending-link',label+textFor(' · 待填写',' · Coming soon')));});
    if(list.childNodes.length)container.append(list);
  }
  function showDetail(item,isPhoto=false){
    activeDetailId=item.id;activeDetailPhoto=isPhoto;
    detailContent.replaceChildren();
    const title=el('h2','',item.title||textFor('详情','Details'));title.id='detail-title';detailContent.append(title);
    const companyMeta=[item.role,item.industry,item.period].filter(Boolean).join(' · ');
    if(companyMeta||item.meta)detailContent.append(el('p','detail-meta',companyMeta||item.meta));
    if(isPhoto&&safeUrl(item.image,true)){const img=el('img','detail-image');img.src=safeUrl(item.image,true);img.alt=item.title||textFor('照片','Photo');detailContent.append(img);}
    if(item.text)detailContent.append(el('p','detail-intro',item.text));
    if(Array.isArray(item.metrics)&&item.metrics.length){const metrics=el('div','detail-metrics');item.metrics.slice(0,30).forEach(x=>{const node=el('div');node.append(el('strong','',x.value||''),el('span','',x.label||''));metrics.append(node);});detailContent.append(metrics);}
    if(item.details)detailContent.append(el('div','detail-copy',item.details));
    const url=safeUrl(item.url);if(url)detailContent.append(externalLink(url,textFor('打开作品 / 主页 ↗','View work / profile ↗'),'detail-link'));
    appendProofLinks(detailContent,item);
    if(!dialog.open){dialog.showModal();dialog.scrollTop=0;}document.body.style.overflow='hidden';
  }
  document.querySelector('#close-detail').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{activeDetailId=null;document.body.style.overflow='';});
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
  function imageNode(src,alt){const img=el('img');img.src=src;img.alt=alt||'';img.loading='lazy';return img;}
  function renderItem(item,kind,index){
    if(kind==='companies'&&window.PortfolioUI?.companyCard)return window.PortfolioUI.companyCard(item,index);
    if(kind==='workflow'&&window.PortfolioUI?.workflow)return window.PortfolioUI.workflow(item,index);
    const image=safeUrl(item.image,true),url=safeUrl(item.url);
    if(kind==='companies'){
      const card=el('button',`company-card company-${index%5}`);card.type='button';card.setAttribute('aria-label',textFor(`查看${item.title}的工作与成果`,`View responsibilities and results at ${item.title}`));
      const top=el('span','company-top');top.append(el('span','',String(index+1).padStart(2,'0')),el('span','','↗'));
      const mark=el('span','company-wordmark');if(image)mark.append(imageNode(image,item.title));else mark.textContent=item.title||textFor('公司名称','Company name');
      card.append(top,mark,el('span','company-meta',item.meta||''),el('span','company-description',item.text||''),el('span','company-action',textFor('具体做了什么 ＋','View responsibilities ＋')));
      card.addEventListener('click',()=>showDetail(item));return card;
    }
    if(kind==='photo'){
      const card=el('figure',`photo-card photo-${index%5}`);const frame=el(image?'button':'div','photo-frame');
      if(image){frame.type='button';frame.append(imageNode(image,item.title));frame.setAttribute('aria-label',textFor(`放大查看${item.title||'照片'}`,`Enlarge ${item.title||'photo'}`));frame.addEventListener('click',()=>showDetail(item,true));}
      else{const placeholder=el('div','empty-photo');placeholder.append(el('span','','＋'),el('small','',`PHOTO ${String(index+1).padStart(2,'0')}`));frame.append(placeholder);}
      card.append(frame,el('figcaption','',item.title||textFor(`照片 ${index+1}`,`Photo ${index+1}`)));if(item.text)card.append(el('p','photo-description',item.text));return card;
    }
    const card=el('article',`content-card kind-${kind}`);
    if(kind==='videos'){
      const cover=el(url?'a':'div','video-cover');if(url){cover.href=url;cover.target='_blank';cover.rel='noopener noreferrer';cover.setAttribute('aria-label',textFor(`打开视频：${item.title}`,`Play video: ${item.title}`));}
      if(image)cover.append(imageNode(image,item.title));else cover.append(el('span','video-placeholder',url?'VIDEO':textFor('视频封面位','Video cover')));
      cover.append(el('span','play-symbol','▷'));card.append(cover);
    }else if(image)card.append(imageNode(image,item.title));
    const copy=el('div','card-copy');if(item.meta)copy.append(el('span','item-meta',item.meta));copy.append(el('h3','',item.title||textFor('未命名内容','Untitled')));if(item.text)copy.append(el('p','',item.text));
    if(kind==='workflow'&&Array.isArray(item.steps)&&item.steps.length){const steps=el('ol','flow-steps');item.steps.filter(x=>String(x).trim()).slice(0,100).forEach((s,i)=>{const step=el('li');step.append(el('small','',String(i+1).padStart(2,'0')),el('span','',s));steps.append(step);});copy.append(steps);}
    const actions=el('div','item-actions');if(url)actions.append(externalLink(url,kind==='videos'?textFor('打开视频 ↗','Play video ↗'):textFor('打开链接 ↗','Open link ↗'),'item-link'));else if(kind==='links'||kind==='videos')actions.append(el('span','pending-link',kind==='videos'?textFor('视频链接待添加','Video coming soon'):textFor('链接待填写','Link coming soon')));
    if(item.details){const button=el('button','read-detail',textFor('查看介绍 ＋','Read more ＋'));button.type='button';button.addEventListener('click',()=>showDetail(item));actions.append(button);}
    if(actions.childNodes.length)copy.append(actions);appendProofLinks(copy,item);card.append(copy);return card;
  }
  function render(){
    const visiblePages=draft.pages.filter(p=>!p.archived);
    if(!visiblePages.some(p=>p.id===pageId))pageId=visiblePages[0]?.id||'home';
    const page=draft.pages.find(p=>p.id===pageId);if(!page)return;
    document.body.dataset.page=page.id;
    window.WebsiteLanguage?.setLanguage(language,{persist:false});document.documentElement.lang=language==='en'?'en':'zh-CN';
    const previousPage=app.dataset.page;const previousScroll=scrollY;
    const keepCapabilitiesOpen=previousPage===page.id&&Boolean(app.querySelector('.capabilities-reveal[open]'));
    const openDetails=previousPage===page.id?new Set([...app.querySelectorAll('details[data-detail-key][open]')].map(node=>node.dataset.detailKey)):new Set();
    if(previousPage&&previousPage!==page.id&&dialog.open)dialog.close();
    app.dataset.page=page.id;app.replaceChildren();
    const bg=page.background||{};document.body.style.backgroundColor=/^#[0-9a-f]{3,8}$/i.test(bg.color||'')?bg.color:'#faf8ef';
    const bgImage=safeUrl(bg.image,true);const overlay=Math.max(0,Math.min(.8,Number(bg.overlay)||0));document.body.classList.toggle('has-background-image',Boolean(bgImage));
    const lowerOverlay=page.id==='contact'?Math.min(.8,overlay+.1):overlay;
    document.body.style.backgroundImage=bgImage?`linear-gradient(rgba(18,27,23,${overlay}),rgba(18,27,23,${lowerOverlay})),url(${JSON.stringify(bgImage)})`:'';
    document.title=`${draft.site?.name||textFor('我的网站','My website')} · ${page.name||textFor('预览','Preview')}`;
    dialog.querySelector('.detail-top > span').textContent=textFor('DETAILS / 查看详情','DETAILS');
    document.querySelector('#close-detail').setAttribute('aria-label',textFor('关闭详情','Close details'));
    const header=el('header','draft-header');const logo=el('a','draft-logo','Elva✳');logo.href='#home';logo.setAttribute('aria-label',textFor('首页','Home'));logo.addEventListener('click',e=>{e.preventDefault();goToPage('home');});
    const nav=el('nav','page-nav');nav.setAttribute('aria-label',textFor('页面导航','Page navigation'));visiblePages.slice(0,12).forEach(p=>{const button=el('button',p.id===page.id?'active':'',p.name||p.id);button.type='button';if(p.id===page.id)button.setAttribute('aria-current','page');button.addEventListener('click',()=>goToPage(p.id));nav.append(button);});
    const languageButton=el('button','language-toggle',language==='en'?'中':'EN');languageButton.type='button';languageButton.setAttribute('aria-label',textFor('切换为英文','Switch to Chinese'));
    languageButton.addEventListener('click',()=>{
      const next=language==='en'?'zh':'en';
      if(embedded){send({type:'yewei-draft:language',language:next});return;}
      language=next;window.WebsiteLanguage?.setLanguage(language);const url=new URL(location.href);url.searchParams.set('lang',language);history.replaceState(null,'',url);draft=window.WebsiteLanguage?.resolve(sourceDraft,language)||sourceDraft;render();
    });
    header.append(logo,nav,languageButton);app.append(header);
    const main=el('main','draft-main');
    if(page.id==='contact'&&typeof window.PortfolioUI?.contactScene==='function'){
      main.classList.add('contact-preview-main');
      main.append(window.PortfolioUI.contactScene(page,draft.site,{onHome:()=>goToPage('home'),onEdit:embedded?()=>send({type:'yewei-draft:select',sectionId:page.sections[0]?.id,pageId:page.id}):null}));app.append(main);
      if(!embedded){const edit=el('a','standalone-edit',textFor('返回可视化编辑器 ↗','Back to editor ↗'));edit.href=`editor.html?page=contact&lang=${language}`;app.append(edit);}
      return;
    }
    const hero=el('div','page-intro');
    const portraitImage=page.id==='home'?safeUrl(page.portraitImage,true):'';
    const intro=portraitImage?el('div','home-intro-copy'):hero;
    if(page.id==='home'){
      const status=el('div','draft-home-avatar');const avatar=safeUrl(page.avatarImage,true);if(avatar)status.append(imageNode(avatar,'Elva AI avatar'));status.append(el('span','',page.statusText??textFor('探索世界中','Exploring the world')));intro.append(status);
    }
    const introTitle=el('h1','',page.title??page.name);
    if(page.id==='home'){
      const [name,...motto]=(page.title??page.name).split('\n');introTitle.replaceChildren(el('span','hero-name',name));if(motto.length)introTitle.append(el('span','hero-motto',motto.join('\n')));
    }
    const chapterNumber=page.id==='home'?0:visiblePages.filter(p=>p.id!=='home').indexOf(page)+1;
    intro.append(el('span','page-eyebrow',`${String(chapterNumber).padStart(2,'0')} / ${page.name||page.id}`),introTitle);
    if(page.id==='ai')intro.append(window.PortfolioUI.aiStatement(page.subtitle));else if(!['experience','capability'].includes(page.id))intro.append(el('p','page-subtitle',page.subtitle||''));
    if(portraitImage){
      hero.classList.add('home-intro');hero.append(intro);
      const hanging=el('figure','home-hanging-photo');
      const rope=el('span','home-photo-rope');rope.setAttribute('aria-hidden','true');
      const clip=el('span','home-photo-clip');clip.setAttribute('aria-hidden','true');
      const card=el('div','home-hanging-card');
      const hole=el('span','home-photo-hole');hole.setAttribute('aria-hidden','true');
      const image=el('img');image.src=portraitImage;image.alt=textFor(`${draft.site?.name||'我'}的个人照片`,`Portrait of ${draft.site?.name||'Elva'}`);image.decoding='async';
      const caption=el('div','home-photo-caption');caption.append(el('strong','',draft.site?.name||textFor('我','Elva')),el('span','','ELVA'));
      const bottom=el('div','home-photo-bottom');bottom.append(el('span','',page.portraitFooterLeft??textFor('西南财经大学硕士','SWUFE · Master’s')),el('span','',page.portraitFooterRight??'ENTP'));
      card.append(hole,image,caption,bottom);hanging.append(rope,clip,card);hero.append(hanging);
    }
    main.append(hero);
    const capabilityGallery=page.id==='capability'?el('div','portfolio-gallery'):null;
    (page.sections||[]).slice(0,100).forEach((section,index)=>{
      const sharedResource=page.id==='ai'&&section.kind==='links'&&typeof window.PortfolioUI?.resourceLinks==='function';
      const sharedPortfolio=page.id==='capability'&&typeof window.PortfolioUI?.portfolioSection==='function';
      const sharedEducation=page.id==='education'&&typeof window.PortfolioUI?.educationSection==='function';
      const sharedLife=page.id==='life'&&typeof window.PortfolioUI?.lifeSection==='function';
      const sharedCapability=!sharedPortfolio&&section.kind==='capability'&&typeof window.PortfolioUI?.capability==='function';
      const block=sharedPortfolio?window.PortfolioUI.portfolioSection(section,index):sharedCapability?window.PortfolioUI.capability(section):el('section');
      block.classList.add('draft-section',`block-${section.kind||'text'}`);block.dataset.sectionId=section.id;block.id=section.id;
      if(embedded){
        const select=()=>send({type:'yewei-draft:select',sectionId:section.id,pageId:page.id});
        const edit=el('button','edit-section',textFor('编辑此板块','Edit section'));edit.type='button';edit.addEventListener('click',event=>{event.stopPropagation();select();});
        const summary=sharedCapability?block.querySelector('summary'):null;
        if(summary)summary.append(edit);else block.append(edit);
        block.addEventListener('click',event=>{
          const anchor=event.target instanceof Element?event.target.closest('a'):null;
          if(anchor?.getAttribute('href')?.startsWith('editor.html'))event.preventDefault();
          select();
        });
      }
      if(!sharedCapability&&!sharedPortfolio){
        if(!sharedResource){const heading=el('div','block-heading');heading.append(el('span','block-number',String(index+1).padStart(2,'0')),el('h2','',section.title||textFor('新板块','New section')));block.append(heading);if(section.subtitle)block.append(el('p','block-subtitle',section.subtitle));}
        if(sharedResource)block.append(window.PortfolioUI.resourceLinks(section));
        else if(sharedEducation)block.append(window.PortfolioUI.educationSection(section));
        else if(sharedLife)block.append(window.PortfolioUI.lifeSection(section));
        else if(page.id==='contact'&&section.kind==='links'&&typeof window.PortfolioUI?.contacts==='function')block.append(window.PortfolioUI.contacts(section,draft.site));
        else{
          const items=el('div',`block-items ${section.kind||'text'}-items`);(section.items||[]).slice(0,500).forEach((item,i)=>items.append(renderItem(item,section.kind,i)));if(!items.childNodes.length)items.append(el('p','empty-block',textFor('这里还没有内容，可以在编辑面板添加。','Nothing here yet. Add content in the editor.')));block.append(items);
        }
      }
      (capabilityGallery||main).append(block);
    });
    if(capabilityGallery){const fold=window.PortfolioUI.capabilityReveal(capabilityGallery);fold.open=keepCapabilitiesOpen;main.append(fold);}
    app.append(main);
    app.querySelectorAll('details[data-detail-key]').forEach(node=>{if(openDetails.has(node.dataset.detailKey))node.open=true;});
    const footer=el('footer','draft-footer');const info=el('div');info.append(el('strong','',draft.site?.name||textFor('我的网站','My website')),el('p','',draft.site?.tagline||''));const contact=el('div','footer-contact');
    const email=String(draft.site?.email||'').replace(/[\r\n]/g,'');if(email){const a=el('a','',email+' ↗');a.href='mailto:'+encodeURIComponent(email);contact.append(a);}if(draft.site?.wechat)contact.append(el('span','',textFor('微信 / ','WeChat / ')+draft.site.wechat));footer.append(info,contact);if(bg.image==='assets/meadow.jpg')footer.append(el('small','background-credit',textFor('装饰背景：Adrien Olichon / Unsplash','Background photo: Adrien Olichon / Unsplash')));app.append(footer);
    if(!embedded){const edit=el('a','standalone-edit',textFor('返回可视化编辑器 ↗','Back to editor ↗'));edit.href=`editor.html?lang=${language}`;app.append(edit);}
    if(dialog.open&&activeDetailId){const updated=(page.sections||[]).flatMap(s=>s.items||[]).find(i=>i.id===activeDetailId);if(updated)showDetail(updated,activeDetailPhoto);else dialog.close();}
    if(previousPage===page.id&&previousScroll)requestAnimationFrame(()=>scrollTo({top:previousScroll,behavior:'instant'}));
  }
  if(embedded){addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==parent)return;const message=event.data;if(message?.type!=='yewei-draft:update'||message.draft?.schemaVersion!==1||!Array.isArray(message.draft.pages))return;language=message.language==='en'?'en':'zh';draft=migratePhotos(message.draft);if(message.pageId)pageId=message.pageId;render();});}
  else addEventListener('storage',event=>{if(event.key!==STORAGE_KEY)return;try{const next=readCachedDraft(event.newValue);if(next){sourceDraft=next;draft=window.WebsiteLanguage?.resolve(sourceDraft,language)||sourceDraft;render();}}catch{}});
  render();send({type:'yewei-draft:ready'});
})();

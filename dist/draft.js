(() => {
  'use strict';
  const STORAGE_KEY='yewei.visualDraft.v1';
  const BACKUP_STORAGE_KEY='yewei.visualDraft.beforeEducationLife.v2';
  document.body.dataset.draftContext='true';
  const params=new URLSearchParams(location.search);
  const embedded=params.get('editor')==='1'&&parent!==window;
  const migratePhotos=value=>typeof window.migrateWebsiteDraftPhotos==='function'?window.migrateWebsiteDraftPhotos(value):value;
  let draft=migratePhotos(structuredClone(window.websiteDefaults));
  let pageId=params.get('page')||location.hash.slice(1)||'experience';
  function readCachedDraft(raw){
    if(!raw)return null;
    let cached;
    try{cached=JSON.parse(raw);}catch{try{if(localStorage.getItem(BACKUP_STORAGE_KEY)===null)localStorage.setItem(BACKUP_STORAGE_KEY,raw);}catch{}return null;}
    if(cached?.structureVersion!==3){try{if(localStorage.getItem(BACKUP_STORAGE_KEY)===null)localStorage.setItem(BACKUP_STORAGE_KEY,raw);}catch{}}
    return cached?.schemaVersion===1&&Array.isArray(cached.pages)?migratePhotos(cached):null;
  }
  if(!embedded){try{const cached=readCachedDraft(localStorage.getItem(STORAGE_KEY));if(cached)draft=cached;}catch{}}
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
  function goToPage(id){if(!draft.pages.some(p=>p.id===id))return;pageId=id;history.replaceState(null,'',`${location.pathname}${location.search}#${id}`);render();scrollTo({top:0,behavior:'instant'});send({type:'yewei-draft:page',pageId:id});}
  function externalLink(url,text,cls){const node=el('a',cls,text);node.href=url;node.target='_blank';node.rel='noopener noreferrer';return node;}
  function appendProofLinks(container,item){
    if(!Array.isArray(item.links))return;
    const list=el('div','item-actions proof-links');
    item.links.slice(0,30).forEach(link=>{if(!link||typeof link!=='object')return;const url=safeUrl(link.url);const label=typeof link.label==='string'?link.label:'相关作品';if(url)list.append(externalLink(url,(label||'打开链接')+' ↗','item-link'));else if(label)list.append(el('span','pending-link',label+' · 待填写'));});
    if(list.childNodes.length)container.append(list);
  }
  function showDetail(item,isPhoto=false){
    activeDetailId=item.id;activeDetailPhoto=isPhoto;
    detailContent.replaceChildren();
    const title=el('h2','',item.title||'详情');title.id='detail-title';detailContent.append(title);
    const companyMeta=[item.role,item.industry,item.period].filter(Boolean).join(' · ');
    if(companyMeta||item.meta)detailContent.append(el('p','detail-meta',companyMeta||item.meta));
    if(isPhoto&&safeUrl(item.image,true)){const img=el('img','detail-image');img.src=safeUrl(item.image,true);img.alt=item.title||'照片';detailContent.append(img);}
    if(item.text)detailContent.append(el('p','detail-intro',item.text));
    if(Array.isArray(item.metrics)&&item.metrics.length){const metrics=el('div','detail-metrics');item.metrics.slice(0,30).forEach(x=>{const node=el('div');node.append(el('strong','',x.value||''),el('span','',x.label||''));metrics.append(node);});detailContent.append(metrics);}
    if(item.details)detailContent.append(el('div','detail-copy',item.details));
    const url=safeUrl(item.url);if(url)detailContent.append(externalLink(url,'打开作品 / 主页 ↗','detail-link'));
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
      const card=el('button',`company-card company-${index%5}`);card.type='button';card.setAttribute('aria-label',`查看${item.title}的工作与成果`);
      const top=el('span','company-top');top.append(el('span','',String(index+1).padStart(2,'0')),el('span','','↗'));
      const mark=el('span','company-wordmark');if(image)mark.append(imageNode(image,item.title));else mark.textContent=item.title||'公司名称';
      card.append(top,mark,el('span','company-meta',item.meta||''),el('span','company-description',item.text||''),el('span','company-action','具体做了什么 ＋'));
      card.addEventListener('click',()=>showDetail(item));return card;
    }
    if(kind==='photo'){
      const card=el('figure',`photo-card photo-${index%5}`);const frame=el(image?'button':'div','photo-frame');
      if(image){frame.type='button';frame.append(imageNode(image,item.title));frame.setAttribute('aria-label',`放大查看${item.title||'照片'}`);frame.addEventListener('click',()=>showDetail(item,true));}
      else{const placeholder=el('div','empty-photo');placeholder.append(el('span','','＋'),el('small','',`PHOTO ${String(index+1).padStart(2,'0')}`));frame.append(placeholder);}
      card.append(frame,el('figcaption','',item.title||`照片 ${index+1}`));if(item.text)card.append(el('p','photo-description',item.text));return card;
    }
    const card=el('article',`content-card kind-${kind}`);
    if(kind==='videos'){
      const cover=el(url?'a':'div','video-cover');if(url){cover.href=url;cover.target='_blank';cover.rel='noopener noreferrer';cover.setAttribute('aria-label',`打开视频：${item.title}`);}
      if(image)cover.append(imageNode(image,item.title));else cover.append(el('span','video-placeholder',url?'VIDEO':'视频封面位'));
      cover.append(el('span','play-symbol','▷'));card.append(cover);
    }else if(image)card.append(imageNode(image,item.title));
    const copy=el('div','card-copy');if(item.meta)copy.append(el('span','item-meta',item.meta));copy.append(el('h3','',item.title||'未命名内容'));if(item.text)copy.append(el('p','',item.text));
    if(kind==='workflow'&&Array.isArray(item.steps)&&item.steps.length){const steps=el('ol','flow-steps');item.steps.filter(x=>String(x).trim()).slice(0,100).forEach((s,i)=>{const step=el('li');step.append(el('small','',String(i+1).padStart(2,'0')),el('span','',s));steps.append(step);});copy.append(steps);}
    const actions=el('div','item-actions');if(url)actions.append(externalLink(url,kind==='videos'?'打开视频 ↗':'打开链接 ↗','item-link'));else if(kind==='links'||kind==='videos')actions.append(el('span','pending-link',kind==='videos'?'视频链接待添加':'链接待填写'));
    if(item.details){const button=el('button','read-detail','查看介绍 ＋');button.type='button';button.addEventListener('click',()=>showDetail(item));actions.append(button);}
    if(actions.childNodes.length)copy.append(actions);appendProofLinks(copy,item);card.append(copy);return card;
  }
  function render(){
    if(!draft.pages.some(p=>p.id===pageId))pageId=draft.pages[0]?.id||'home';
    const page=draft.pages.find(p=>p.id===pageId);if(!page)return;
    document.body.dataset.page=page.id;
    const previousPage=app.dataset.page;const previousScroll=scrollY;
    if(previousPage&&previousPage!==page.id&&dialog.open)dialog.close();
    app.dataset.page=page.id;app.replaceChildren();
    const bg=page.background||{};document.body.style.backgroundColor=/^#[0-9a-f]{3,8}$/i.test(bg.color||'')?bg.color:'#faf8ef';
    const bgImage=safeUrl(bg.image,true);const overlay=Math.max(0,Math.min(.8,Number(bg.overlay)||0));document.body.classList.toggle('has-background-image',Boolean(bgImage));
    const lowerOverlay=page.id==='contact'?Math.min(.8,overlay+.1):overlay;
    document.body.style.backgroundImage=bgImage?`linear-gradient(rgba(18,27,23,${overlay}),rgba(18,27,23,${lowerOverlay})),url(${JSON.stringify(bgImage)})`:'';
    document.title=`${draft.site?.name||'我的网站'} · ${page.name||'预览'}`;
    const header=el('header','draft-header');const logo=el('a','draft-logo','Elva✳');logo.href='#home';logo.setAttribute('aria-label','首页');logo.addEventListener('click',e=>{e.preventDefault();goToPage('home');});
    const nav=el('nav','page-nav');nav.setAttribute('aria-label','页面导航');draft.pages.slice(0,12).forEach(p=>{const button=el('button',p.id===page.id?'active':'',p.name||p.id);button.type='button';if(p.id===page.id)button.setAttribute('aria-current','page');button.addEventListener('click',()=>goToPage(p.id));nav.append(button);});
    header.append(logo,nav);app.append(header);
    const main=el('main','draft-main');
    if(page.id==='contact'&&typeof window.PortfolioUI?.contactScene==='function'){
      main.classList.add('contact-preview-main');
      main.append(window.PortfolioUI.contactScene(page,draft.site,{onHome:()=>goToPage('home'),onEdit:embedded?()=>send({type:'yewei-draft:select',sectionId:page.sections[0]?.id,pageId:page.id}):null}));app.append(main);
      if(!embedded){const edit=el('a','standalone-edit','返回可视化编辑器 ↗');edit.href='editor.html?page=contact';app.append(edit);}
      return;
    }
    const hero=el('div','page-intro');
    const portraitImage=page.id==='home'?safeUrl(page.portraitImage,true):'';
    const intro=portraitImage?el('div','home-intro-copy'):hero;
    if(page.id==='home'&&safeUrl(page.avatarImage,true)){
      const status=el('div','draft-home-avatar');status.append(imageNode(safeUrl(page.avatarImage,true),'Elva AI 插画头像'),el('span','','个人空间'));intro.append(status);
    }
    const introTitle=el('h1','',page.title||page.name);
    if(page.id==='home'){
      const [name,...motto]=(page.title||page.name).split('\n');introTitle.replaceChildren(el('span','hero-name',name));if(motto.length)introTitle.append(el('span','hero-motto',motto.join('\n')));
    }
    const chapterNumber=page.id==='home'?0:draft.pages.filter(p=>p.id!=='home').indexOf(page)+1;
    intro.append(el('span','page-eyebrow',`${String(chapterNumber).padStart(2,'0')} / ${page.name||page.id}`),introTitle,el('p','page-subtitle',page.subtitle||''));
    if(portraitImage){
      hero.classList.add('home-intro');hero.append(intro);
      const hanging=el('figure','home-hanging-photo');
      const rope=el('span','home-photo-rope');rope.setAttribute('aria-hidden','true');
      const clip=el('span','home-photo-clip');clip.setAttribute('aria-hidden','true');
      const card=el('div','home-hanging-card');
      const hole=el('span','home-photo-hole');hole.setAttribute('aria-hidden','true');
      const image=el('img');image.src=portraitImage;image.alt=`${draft.site?.name||'我'}的个人照片`;image.decoding='async';
      const caption=el('div','home-photo-caption');caption.append(el('strong','',draft.site?.name||'我'),el('span','','PERSONAL SPACE'),el('i','','✿'));
      card.append(hole,image,caption);hanging.append(rope,clip,card);hero.append(hanging);
    }
    main.append(hero);
    (page.sections||[]).slice(0,100).forEach((section,index)=>{
      const sharedPortfolio=page.id==='capability'&&typeof window.PortfolioUI?.portfolioSection==='function';
      const sharedEducation=page.id==='education'&&typeof window.PortfolioUI?.educationSection==='function';
      const sharedLife=page.id==='life'&&typeof window.PortfolioUI?.lifeSection==='function';
      const sharedCapability=!sharedPortfolio&&section.kind==='capability'&&typeof window.PortfolioUI?.capability==='function';
      const block=sharedPortfolio?window.PortfolioUI.portfolioSection(section,index):sharedCapability?window.PortfolioUI.capability(section):el('section');
      block.classList.add('draft-section',`block-${section.kind||'text'}`);block.dataset.sectionId=section.id;block.id=section.id;
      if(embedded){
        const select=()=>send({type:'yewei-draft:select',sectionId:section.id,pageId:page.id});
        const edit=el('button','edit-section','编辑此板块');edit.type='button';edit.addEventListener('click',event=>{event.stopPropagation();select();});
        const summary=sharedCapability?block.querySelector('summary'):null;
        if(summary)summary.append(edit);else block.append(edit);
        block.addEventListener('click',event=>{
          const anchor=event.target instanceof Element?event.target.closest('a'):null;
          if(anchor?.getAttribute('href')?.startsWith('editor.html'))event.preventDefault();
          select();
        });
      }
      if(!sharedCapability&&!sharedPortfolio){
        const heading=el('div','block-heading');heading.append(el('span','block-number',String(index+1).padStart(2,'0')),el('h2','',section.title||'新板块'));block.append(heading);if(section.subtitle)block.append(el('p','block-subtitle',section.subtitle));
        if(sharedEducation)block.append(window.PortfolioUI.educationSection(section));
        else if(sharedLife)block.append(window.PortfolioUI.lifeSection(section));
        else if(page.id==='contact'&&section.kind==='links'&&typeof window.PortfolioUI?.contacts==='function')block.append(window.PortfolioUI.contacts(section,draft.site));
        else{
          const items=el('div',`block-items ${section.kind||'text'}-items`);(section.items||[]).slice(0,500).forEach((item,i)=>items.append(renderItem(item,section.kind,i)));if(!items.childNodes.length)items.append(el('p','empty-block','这里还没有内容，可以在编辑面板添加。'));block.append(items);
        }
      }
      main.append(block);
    });app.append(main);
    const footer=el('footer','draft-footer');const info=el('div');info.append(el('strong','',draft.site?.name||'我的网站'),el('p','',draft.site?.tagline||''));const contact=el('div','footer-contact');
    const email=String(draft.site?.email||'').replace(/[\r\n]/g,'');if(email){const a=el('a','',email+' ↗');a.href='mailto:'+encodeURIComponent(email);contact.append(a);}if(draft.site?.wechat)contact.append(el('span','','微信 / '+draft.site.wechat));footer.append(info,contact);if(bg.image==='assets/meadow.jpg')footer.append(el('small','background-credit','装饰背景：Adrien Olichon / Unsplash'));app.append(footer);
    if(!embedded){const edit=el('a','standalone-edit','返回可视化编辑器 ↗');edit.href='editor.html';app.append(edit);}
    if(dialog.open&&activeDetailId){const updated=(page.sections||[]).flatMap(s=>s.items||[]).find(i=>i.id===activeDetailId);if(updated)showDetail(updated,activeDetailPhoto);else dialog.close();}
    if(previousPage===page.id&&previousScroll)requestAnimationFrame(()=>scrollTo({top:previousScroll,behavior:'instant'}));
  }
  if(embedded){addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==parent)return;const message=event.data;if(message?.type!=='yewei-draft:update'||message.draft?.schemaVersion!==1||!Array.isArray(message.draft.pages))return;draft=migratePhotos(message.draft);if(message.pageId)pageId=message.pageId;render();});}
  else addEventListener('storage',event=>{if(event.key!==STORAGE_KEY)return;try{const next=readCachedDraft(event.newValue);if(next){draft=next;render();}}catch{}});
  render();send({type:'yewei-draft:ready'});
})();

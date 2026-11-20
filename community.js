const labels={designer:"赛霸设计师",judge:"大赛评委"};
const dateFormat=new Intl.DateTimeFormat("zh-CN",{year:"numeric",month:"short",day:"numeric",timeZone:"Asia/Shanghai"});
const dateKey=new Intl.DateTimeFormat("sv-SE",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Asia/Shanghai"});
const categories=["作品分享","参赛心得","评审观察"];
const sharePageVersion="current";

function node(tag,text,className) {
  const result=document.createElement(tag);
  if(text) result.textContent=text;
  if(className) result.className=className;
  return result;
}
function link(text,href,className="text-action") {
  const anchor=node("a",text,className);
  anchor.href=href;
  return anchor;
}
function button(label,className="member-secondary") {
  const item=node("button",label,className);
  item.type="button";
  return item;
}
function status() {
  const item=node("p",null,"community-status");
  item.setAttribute("role","status");
  return item;
}
function interact(control,message,action,event="click") {
  control.addEventListener(event,async response=>{
    response.preventDefault();
    const submit=event==="submit" ? control.querySelector('button[type="submit"]') : control;
    if(submit.disabled) return;
    submit.disabled=true;
    message.textContent="";
    try { await action(); }
    catch(error) { message.textContent=error.message || "操作暂不可用，请稍后重试。"; }
    finally { submit.disabled=false; }
  });
}
function formControl(form,description,opts={}) {
  const label=node("label",description);
  const field=node(opts.options ? "select" : opts.multiline ? "textarea" : "input");
  field.name=opts.name;
  if(opts.options) for(const option of opts.options) field.add(new Option(option,option));
  if(opts.type) field.type=opts.type;
  if(opts.value) field.value=opts.value;
  if(opts.accept) field.accept=opts.accept;
  if(opts.limit) field.maxLength=opts.limit;
  if(opts.required) field.required=true;
  if(opts.multiline) field.rows=opts.rows || 4;
  label.append(field);
  form.append(label);
  return field;
}
function submitButton(form,label) {
  const control=button(label,"primary");
  control.type="submit";
  form.append(control);
  return control;
}
function sectionTitle(target,title,subtitle) {
  const header=node("div",null,"section-title");
  header.append(node("h1",title));
  if(subtitle) header.append(node("p",subtitle));
  target.append(header);
}
function badge({kind,label}) {
  return node("span",(kind==="official" ? "" : kind==="judge" ? "◇ " : "✦ ")+label,"community-badge "+kind);
}
function imageHref(file) {
  if(!file || !["image/jpeg","image/png","image/webp"].includes(file.mime)) return "";
  return "data:"+file.mime+";base64,"+file.data;
}
function avatar(person) {
  const href=imageHref(person.avatar);
  if(!href) return node("span",person.name?.slice(0,1) || "É","community-avatar avatar-initial");
  const img=node("img",null,"community-avatar");
  img.alt="";
  img.src=href;
  return img;
}
function authorLine(person,showImage=true) {
  const row=node("div",null,"community-author");
  if(showImage) row.append(avatar(person));
  row.append(node("strong",person.name || "ÉLAN 会员"));
  for(const mark of person.badges || []) row.append(badge(mark));
  return row;
}
function dataFile(blob) {
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve({data:String(reader.result).split(",")[1]});
    reader.onerror=()=>reject(new Error("无法读取文件。"));
    reader.readAsDataURL(blob);
  });
}
async function upload(file,{side=1200,cap=200000,pdf=false}={}) {
  if(!file?.size) return null;
  if(pdf && (file.type==="application/pdf" || /\.pdf$/i.test(file.name))) {
    if(file.size>cap) throw new Error("PDF 最大为 300 KB，请压缩后提交。");
    return dataFile(file);
  }
  if(file.size>20_000_000) throw new Error("原图超过 20 MB，请先缩小。");
  const src=URL.createObjectURL(file);
  const img=new Image();
  try {
    img.src=src;
    await img.decode();
    const canvas=document.createElement("canvas");
    const ctx=canvas.getContext("2d",{alpha:false});
    let scale=Math.min(1,side/Math.max(img.width,img.height));
    for(let step=0;step<5;step++){
      canvas.width=Math.max(1,Math.round(img.width*scale));
      canvas.height=Math.max(1,Math.round(img.height*scale));
      ctx.fillStyle="#fff";
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(img,0,0,canvas.width,canvas.height);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",.82-step*.07));
      if(blob?.size<=cap) return dataFile(blob);
      scale*=.72;
    }
    throw new Error("图片压缩后仍过大。");
  } catch(error) {
    throw new Error(error.name==="EncodingError" ? "请选择可读取的 JPG、PNG 或 WebP 图片。" : error.message);
  } finally { URL.revokeObjectURL(src); }
}

export function favoriteControl(request,kind,id,signedIn=true) {
  if (!signedIn) {
    const key = "elan-favorite:" + kind + ":" + id;
    const control = button("收藏", "member-secondary");
    function show(saved) {
      control.textContent = saved ? "已收藏 · 取消" : "收藏";
      control.setAttribute("aria-pressed", String(saved));
    }
    try { show(localStorage.getItem(key) === "1"); } catch { show(false); }
    control.title = "保存在此设备";
    control.onclick = () => {
      const saved = control.getAttribute("aria-pressed") !== "true";
      try {
        if (saved) localStorage.setItem(key, "1"); else localStorage.removeItem(key);
        show(saved);
      } catch { control.textContent = "此浏览器无法保存收藏"; }
    };
    return control;
  }
  const wrapper=node("div",null,"favorite-control");
  const control=button("收藏","member-secondary");
  const message=status();
  wrapper.append(control,message);
  let saved=false;
  function update(result) {
    saved=result.saved;
    control.textContent=saved ? "已收藏 · 取消" : "收藏";
    control.setAttribute("aria-pressed",String(saved));
  }
  control.disabled=true;
  request({memberAction:"communityFavorite",kind,id}).then(update,()=>{ message.textContent="暂时无法读取收藏状态。"; })
    .finally(()=>{control.disabled=false;});
  interact(control,message,async()=>update(await request({memberAction:"communityFavorite",kind,id,saved:!saved})));
  return wrapper;
}

export function publicDetailHref(section, slug) {
  return `/${section}/${slug}/?v=${sharePageVersion}`;
}

export function shareControl(title,href,{openSharePage=false}={}) {
  const wrapper=node("div",null,"favorite-control");
  const control=button("分享");
  const message=status();
  wrapper.append(control,message);
  interact(control,message,async()=>{
    const destination=new URL(href,location.origin);
    const url=destination.href;
    if(typeof navigator.share==="function") {
      const wechatHint = openSharePage && /MicroMessenger/i.test(navigator.userAgent)
        ? "若未发到朋友圈，请点微信右上角「···」→「在浏览器打开」，再点「分享」。" : "";
      try {
        await navigator.share({title,url});
        message.textContent=wechatHint;
        return;
      } catch(error) {
        if(error.name==="AbortError") {
          message.textContent=wechatHint;
          return;
        }
      }
    }
    if(openSharePage) {
      destination.searchParams.set("share","1");
      location.assign(destination.href);
      return;
    }
    if(navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(url);
        message.textContent="链接已复制。";
        return;
      } catch { /* Present a selectable link if clipboard access is unavailable. */ }
    }
    const field=node("input");
    field.readOnly=true;
    field.value=url;
    field.setAttribute("aria-label","分享链接");
    message.replaceChildren(field);
    field.select();
  });
  return wrapper;
}

function certificationCard(request,kind,existing,reload) {
  const box=node("details",null,"community-cert");
  const name=labels[kind];
  const states={pending:"待人工审核",approved:"审核通过",rejected:"未通过"};
  box.append(node("summary",name+"认证 · "+(states[existing?.state] || "提交申请")));
  if(existing) {
    box.append(node("p",existing.competition+" · "+existing.year));
    if(existing.state==="approved") box.append(badge({kind,label:name}));
    if(existing.reviewNote) box.append(node("p",existing.reviewNote,"community-meta"));
    if(existing.state!=="rejected") return box;
  }
  const rule=kind==="designer" ? "提交中国服装设计师协会举办的设计大赛获奖证明。"
    : "提交服装设计大赛的评委证或评委聘书。";
  box.append(node("p",rule+" 证明附件仅管理员可见。","community-meta"));
  const form=node("form",null,"community-form");
  formControl(form,"证书姓名",{name:"applicant",required:true,limit:50,value:existing?.applicant});
  formControl(form,"大赛名称",{name:"competition",required:true,limit:110,value:existing?.competition});
  const year=formControl(form,"赛事年份",{name:"year",required:true,limit:4,value:existing?.year});
  year.inputMode="numeric";
  year.pattern="[0-9]{4}";
  formControl(form,kind==="judge" ? "担任的评审职务" : "获奖奖项及作品",{name:"achievement",required:true,limit:140,value:existing?.achievement});
  formControl(form,"赛事或名单链接（可选）",{name:"source",type:"url",limit:500,value:existing?.source});
  const proof=formControl(form,"证明附件（图片或不超过 300 KB 的 PDF）",{name:"proof",type:"file",accept:"image/jpeg,image/png,image/webp,application/pdf",required:true});
  submitButton(form,"提交审核");
  const message=status();
  form.append(message);
  box.append(form);
  interact(form,message,async()=>{
    const values=new FormData(form);
    await request({memberAction:"communityApply",kind,applicant:values.get("applicant"),competition:values.get("competition"),
      year:values.get("year"),achievement:values.get("achievement"),source:values.get("source"),
      proof:await upload(proof.files[0],{side:1450,cap:300000,pdf:true})});
    await reload();
  },"submit");
  return box;
}
export async function renderProfile(target,request,logout) {
  target.classList.add("community-page");
  sectionTitle(target,"个人中心");
  const body=node("div",null,"community-account");
  const message=status();
  body.append(message);
  target.append(body);
  async function load() {
    const model=await request({memberAction:"communityAccount"});
    if(!target.isConnected) return;
    const approved=model.applications.filter(item=>item.state==="approved").map(item=>({kind:item.kind,label:labels[item.kind]}));
    const header=node("div",null,"community-account-head");
    const who=authorLine({...model.profile,badges:approved});
    const signout=button("退出登录");
    const actions=node("div",null,"community-actions");
    if(model.admin===true) actions.append(link("会员与认证审核","/?panel=admin"));
    if(!model.premium) actions.append(link(model.premiumPending ? "高级会员待审核" : "申请高级会员","#upgrade"));
    actions.append(signout);
    signout.onclick=()=>void logout();
    header.append(who,actions);
    const main=node("div",null,"community-profile-grid");
    const profile=node("section",null,"community-panel");
    profile.append(node("h2","个人资料"),node("p",model.email+" · "+(model.premium ? "高级会员" : "普通会员"),"community-meta"));
    const edit=node("form",null,"community-form");
    formControl(edit,"昵称",{name:"name",required:true,limit:32,value:model.profile.name});
    formControl(edit,"简介",{name:"bio",multiline:true,rows:3,limit:180,value:model.profile.bio});
    const portrait=formControl(edit,"更换头像",{name:"avatar",type:"file",accept:"image/jpeg,image/png,image/webp"});
    if(model.profile.avatar) formControl(edit,"移除现有头像",{name:"removeAvatar",type:"checkbox"});
    submitButton(edit,"保存资料");
    const feedback=status();
    edit.append(feedback);
    profile.append(edit);
    interact(edit,feedback,async()=>{
      const values=new FormData(edit);
      await request({memberAction:"communityProfile",name:values.get("name"),bio:values.get("bio"),
        avatar:await upload(portrait.files[0],{side:224,cap:36000}),removeAvatar:values.has("removeAvatar") && !portrait.files.length});
      await load();
    },"submit");
    const shelf=node("section",null,"community-panel");
    shelf.append(node("h2","我的收藏"));
    for(const [kind,title] of [["runway","秀场"],["trend","趋势文章"],["contest","服装设计大赛"],["post","设计广场"]]){
      const records=model.favorites.filter(item=>item.kind===kind);
      shelf.append(node("h3",title,"community-shelf-label"));
      if(!records.length) shelf.append(node("p","暂无收藏。","community-meta"));
      for(const item of records){
        const row=node("div",null,"community-favorite");
        const caption=node("div");
        caption.append(link(item.title,item.href),node("p",item.subtitle,"community-meta"));
        const remove=button("取消收藏","text-action");
        row.append(caption,remove);
        interact(remove,feedback,async()=>{
          await request({memberAction:"communityFavorite",kind,id:item.id,saved:false});
          await load();
        });
        shelf.append(row);
      }
    }
    const certifications=node("section",null,"community-panel community-certifications");
    certifications.append(node("h2","身份认证"),node("p","提交证明后，由 ÉLAN 管理员人工核验。通过后，金标会显示在设计广场和评论中。","community-meta"));
    for(const kind of ["designer","judge"]) certifications.append(certificationCard(request,kind,
      model.applications.find(item=>item.kind===kind),load));
    main.append(profile,shelf,certifications);
    body.replaceChildren(header,main);
  }
  message.textContent="正在读取个人资料…";
  try { await load(); } catch(error) { message.textContent=error.message; }
}

let guestCapability;
async function enableGuestWriting(request, placeholder, form) {
  guestCapability ??= request({memberAction:"guestCommunityCapabilities"})
    .then(result => result.writing === true).catch(() => false);
  if (await guestCapability && placeholder.isConnected) placeholder.replaceWith(form);
}

function thread(request,target,state,signedIn) {
  const wrapper=node("div",null,"community-thread");
  const bar=node("div",null,"community-actions");
  const like=button("点赞","member-secondary");
  const expand=button("评论","member-secondary");
  const message=status();
  const replies=node("div",null,"community-replies");
  replies.hidden=true;
  bar.append(like,expand);
  wrapper.append(bar,replies,message);
  function update(value) {
    Object.assign(state,value);
    like.textContent=(state.liked ? "已赞 " : "点赞 ")+state.likes;
    like.setAttribute("aria-pressed",String(state.liked));
    expand.textContent=(replies.hidden ? "评论 " : "收起评论 ")+state.total;
    expand.setAttribute("aria-expanded",String(!replies.hidden));
  }
  update(state);
  const list=node("div",null,"community-comment-list");
  const more=button("查看更多评论","text-action");
  more.hidden=true;
  {
    const form=node("form",null,"community-form community-comment-form");
    const field=formControl(form,"写评论",{name:"text",multiline:true,rows:2,required:true,limit:600});
    submitButton(form,"发布评论");
    let commentId=crypto.randomUUID();
    interact(form,message,async()=>{
      await request({memberAction:"communityComment",target,text:field.value,id:commentId});
      field.value="";
      commentId=crypto.randomUUID();
      await fill();
    },"submit");
    if (signedIn) replies.append(form);
    else {
      const login = link("登录后评论", "#login", "member-secondary");
      replies.append(login);
      void enableGuestWriting(request, login, form);
    }
  }
  replies.append(list,more);
  let next=null;
  async function fill(offset=0) {
    const result=await request({memberAction:"communityThread",target,offset});
    if(!offset) list.replaceChildren();
    for(const item of result.comments) {
      const article=node("article",null,"community-comment");
      article.append(authorLine(item.author,false),node("span",dateFormat.format(item.createdAt),"community-meta"),
        node("p",item.text,"community-copy"));
      list.append(article);
    }
    if(!offset && !result.comments.length) list.append(node("p","还没有评论。","community-meta"));
    next=result.next;
    more.hidden=next===null;
    update(result);
  }
  interact(like,message,async()=>update(await request({memberAction:"communityLike",target,liked:!state.liked})));
  interact(expand,message,async()=>{
    if(!replies.hidden) replies.hidden=true;
    else {
      await fill();
      replies.hidden=false;
    }
    update(state);
  });
  interact(more,message,async()=>{if(next!==null) await fill(next);});
  return wrapper;
}
export async function mountTrendDiscussion(output,request,slug,signedIn) {
  try {
    const target="trend:"+slug;
    const state=await request({memberAction:"communityThread",target});
    if(output.isConnected) output.append(thread(request,target,state,signedIn));
  } catch {
    if(output.isConnected) output.append(node("p","评论暂时无法读取。","community-meta"));
  }
}

function contestStatus(item,today) {
  return item.kind==="award" ? "获奖公示" : item.deadline<today ? "已截止" : "征稿中";
}
function contestListHref(kind) {
  return kind==="award" ? "#contests?tab=award" : "#contests";
}
function contestDate(item) {
  const time=node("time",item.deadline || item.date);
  time.dateTime=item.deadline || item.date;
  return time;
}

function renderContestDetail(target,request,item,signedIn,today) {
  const recruit=item.kind==="recruit";
  const article=node("article",null,"contest-feature");
  const header=node("header",null,"contest-feature-header");
  header.append(node("p",contestStatus(item,today)+" · "+item.category,"eyebrow"),node("h1",item.title));
  const content=node("div",null,"contest-feature-layout");
  const copy=node("div",null,"contest-feature-copy");
  copy.append(node("h2",recruit ? "赛事概览" : "结果概览"),node("p",item.summary,"contest-feature-lead"));
  for(const detail of item.details || []) {
    const section=node("section");
    section.append(node("h2",detail.title),...detail.text.split("\n").map(paragraph=>node("p",paragraph)));
    copy.append(section);
  }
  const facts=node("dl",null,"contest-facts");
  for(const [label,value] of [["主办方",item.organizer],[recruit?"截稿日期":"结果日期",contestDate(item)],["设计类别",item.category]]) {
    const row=node("div");
    const description=node("dd",typeof value==="string" ? value : "");
    if(typeof value!=="string") description.append(value);
    row.append(node("dt",label),description);
    facts.append(row);
  }
  const source=node("footer",null,"contest-source");
  source.append(node("h2",recruit ? "报名与原公告" : "结果来源与作品"));
  for(const reference of [item.source,...(item.references || [])]) {
    if(typeof reference?.url!=="string" || !reference.url.startsWith("https://")) continue;
    const original=link(reference.title+" ↗",reference.url);
    original.target="_blank";
    original.rel="noreferrer";
    source.append(original);
  }
  const tools=node("div",null,"community-actions contest-detail-actions");
  tools.append(favoriteControl(request,"contest",item.id,signedIn),
    shareControl(item.title,publicDetailHref("contests",item.id),{openSharePage:true}));
  const discussion=node("section",null,"contest-discussion");
  discussion.setAttribute("aria-label","赛事评论");
  copy.append(source,tools,discussion);
  const aside=node("aside");
  const image=node("img");
  image.src=`/contests/${item.id}/cover.jpg`;
  image.alt=item.title+" · ÉLAN 赛事分享封面";
  image.width=640;
  image.height=640;
  image.style.cssText="display:block;width:min(100%,300px);height:auto;margin-bottom:1rem";
  aside.append(image,facts);
  content.append(aside,copy);
  article.append(header,content);
  target.replaceChildren(link("← 返回赛事目录",contestListHref(item.kind),"reader-back"),article);
  request({memberAction:"communityContestEngagement",ids:[item.id]}).then(({items})=>{
    if(discussion.isConnected && items[item.id]) discussion.append(thread(request,"contest:"+item.id,items[item.id],signedIn));
  },()=>{
    if(discussion.isConnected) discussion.append(node("p","评论与点赞暂时无法读取。","community-meta"));
  });
}

export async function renderContests(target,request,loadContests,signedIn,selected) {
  target.classList.add("community-page","contest-page");
  const message=status();
  message.textContent="正在读取赛事…";
  target.append(message);
  try {
    const {items,canonical}=await loadContests();
    if(!target.isConnected) return;
    const today=dateKey.format(new Date());
    message.remove();
    if(selected) {
      const item=items.find(item=>item.id===selected);
      if(item && canonical && location.pathname!==`/contests/${item.id}/`) {
        location.replace(publicDetailHref("contests",item.id));
      } else if(item) renderContestDetail(target,request,item,signedIn,today);
      else target.append(link("← 返回赛事目录","#contests","reader-back"),node("p","该赛事暂不可用。","notice"));
      return;
    }
    sectionTitle(target,"服装设计大赛","浏览国内外赛事征稿、截稿时间与获奖公示。");
    const filters=[["recruit","征稿"],["award","获奖"]];
    const toolbar=node("div",null,"contest-toolbar");
    const tabs=node("div",null,"pills");
    tabs.setAttribute("aria-label","赛事类型");
    const search=node("input",null,"contest-search");
    search.type="search";
    search.placeholder="搜索赛事、类别或主办方";
    search.setAttribute("aria-label","搜索赛事");
    toolbar.append(tabs,search);
    const list=node("div",null,"community-contest-list");
    const more=button("查看更多赛事");
    target.append(toolbar,list,more);
    const params=new URLSearchParams(location.hash.split("?")[1]);
    let selection=params.get("tab")==="award" ? "award" : "recruit";
    let visible=12;
    const controls=filters.map(([kind,label])=>{
      const control=button(label+" · "+items.filter(item=>item.kind===kind).length,"");
      control.onclick=()=>{
        selection=kind;
        visible=12;
        history.replaceState(null,"",location.pathname+location.search+contestListHref(kind));
        paint();
      };
      tabs.append(control);
      return control;
    });
    function paint() {
      const term=search.value.trim().toLowerCase();
      for(const [i,[kind]] of filters.entries()) controls[i].setAttribute("aria-pressed",String(kind===selection));
      const rows=items.filter(item=>item.kind===selection && [item.title,item.category,item.organizer].join(" ").toLowerCase().includes(term))
        .sort((a,b)=>selection==="award" ? b.date.localeCompare(a.date) :
          Number(a.deadline<today)-Number(b.deadline<today) || a.deadline.localeCompare(b.deadline));
      list.replaceChildren();
      for(const item of rows.slice(0,visible)) {
        const card=node("article",null,"contest-card");
        const open=link("",canonical ? publicDetailHref("contests",item.id) : "#contests/"+item.id,"contest-card-link");
        open.setAttribute("aria-labelledby","contest-"+item.id);
        const heading=node("h2",item.title);
        heading.id="contest-"+item.id;
        const meta=node("p",null,"community-meta");
        meta.append(item.organizer," · ",item.deadline?"截止 ":"",contestDate(item));
        const action=node("span",item.kind==="recruit"?"查看征稿 →":"查看获奖 →","contest-card-action");
        action.setAttribute("aria-hidden","true");
        open.append(node("p",contestStatus(item,today)+" · "+item.category,"eyebrow"),heading,meta,
          node("p",item.summary,"contest-card-copy"),action);
        card.append(open);
        list.append(card);
      }
      if(!rows.length) list.append(node("p","暂无相关赛事。","notice"));
      more.hidden=rows.length<=visible;
    }
    search.oninput=()=>{visible=12;paint();};
    more.onclick=()=>{visible+=12;paint();};
    paint();
  } catch(error) {
    message.textContent=error.message;
    const retry=button("重新加载");
    retry.onclick=()=>{target.replaceChildren();void renderContests(target,request,loadContests,signedIn,selected);};
    target.append(retry);
  }
}

export async function renderSquare(target,request,signedIn,selected) {
  target.classList.add("community-page");
  sectionTitle(target,"设计广场","分享原创设计、参赛心得和评审观察。");
  const composer=node("details",null,"community-panel community-composer");
  composer.append(node("summary","发布帖子"));
  const form=node("form",null,"community-form");
  const title=formControl(form,"标题",{name:"title",limit:90,required:true});
  const category=formControl(form,"分类",{name:"category",options:categories});
  const copy=formControl(form,"正文",{name:"content",multiline:true,limit:3500,required:true});
  const image=formControl(form,"作品图（可选）",{name:"image",type:"file",accept:"image/jpeg,image/png,image/webp"});
  submitButton(form,"发布");
  const formMessage=status();
  form.append(formMessage);
  composer.append(form);
  const list=node("div",null,"community-post-list");
  const more=button("加载更多帖子");
  const message=status();
  more.hidden=true;
  if(selected) target.append(link("← 返回设计广场","#square"));
  else if (signedIn) target.append(composer);
  else {
    const login = link("登录后发布作品", "#login", "member-secondary");
    target.append(login);
    void enableGuestWriting(request, login, composer);
  }
  target.append(list,more,message);
  let offset=0;
  async function load(reset=false) {
    if(reset) offset=0;
    const {items,next}=await request({memberAction:"communityPosts",offset,id:selected || undefined});
    if(!target.isConnected) return;
    if(reset) list.replaceChildren();
    if(!items.length && !list.childElementCount) list.append(node("p","还没有帖子。","notice"));
    offset=next;
    for(const item of items) {
      if(document.getElementById("board-"+item.id)) continue;
      const card=node("article",null,"community-panel square-card"+(item.official ? " official-post" : ""));
      card.id="board-"+item.id;
      card.append(node("p",(item.official ? "置顶 · " : "")+item.category+" · "+dateFormat.format(item.createdAt),"eyebrow"),
        node("h2",item.title),authorLine(item.author),node("p",item.content,"community-copy"));
      if(item.hasImage) {
        const loadImage=button("查看作品图","text-action");
        const failure=status();
        card.append(loadImage,failure);
        interact(loadImage,failure,async()=>{
          const {file}=await request({memberAction:"communityPostImage",id:item.id});
          const graphic=node("img",null,"square-image");
          graphic.src=imageHref(file);
          graphic.alt=item.title+"的作品图";
          loadImage.replaceWith(graphic);
        });
      }
      const actions=node("div",null,"community-actions");
      actions.append(favoriteControl(request,"post",item.id,signedIn),shareControl(item.title,"/#square/"+item.id));
      card.append(actions,thread(request,"post:"+item.id,item.engagement,signedIn));
      if(item.canRemove) {
        const remove=button("移除帖子","text-action");
        const result=status();
        card.append(remove,result);
        interact(remove,result,async()=>{
          if(!window.confirm("移除这篇帖子？")) return;
          await request({memberAction:"communityPostRemove",id:item.id});
          card.remove();
          if(!list.childElementCount) list.append(node("p","还没有帖子。","notice"));
        });
      }
      list.append(card);
    }
    more.hidden=next===null;
  }
  let draftId=crypto.randomUUID();
  interact(form,formMessage,async()=>{
    await request({memberAction:"communityPost",id:draftId,title:title.value,category:category.value,content:copy.value,
      image:await upload(image.files[0])});
    form.reset();
    draftId=crypto.randomUUID();
    composer.open=false;
    await load(true);
  },"submit");
  interact(more,message,async()=>{if(offset!==null) await load();});
  message.textContent="正在读取设计广场…";
  try { await load(true); message.textContent=""; } catch(error) { message.textContent=error.message; }
}

function proofLink(file) {
  const types={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","application/pdf":"pdf"};
  const ext=types[file.mime];
  if(!ext) return node("p","附件格式无效。");
  const bytes=Uint8Array.from(atob(file.data),code=>code.charCodeAt(0));
  const url=URL.createObjectURL(new Blob([bytes],{type:file.mime}));
  const output=node("div",null,"community-proof");
  const download=link("下载证明",url);
  download.download="ÉLAN-认证证明."+ext;
  output.append(download);
  if(ext!=="pdf") {
    const preview=node("img");
    preview.src=url;
    preview.alt="认证证明";
    output.append(preview);
  }
  window.addEventListener("pagehide",()=>URL.revokeObjectURL(url),{once:true});
  return output;
}
export async function renderReviewQueue(target,request) {
  const title=node("h2","金标认证审核");
  const statuses=node("select");
  for(const [id,label] of [["pending","待审核"],["approved","已通过"],["rejected","未通过"]]) statuses.add(new Option(label,id));
  statuses.setAttribute("aria-label","认证审核状态");
  const list=node("div",null,"community-review-list");
  const message=status();
  target.append(title,statuses,list,message);
  async function load() {
    const selection=statuses.value;
    const {items}=await request({memberAction:"communityReviewQueue",status:selection});
    if(statuses.value!==selection || !target.isConnected) return;
    list.replaceChildren();
    if(!items.length) list.append(node("p","暂无申请。","community-meta"));
    for(const item of items) {
      const card=node("article",null,"community-panel community-review");
      card.append(node("p",labels[item.kind],"eyebrow"),node("h3",item.applicant+" · "+item.competition),
        node("p",item.email+" · "+item.year,"community-meta"),node("p",item.achievement,"community-copy"));
      if(item.reviewNote) card.append(node("p",item.reviewNote,"community-meta"));
      if(item.source){
        const source=link("核对赛事来源 ↗",item.source);
        source.target="_blank";
        source.rel="noreferrer";
        card.append(source);
      }
      const proof=button("查看证明");
      const result=status();
      card.append(proof,result);
      interact(proof,result,async()=>{
        const reply=await request({memberAction:"communityProof",key:item.key});
        proof.replaceWith(proofLink(reply.file));
      });
      if(item.state==="pending"){
        const actions=node("div",null,"community-actions");
        const note=node("textarea");
        note.maxLength=500;
        note.placeholder="审核意见（申请人可见）";
        note.setAttribute("aria-label","审核意见");
        const approve=button("通过认证","primary");
        const deny=button("退回申请");
        actions.append(approve,deny);
        card.append(note,actions);
        for(const [control,decision] of [[approve,"approved"],[deny,"rejected"]]){
          interact(control,result,async()=>{
            await request({memberAction:"communityReview",key:item.key,submittedAt:item.submittedAt,decision,note:note.value});
            await load();
          });
        }
      }
      list.append(card);
    }
    message.textContent="";
  }
  statuses.onchange=()=>void load().catch(error=>{message.textContent=error.message;});
  try { await load(); } catch(error) { message.textContent=error.message; }
}

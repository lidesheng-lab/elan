import { attachDownload } from "./download.js?v=2";
import { shareControl } from "/community.js";

const element = (tag, text, className) => {
  const el = document.createElement(tag);
  if (text) el.textContent = text;
  if (className) el.className = className;
  return el;
};
function link(href, label, cls) {
  const a = element("a", label, cls);
  a.href = href;
  return a;
}
function picture(src, alt, lazy = true) {
  const img = element("img");
  img.alt = alt;
  img.loading = lazy ? "lazy" : "eager";
  img.decoding = "async";
  img.referrerPolicy = "no-referrer";
  img.src = src;
  return img;
}
function runwaySeason(label) {
  const match = label.match(/(20\d{2})(?:\/(?:20)?\d{2})?\s*(春夏|秋冬)/);
  return match ? match[1] + " " + match[2] : "";
}
const indexStateKey = "elanRunwayIndex";
function readIndexState() {
  let saved = history.state?.[indexStateKey];
  try { saved ??= JSON.parse(sessionStorage.getItem(indexStateKey)); } catch {}
  return {
    search: typeof saved?.search === "string" ? saved.search : "",
    year: typeof saved?.year === "string" ? saved.year : "current",
    limit: Number.isSafeInteger(saved?.limit) && saved.limit >= 24 ? saved.limit : 24,
    scroll: Number.isFinite(saved?.scroll) && saved.scroll > 0 ? saved.scroll : 0,
  };
}
function brandAnchor([label, url]) {
  const anchor = link(url, label, "text-action");
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  return anchor;
}
function showIndex(target, shows, email) {
  let listState = readIndexState();
  function saveIndexState() {
    try { sessionStorage.setItem(indexStateKey, JSON.stringify(listState)); } catch {}
    try { history.replaceState({...history.state, [indexStateKey]:listState}, ""); } catch {}
  }
  const heading = element("h1","品牌索引");
  const search = element("input");
  search.type = "search";
  search.placeholder = "搜索品牌或系列";
  search.setAttribute("aria-label", search.placeholder);
  search.value = listState.search;
  const year = element("select");
  year.setAttribute("aria-label","系列年份");
  const seasons = [...new Set(shows.map(show => runwaySeason(show.season)).filter(Boolean))];
  const rank = season => Number(season.slice(0, 4)) * 2 + Number(season.endsWith("秋冬"));
  const latest = seasons.sort((a,b) => rank(b) - rank(a))[0];
  if (latest) year.add(new Option("当季 · " + latest, "current"));
  year.add(new Option("全部年份",""));
  const years = shows.map(show => show.season.match(/20\d{2}/)?.[0]).filter(Boolean);
  for (const value of [...new Set(years)].sort().reverse()) year.add(new Option(value,value));
  year.value = !latest && listState.year === "current" ? "" : listState.year;
  const toolbar = element("div",null,"show-filters");
  toolbar.append(search,year);
  const historyKey = "elanRunwaySearches:" + (email || "").trim().toLowerCase();
  let recent = [];
  function readRecent() {
    try {
      const saved = JSON.parse(localStorage.getItem(historyKey) || "[]");
      if (Array.isArray(saved)) recent = saved.filter(term => typeof term === "string" && term.trim()).slice(0, 20);
    } catch {}
  }
  const records = element("details");
  const summary = element("summary", "最近搜索");
  const choices = element("div", null, "show-filters");
  records.append(summary, choices);
  function rememberSearch() {
    const term = search.value.trim();
    if (!term) return;
    readRecent();
    const key = term.normalize("NFKC").toLowerCase();
    recent = [term, ...recent.filter(old => old.normalize("NFKC").toLowerCase() !== key)].slice(0, 20);
    records.hidden = false;
    try { localStorage.setItem(historyKey, JSON.stringify(recent)); } catch {}
  }
  readRecent();
  records.hidden = !recent.length;
  records.ontoggle = () => {
    if (!records.open) return;
    readRecent();
    choices.replaceChildren();
    for (const term of recent) {
      const button = element("button", term, "member-secondary");
      button.type = "button";
      button.onclick = () => {
        search.value = term;
        year.value = "";
        filter();
        rememberSearch();
        records.open = false;
      };
      choices.append(button);
    }
  };
  search.onfocus = () => { records.open = false; };
  search.onchange = rememberSearch;
  search.onkeydown = event => {
    if (event.key === "Enter" && !event.isComposing && event.keyCode !== 229) {
      rememberSearch();
      search.blur();
    }
  };
  const grid = element("div",null,"show-cards");
  const more = element("button","显示更多系列","member-secondary");
  function draw() {
    const query = search.value.trim().normalize("NFKD").toLowerCase();
    const rows = shows.filter(item => (year.value === "current" ? runwaySeason(item.season) === latest : !year.value || item.season.includes(year.value)) &&
      (item.brand + " " + item.season + " " +item.slug).normalize("NFKD").toLowerCase().includes(query));
    grid.replaceChildren();
    for (const item of rows.slice(0,listState.limit)) {
      const card = link("/designers/"+item.slug+"/",null,"show-card");
      if (item.cover) card.append(picture(item.cover,item.brand+" · "+item.season,grid.childElementCount>=6));
      card.append(element("strong",item.brand),element("span",item.season));
      const entry = element("article");
      entry.append(card);
      if (item.brandLink) entry.append(brandAnchor(item.brandLink));
      grid.append(entry);
    }
    if (!rows.length) grid.append(element("p","没有找到符合条件的系列。"));
    more.hidden = rows.length <= listState.limit;
  }
  function filter() {
    listState = {search:search.value,year:year.value,limit:24,scroll:0};
    saveIndexState();
    draw();
  }
  search.oninput = () => {
    if (search.value.trim() && year.value === "current") year.value = "";
    filter();
  };
  year.onchange = filter;
  more.onclick = () => {listState.limit += 24; saveIndexState(); draw();};
  grid.addEventListener("click", event => {
    if (!event.target.closest(".show-card")) return;
    rememberSearch();
    listState.scroll = window.scrollY;
    saveIndexState();
  });
  target.replaceChildren(heading,toolbar,records,grid,more); draw();
  if (listState.scroll) requestAnimationFrame(() => {
    if (grid.isConnected) window.scrollTo(0, listState.scroll);
  });
}
function appendFilm(target, show) {
  const film = show.film;
  if (!film) return;
  const section = element("section", null, "show-film");
  const shortFilm = /短片|精华/.test(film.label || "");
  section.append(element("h2", shortFilm ? "系列短片" : "秀场视频"));
  const title = show.brand + " · " + show.season + (shortFilm ? " 系列短片" : " 秀场视频");
  if (film.originalMp4) {
    const video = element("video");
    video.controls = true;
    video.playsInline = true;
    video.preload = "none";
    video.style.width = "100%";
    video.poster = show.cover;
    video.src = film.originalMp4;
    video.setAttribute("aria-label", title);
    video.addEventListener("error", () => {
      section.append(element("p", "视频暂时无法加载。"));
    }, {once: true});
    section.append(video);
  } else {
    const frame = element("iframe");
    const url = new URL(film.embed);
    if (["www.youtube.com", "www.youtube-nocookie.com"].includes(url.hostname)) {
      url.searchParams.set("origin", location.origin);
      url.searchParams.set("playsinline", "1");
    }
    frame.loading = "lazy";
    frame.title = title;
    frame.src = url.href;
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    frame.allow = "fullscreen; picture-in-picture; encrypted-media";
    frame.allowFullscreen = true;
    section.append(frame);
  }
  const source = link(film.originalPage, "打开原片", "text-action");
  source.target = "_blank";
  source.rel = "noopener noreferrer";
  section.append(source);
  target.append(section);
}

function showDetail(target, show, favorite, readFile) {
  const back = link("/#designers","← 品牌索引","reader-back");
  const heading = element("h1",show.brand);
  const meta = element("p",show.season,"eyebrow");
  target.replaceChildren(back,heading,meta);
  if (show.brandLinks?.length) {
    const links = element("div", null, "show-filters");
    links.append(...show.brandLinks.map(brandAnchor));
    target.append(links);
  }
  const actions=element("div",null,"show-filters");
  const share = shareControl(show.brand + " · " + show.season + " | ÉLAN", "/designers/" + show.slug + "/", {runway:true});
  share.querySelector("button").textContent = "转发";
  actions.append(favorite(show.slug), share);
  if (show.download) {
    const count = show.download.count;
    const label = count === show.images.length ? "一键下载秀场" : "下载已收录造型";
    const download = element("button", label + "（ZIP · " + count + " 张）", "member-secondary");
    download.onclick = async () => {
      download.disabled = true;
      try {
        const bytes = await (await readFile("downloads/" + show.slug + ".zip")).blob();
        if (!download.isConnected) return;
        const url = URL.createObjectURL(bytes);
        const anchor = link(url, label);
        anchor.download = show.slug + ".zip";
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
      } catch { download.textContent = "下载失败，点击重试"; }
      finally { download.disabled = false; }
    };
    actions.append(download);
  } else if (show.externalCollection && show.images.length) {
    attachDownload(actions, show);
  }
  target.append(actions);
  if (!show.images.length) {
    appendFilm(target, show);
    return;
  }
  target.append(element("h2","秀场造型"));
  const grid=element("div",null,"show-looks");
  const viewer = element("dialog",null,"runway-lightbox");
  viewer.setAttribute("aria-label",show.brand+" 秀场大图");
  const close=element("button","关闭","member-secondary");
  const prev=element("button","上一套","member-secondary");
  const next=element("button","下一套","member-secondary");
  const original=link("#","打开原图","text-action");
  original.target="_blank";original.rel="noopener noreferrer";
  const tools = element("div", null, "runway-view-tools");
  tools.append(close, original);
  const controls = element("div", null, "runway-view-nav");
  const caption = element("span");
  caption.setAttribute("aria-live", "polite");
  controls.append(prev, caption, next);
  const large=picture(show.cover,show.brand,false);
  large.className = "runway-view-image";
  viewer.append(tools, large, controls);
  target.append(viewer);
  let active=0;
  function select(index) {
    active=index;
    const look=show.images[active];
    caption.textContent=look.number ? "Look "+look.number : "造型 "+(index+1);
    large.alt=show.brand+" · "+caption.textContent;
    large.onerror=()=>{
      large.onerror=null;
      if(look.thumbnailUrl && look.thumbnailUrl!==look.url)large.src=look.thumbnailUrl;
      else if(index===0)large.src=show.cover;
    };
    large.src=look.url;
    original.href=look.url;
    prev.disabled=index===0;
    next.disabled=index===show.images.length-1;
  }
  function openLook(index) {
    select(index);
    viewer.showModal();
  }
  if (show.externalCollection) {
    const open = element("button", "查看系列图集（" + show.images.length + " 张）", "text-action");
    open.type = "button";
    open.onclick = () => openLook(0);
    actions.append(open);
  }
  close.onclick=()=>viewer.close();
  prev.onclick=()=>select(active-1);
  next.onclick=()=>select(active+1);
  viewer.onkeydown=event=>{
    if(event.key==="ArrowLeft" && active>0)select(active-1);
    if(event.key==="ArrowRight" && active+1<show.images.length)select(active+1);
  };
  let shown=0;
  const more=element("button","查看更多造型","member-secondary");
  function batch() {
    const stop=Math.min(shown+24,show.images.length);
    while (shown<stop) {
      const i=shown++, look=show.images[i], label=look.number ? "Look "+look.number : "造型 "+(i+1);
      const figure=element("figure");
      const a=link(look.url);
      a.target="_blank";a.rel="noopener noreferrer";
      const img=picture(look.thumbnailUrl || look.url,show.brand+" · "+label,i>=6);
      img.onerror=()=>{img.onerror=null;if(img.src!==look.url)img.src=look.url;};
      if(i===0 && show.cover)img.src=show.cover;
      a.onclick=event=>{
        if(event.metaKey || event.ctrlKey || event.shiftKey || typeof viewer.showModal!=="function")return;
        event.preventDefault();openLook(i);
      };
      a.append(img);figure.append(a,element("figcaption",label));grid.append(figure);
    }
    more.hidden=shown>=show.images.length;
  }
  more.onclick=batch;
  target.append(grid,more);
  batch();
  if (show.film) {
    appendFilm(target, show);
  } else {
    const slides=element("section",null,"show-slides");
    const screen=picture(show.cover,show.brand,false);
    const toggle=element("button","播放造型图片","member-secondary");
    const progress=element("span",null,"community-meta");
    let position=0, timer;
    const pause=()=>{clearInterval(timer);timer=undefined;toggle.textContent="播放造型图片";};
    const paint=()=>{
      const look=show.images[position];
      screen.src=position===0 ? show.cover : look.thumbnailUrl || look.url;
      progress.textContent=(position+1)+" / "+show.images.length;
    };
    toggle.onclick=()=>{
      if(timer){pause();return;}
      if(position===show.images.length-1)position=0;
      paint();toggle.textContent="暂停";
      timer=setInterval(()=>{
        if(!target.isConnected || document.hidden || position>=show.images.length-1){pause();return;}
        position++;paint();
      },2200);
    };
    const bar=element("div",null,"show-filters");
    bar.append(toggle,progress);
    slides.append(element("h2","造型连播"),screen,bar);
    target.append(slides);paint();
  }
}
export async function showRunways(target, slug, favorite, readFile, email) {
  target.classList.add("runway-media");
  try {
    const data=await (await readFile(slug ? "shows/"+encodeURIComponent(slug)+".json" : "shows.json")).json();
    if(!target.isConnected)return;
    if (slug && location.pathname === "/" && location.hash.startsWith("#designers/")) {
      location.replace("/designers/" + encodeURIComponent(data.slug) + "/");
      return;
    }
    if(slug) showDetail(target,data,favorite,readFile);else showIndex(target,data,email);
  } catch {
    if(target.isConnected)target.replaceChildren(element("p","系列暂时无法读取。"),link("/#designers","返回品牌索引"));
  }
}

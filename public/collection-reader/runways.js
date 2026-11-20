const base = "/collection-reader/";
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
async function read(path) {
  const response = await fetch(base + path);
  if (!response.ok) throw Error("读取失败");
  return response.json();
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
let listState = {search:"", year:"current", limit:24};
function showIndex(target, shows) {
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
  const grid = element("div",null,"show-cards");
  const more = element("button","显示更多系列","member-secondary");
  function draw() {
    const query = search.value.trim().normalize("NFKD").toLowerCase();
    const rows = shows.filter(item => (year.value === "current" ? runwaySeason(item.season) === latest : !year.value || item.season.includes(year.value)) &&
      (item.brand + " " + item.season + " " +item.slug).normalize("NFKD").toLowerCase().includes(query));
    grid.replaceChildren();
    for (const item of rows.slice(0,listState.limit)) {
      const card = link("/#designers/"+item.slug,null,"show-card");
      if (item.cover) card.append(picture(item.cover,item.brand+" · "+item.season,grid.childElementCount>=6));
      card.append(element("strong",item.brand),element("span",item.season));
      grid.append(card);
    }
    if (!rows.length) grid.append(element("p","没有找到符合条件的系列。"));
    more.hidden = rows.length <= listState.limit;
  }
  function filter() {
    listState = {search:search.value,year:year.value,limit:24};
    draw();
  }
  search.oninput = filter; year.onchange = filter;
  more.onclick = () => {listState.limit += 24; draw();};
  target.replaceChildren(heading,toolbar,grid,more); draw();
}
function appendStudy(target, notes) {
  if (!notes) return;
  const section = element("section", null, "runway-study");
  const columns = element("div", null, "runway-study-columns");
  for (const [key, title] of [["fabric","面料搭配"], ["color","色彩"], ["silhouette","造型"]]) {
    if (!notes[key]) continue;
    const block = element("section");
    block.append(element("h3", title), element("p", notes[key]));
    if (key === "color") {
      const colors = notes.palette?.length ? notes.palette : notes.trialPalette;
      if (colors?.length) {
        if (!notes.palette?.length) block.append(element("small", "打样参考配色"));
        const palette = element("ul", null, "runway-chips");
        for (const color of colors) {
          const chip = element("li");
          const swatch = element("i");
          swatch.style.backgroundColor = color.hex;
          chip.append(swatch, document.createTextNode(color.name));
          palette.append(chip);
        }
        block.append(palette);
      }
    }
    columns.append(block);
  }
  section.append(columns);
  if (notes.techniques?.length) {
    const steps = element("ol");
    for (const step of notes.techniques) steps.append(element("li", step));
    section.append(element("h3","打样方法"), steps);
  }
  if (notes.sources?.length) {
    const sources = element("div",null,"runway-sources");
    for (const source of notes.sources) {
      const a = link(source.url, source.title || source.url, "text-action");
      a.target = "_blank"; a.rel = "noopener noreferrer";
      sources.append(a);
    }
    section.append(element("h3","资料来源"), sources);
  }
  target.append(section);
}

function showDetail(target, show, favorite) {
  const back = link("/#designers","← 品牌索引","reader-back");
  const heading = element("h1",show.brand);
  const meta = element("p",show.season,"eyebrow");
  target.replaceChildren(back,heading,meta);
  const actions=element("div",null,"show-filters");
  actions.append(favorite(show.slug),link(show.source,"查看图片来源","text-action"));
  target.append(actions);
  if (!show.images.length) return;
  target.append(element("h2","秀场造型"));
  const grid=element("div",null,"show-looks");
  const viewer = element("dialog",null,"runway-lightbox");
  viewer.setAttribute("aria-label",show.brand+" 秀场大图");
  const close=element("button","关闭","member-secondary");
  const prev=element("button","上一套","member-secondary");
  const next=element("button","下一套","member-secondary");
  const original=link("#","打开原图","text-action");
  original.target="_blank";original.rel="noopener noreferrer";
  const controls=element("div",null,"show-filters");
  const caption=element("span");
  controls.append(close,prev,caption,next,original);
  const large=picture(show.cover,show.brand,false);
  viewer.append(controls,large);
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
        event.preventDefault();select(i);viewer.showModal();
      };
      a.append(img);figure.append(a,element("figcaption",label));grid.append(figure);
    }
    more.hidden=shown>=show.images.length;
  }
  more.onclick=batch;
  target.append(grid,more);
  if(show.credit) target.append(element("p",show.credit,"community-meta"));
  batch();
  appendStudy(target, show.notes);
  if (show.film) {
    const video = element("section",null,"show-film");
    video.append(element("h2",show.film.label || "秀场视频"));
    if (show.film.embed) {
      const frame=element("iframe");
      const playerUrl = new URL(show.film.embed);
      frame.referrerPolicy = "strict-origin-when-cross-origin";
      if (["www.youtube.com", "www.youtube-nocookie.com"].includes(playerUrl.hostname)) {
        playerUrl.searchParams.set("origin", location.origin);
        playerUrl.searchParams.set("playsinline", "1");
      }
      frame.loading="lazy"; frame.src=playerUrl.href; frame.title=show.brand+" · "+show.season+" 秀场视频";
      frame.allow="fullscreen; picture-in-picture";frame.allowFullscreen=true;
      video.append(frame);
    }
    video.append(link(show.film.url,"在原站观看","text-action"));
    target.append(video);
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
export async function showRunways(target, slug, favorite) {
  target.classList.add("runway-media");
  try {
    const data=await read(slug ? "shows/"+encodeURIComponent(slug)+".json" : "shows.json");
    if(!target.isConnected)return;
    if(slug) showDetail(target,data,favorite);else showIndex(target,data);
  } catch {
    if(target.isConnected)target.replaceChildren(element("p","系列暂时无法读取。"),link("/#designers","返回品牌索引"));
  }
}

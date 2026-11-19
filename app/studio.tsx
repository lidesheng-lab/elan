"use client";

import { useEffect, useRef, useState } from "react";
import { initialStudies, initialTrends, collectionTrends, type Source, type Study, type Trend, type TrendCategory, type RunwayGallery } from "../lib/initial";
import { beautyNotes } from "../lib/beauty";
import GalleryDownload from "./gallery-download";
import { downloadMemberPhoto, imageDownloadPath, isImageUrl } from "../lib/download-image";
import Subscribe from "./subscribe";
import { membership } from "./member-transport";
import Editorial from "./editorial";
import { SavableImage, SaveOptions, type OpenSave, type SaveTarget } from "./savable-image";
import { publicationName } from "../lib/publication";

type Archive = {studies:Study[]; trends:Trend[]; latestDate:string; dailyCount:number};
type RunwayImage = Pick<Study["images"][number], "url" | "thumbnailUrl" | "label">;
const firstIssue:Archive = {studies:initialStudies,trends:[...collectionTrends,...initialTrends],latestDate:initialStudies[0].date,dailyCount:0};
const sections = [
  ["home","首页"],["designers","品牌索引"],["beauty","美妆"],["trends","流行趋势"],["studio","线稿工作台"]
] as const;
type Section = typeof sections[number][0];
const pageSize=12;
const galleryPageSize=12;
const materialFilters=["全部","雕塑支撑","垂坠","镂空透层","解构剪裁","西装条纹","低饱和"];
const trendOptions = [
  ["color","色彩趋势"],["fabric","面料趋势"],["silhouette","廓形趋势"]
] as const;
const formatDate=(date:string)=>date.replaceAll("-", ".");
const normalizeSearch=(value:string)=>value.normalize("NFKD").replace(/\p{M}+/gu,"").toLowerCase();
const directImage=isImageUrl;
function Arrow({diagonal=false}:{diagonal?:boolean}) {return <span aria-hidden="true">{diagonal?"↗︎":"→"}</span>;}
function Sources({sources}:{sources:Source[]}) {
  return <ul className="sources">{sources.map(item=><li key={item.url}><a href={item.url} target="_blank" rel="noreferrer">{item.title} <Arrow diagonal/></a></li>)}</ul>;
}
function Palette({palette}:{palette:Study["palette"]}) {
  return <div className="palette" aria-label="应用色卡">{palette.map(({name,hex})=><div key={name+hex}><span style={{backgroundColor:hex}}/><small>{name}</small></div>)}</div>;
}
function SectionTitle({title,description}:{title:string;description?:string}) {
  return <div className="section-title"><h1>{title}</h1>{description && <p>{description}</p>}</div>;
}

function categoryOf(trend:Trend):TrendCategory {
  if(trend.category) return trend.category;
  if(trend.kind.includes("色彩")) return "color";
  if(/廓形|造型/.test(trend.kind)) return "silhouette";
  return "fabric";
}

function ImageDownload({item,title,compact=false}:{item:{url:string;label:string};title:string;compact?:boolean}) {
  const [failed,setFailed]=useState(false);
  const href = imageDownloadPath(item.url, title + " · " + item.label);
  if(!href) return null;
  return <button className={"image-download"+(compact?" image-download-compact":"")} type="button"
    onClick={()=>{setFailed(false);void downloadMemberPhoto(href,title+" - "+item.label).catch(()=>setFailed(true));}}
    aria-label={"下载"+item.label}>{failed?"重试下载":compact?"下载":"下载图片"}</button>;
}

function RunwayThumb({item,designer,onOpen,onSave}:{item:RunwayImage;designer:string;onOpen:()=>void;onSave:OpenSave}) {
  const [failed,setFailed]=useState(false);
  return <div className="runway-thumb">
    {failed ? <span className="picture-hint">图片暂不可用</span> :
      <SavableImage className="tap-photo" src={item.thumbnailUrl || item.url} alt={item.label} loading="lazy" decoding="async"
        save={{url:item.url,label:item.label,title:designer}} onSave={onSave}
        referrerPolicy="no-referrer" onClick={onOpen} onError={()=>setFailed(true)}/>}
    <div className="runway-thumb-caption">
      <button type="button" className="runway-open" onClick={onOpen} aria-label={"放大查看"+item.label}>{item.label}</button>
      <ImageDownload item={item} title={designer} compact/>
    </div>
  </div>;
}

function RunwayPhoto({item,designer,onSave}:{item:RunwayImage;designer:string;onSave:OpenSave}) {
  const [stage,setStage]=useState<"main"|"thumbnail"|"failed">("main");
  const [loaded,setLoaded]=useState(false);
  if(stage==="failed") return <p className="photo-unavailable">这张照片暂时无法载入。</p>;
  const preview=stage==="main" && !loaded && item.thumbnailUrl!==item.url ? item.thumbnailUrl : undefined;
  return <div className="photo-frame">
    {preview && <SavableImage className="runway-photo photo-preview" src={preview} alt="" referrerPolicy="no-referrer"
      save={{url:item.url,label:item.label,title:designer}} onSave={onSave}/>}
    <SavableImage className={"runway-photo"+(preview?" photo-loading":"")}
      src={stage==="thumbnail" ? item.thumbnailUrl : item.url}
      save={{url:stage==="thumbnail" ? item.thumbnailUrl ?? item.url : item.url,label:item.label,title:designer}}
      onSave={onSave} alt={item.label} referrerPolicy="no-referrer"
      onLoad={()=>setLoaded(true)}
      onError={()=>setStage(stage==="main" && item.thumbnailUrl && item.thumbnailUrl!==item.url ? "thumbnail" : "failed")}/>
  </div>;
}

export default function Studio({features}:{features:Study[]}) {
  const [section,setSection]=useState<Section>("home");
  const [archive,setArchive]=useState(firstIssue);
  const [status,setStatus]=useState<"loading"|"ready"|"offline">("loading");
  const [finding,setFinding]=useState("");
  const [brandFilter,setBrandFilter]=useState("全部");
  const [brandLimit,setBrandLimit]=useState(pageSize);
  const [trendCategory,setTrendCategory]=useState<TrendCategory>("color");
  const [season,setSeason]=useState("全部");
  const [selected,setSelected]=useState<Study|null>(null);
  const [photoIndex,setPhotoIndex]=useState<number|null>(null);
  const [galleryLimit,setGalleryLimit]=useState(galleryPageSize);
  const [galleryResult,setGalleryResult]=useState<{slug:string; gallery:RunwayGallery|null}|null>(null);
  const [saveTarget,setSaveTarget]=useState<SaveTarget|null>(null);
  const saveDialog=useRef<HTMLDialogElement>(null);
  const detailDialog=useRef<HTMLDialogElement>(null);
  const photoDialog=useRef<HTMLDialogElement>(null);
  const gallerySettled=Boolean(selected && galleryResult?.slug===selected.slug);
  const gallery=gallerySettled ? galleryResult?.gallery : null;
  const runwayImages = gallery?.images ?? selected?.images.filter(item=>directImage(item.url)) ?? [];
  const activePhoto=photoIndex===null ? undefined : runwayImages[photoIndex];

  useEffect(()=>{
    const sync=()=>{
      const key=location.hash.slice(1);
      if(key==="subscribe") return;
      setSection(sections.find(([id])=>id===key)?.[0] ?? "home");
    };
    sync();
    window.addEventListener("hashchange",sync);
    return ()=>window.removeEventListener("hashchange",sync);
  },[]);
  useEffect(()=>{
    let active=true;
    async function refresh() {
      try {
        const data=await membership().request({memberAction:"archive"}) as Archive;
        if(active) {setArchive(data);setStatus("ready");}
      } catch {if(active) setStatus("offline");}
    }
    void refresh();
    const interval=window.setInterval(()=>void refresh(),300000);
    window.addEventListener("focus",refresh);
    return ()=>{active=false;window.clearInterval(interval);window.removeEventListener("focus",refresh);};
  },[]);
  useEffect(()=>{
    if(!selected) return;
    const {slug,date,hasRunway}=selected;
    const controller=new AbortController();
    const key=hasRunway ? date+"-"+slug : slug;
    async function loadGallery() {
      try {
        const gallery=await membership().request({memberAction:"gallery",key},controller.signal) as RunwayGallery;
        if(!controller.signal.aborted) setGalleryResult({slug,gallery});
      } catch {
        if(!controller.signal.aborted) setGalleryResult({slug,gallery:null});
      }
    }
    void loadGallery();
    return ()=>controller.abort();
  },[selected]);
  useEffect(()=>{
    const dialog=detailDialog.current;
    if(selected && !dialog?.open) dialog?.showModal();
    if(!selected && dialog?.open) dialog.close();
  },[selected]);
  useEffect(()=>{
    const dialog=photoDialog.current;
    if(activePhoto && !dialog?.open) dialog?.showModal();
    if(!activePhoto && dialog?.open) dialog.close();
  },[activePhoto]);

  useEffect(()=>{
    const dialog=saveDialog.current;
    if(saveTarget && dialog && !dialog.open) dialog.showModal();
    if(!saveTarget && dialog?.open) dialog.close();
  },[saveTarget]);

  function navigate(id:Section) {
    setSection(id);
    if(location.hash!=="#"+id) location.hash=id;
    window.scrollTo({top:0});
  }
  function openDetails(study:Study) {
    setGalleryResult(null);
    setGalleryLimit(galleryPageSize);
    setPhotoIndex(null);
    setSelected(study);
  }
  function closeDetails() {
    setPhotoIndex(null);
    setSelected(null);
  }
  function stepPhoto(step:number) {
    setPhotoIndex(index=>index===null ? null : Math.min(runwayImages.length-1,Math.max(0,index+step)));
  }

  const query=normalizeSearch(finding.trim());
  const matching=archive.studies.filter(study=>
    (brandFilter==="全部" || study.tags.includes(brandFilter)) &&
    normalizeSearch([study.designer,study.season,study.title,...study.tags,study.fabric,study.color,study.silhouette].join(" ")).includes(query)
  );
  const categoryTrends=archive.trends.filter(item=>categoryOf(item)===trendCategory);
  const trendSeasons=["全部",...new Set(categoryTrends.map(item=>item.season))];
  const shownTrends=categoryTrends.filter(item=>season==="全部" || item.season===season);

  return <>
    <header className="topbar">
      <div className="masthead-tools">
        <p>档案更新 <time dateTime={archive.latestDate}>{formatDate(archive.latestDate)}</time></p>
        <a className="subscribe-link" href="#subscribe">免费订阅</a>
      </div>
      <a className="wordmark" href="#home" aria-label={publicationName+" 首页"} onClick={event=>{event.preventDefault();navigate("home");}}>{publicationName}</a>
      <nav aria-label="主导航">{sections.map(([key,label])=><a href={"#"+key} key={key} aria-current={section===key?"page":undefined} onClick={event=>{event.preventDefault();navigate(key);}}>{label}</a>)}</nav>
    </header>

    <main id={section}>
    {section==="home" && <Editorial features={features} onOpen={openDetails} onSave={setSaveTarget}/>}
    {section==="designers" && <>
      <SectionTitle title="品牌索引" description="按品牌或面料技法查找系列，点开档案查看秀场图。"/>
      <label className="search"><span aria-hidden="true">⌕</span><input type="search" value={finding} onChange={event=>{setFinding(event.target.value);setBrandLimit(pageSize);}} placeholder="搜索品牌、面料或技法" aria-label="搜索品牌档案"/></label>
      <div className="pills" aria-label="面料技法">{materialFilters.map(item=><button key={item} aria-pressed={brandFilter===item} onClick={()=>{setBrandFilter(item);setBrandLimit(pageSize);}}>{item}</button>)}</div>
      <div className="results-count" role="status">{status==="loading" ? "正在读取品牌档案…" : `显示 ${Math.min(brandLimit,matching.length)} / ${matching.length} 个品牌`}</div>
      {status==="offline" && <p className="notice">最新档案暂时无法加载，当前显示首批品牌。</p>}
      <div className="card-grid brand-grid">{matching.slice(0,brandLimit).map(study=><StudyCard key={study.slug} study={study} onOpen={()=>openDetails(study)} onSave={setSaveTarget}/>)}</div>
      {status!=="loading" && !matching.length && <p className="notice">没有找到对应研究。</p>}
      {matching.length>brandLimit && <div className="more-row"><button className="text-action" onClick={()=>setBrandLimit(limit=>limit+pageSize)}>显示更多品牌 <Arrow/></button></div>}
    </>}

    {section==="beauty" && <>
      <SectionTitle title="美妆" description="从品牌秀场观察底妆、光泽和妆容细节，再应用到服装模特影像。"/>
      <p className="touch-save-hint">长按图片或点「下载图片」。</p>
      <div className="beauty-grid">{beautyNotes.map(note=><article className="beauty-note" key={note.brand+note.title}>
        <div className="beauty-image"><SavableImage src={note.image.url} alt={note.image.alt} loading="lazy" decoding="async" referrerPolicy="no-referrer"
          save={{url:note.image.url,label:"美妆参考图",title:note.brand}} onSave={setSaveTarget}/>
          <ImageDownload item={{url:note.image.url,label:"美妆参考图"}} title={note.brand}/>
        </div>
        <div className="beauty-copy"><p className="eyebrow">{note.brand} / {note.season}</p><h2>{note.title}</h2><p>{note.observation}</p>
          <p className="beauty-application"><strong>影像应用</strong> {note.application}</p>
          <Sources sources={[note.source]}/>
          <small className="beauty-credit">{note.image.credit}</small>
        </div>
      </article>)}</div>
    </>}

    {section==="trends" && <>
      <SectionTitle title="流行趋势"/>
      <div className="pills trend-categories" aria-label="趋势分类">{trendOptions.map(([id,label])=><button key={id} aria-pressed={trendCategory===id} onClick={()=>{setTrendCategory(id);setSeason("全部");}}>{label}</button>)}</div>
      {trendSeasons.length>2 && <div className="pills" aria-label="趋势季节">{trendSeasons.map(item=><button key={item} aria-pressed={season===item} onClick={()=>setSeason(item)}>{item}</button>)}</div>}
      <div className="trend-list">{shownTrends.map(item=><TrendCard item={item} key={item.id}/>)}</div>
      {!shownTrends.length && <p className="notice">这个分类暂时没有趋势记录。</p>}
    </>}

    {section==="studio" && <>
      <SectionTitle title="线稿工作台"/>
      <p className="studio-closed">线稿生成图片暂不对外开放。</p>
    </>}
    </main>

    <div className="subscribe-wrap" id="subscribe"><Subscribe/></div>
    <footer className="site-footer">
      <a className="footer-wordmark" href="#home" aria-label={publicationName+" 首页"} onClick={event=>{event.preventDefault();navigate("home");}}>{publicationName}</a>
      <nav aria-label="页脚导航">{sections.slice(1,4).map(([id,label])=><a href={"#"+id} key={id} onClick={event=>{event.preventDefault();navigate(id);}}>{label}</a>)}</nav>
    </footer>

    <dialog ref={detailDialog} className="detail" aria-label={selected?.designer || "品牌资料"} onClose={closeDetails} onClick={event=>{if(event.target===event.currentTarget) closeDetails();}}>
      {selected && <div className="detail-body">
        <button type="button" className="close" onClick={closeDetails} aria-label="关闭品牌详情">×</button>
        <p className="eyebrow">{selected.season}{!selected.libraryOnly && " / "+formatDate(selected.date)}</p><h2>{selected.designer}</h2>
        <h3>{selected.title}</h3><p className="detail-summary">{selected.summary}</p>
        <section className="runway-gallery" aria-label="品牌秀场图">
          <div className="gallery-heading">
            <h4>{gallery?.kind==="lookbook"?"官方造型册":"秀场图"}</h4>
            {gallery && runwayImages.length>0 && <GalleryDownload key={selected.slug} gallery={gallery} slug={selected.slug}/> }
          </div>
          {!gallerySettled ? <p className="notice" role="status">正在载入整场造型…</p> : <>
            <p className="gallery-count" role="status">
              {gallery?.complete
                ? `${gallery.kind==="lookbook"?"完整造型册":"全场"} ${runwayImages.length} 套`
                : gallery?.total ? `已收录 ${runwayImages.length} / ${gallery.total} 套` : `已收录 ${runwayImages.length} 套`}
              {runwayImages.length>galleryLimit && ` · 当前显示前 ${galleryLimit} 套`}
            </p>
            {runwayImages.length>0 && <p className="touch-save-hint">轻点放大，长按打开保存菜单。</p>}
            {runwayImages.length>0 && <div className="runway-grid">{runwayImages.slice(0,galleryLimit).map((item,index)=><RunwayThumb key={item.url} item={item} designer={selected.designer} onOpen={()=>setPhotoIndex(index)} onSave={setSaveTarget}/>)}</div>}
            {runwayImages.length>galleryLimit && <button type="button" className="text-action gallery-more" onClick={()=>setGalleryLimit(limit=>limit+galleryPageSize)}>继续查看后面的造型 <Arrow/></button>}
            {gallery ? <Sources sources={[{title:"原图集",url:gallery.sourceUrl}]}/> :
              <Sources sources={selected.images.filter(item=>item.url.startsWith("https://") && !directImage(item.url)).map(item=>({title:item.label,url:item.sourceUrl||item.url}))}/>}
          </>}
        </section>
        <div className="detail-dimensions"><div><h4>面料搭配</h4><p>{selected.fabric}</p></div><div><h4>色彩</h4><p>{selected.color}</p><Palette palette={selected.palette}/></div><div><h4>造型</h4><p>{selected.silhouette}</p></div></div>
        <h4>打样方法</h4><ol className="techniques">{selected.techniques.map(item=><li key={item}>{item}</li>)}</ol>
        <h4>资料来源</h4><Sources sources={selected.sources}/>
      </div>}
    </dialog>

    <dialog ref={photoDialog} className="detail photo-dialog" aria-label="秀场大图" onClose={()=>setPhotoIndex(null)} onClick={event=>{if(event.target===event.currentTarget)setPhotoIndex(null);}}
      onKeyDown={event=>{if(event.key==="ArrowLeft") stepPhoto(-1);if(event.key==="ArrowRight") stepPhoto(1);}}>
      {activePhoto && photoIndex!==null && <div className="photo-body">
        <button type="button" className="close" onClick={()=>setPhotoIndex(null)} aria-label="关闭秀场大图">×</button>
        <RunwayPhoto key={activePhoto.url} item={activePhoto} designer={selected?.designer ?? publicationName} onSave={setSaveTarget}/>
        <div className="photo-caption">
          <strong aria-live="polite">{activePhoto.label}</strong>
          <div className="photo-controls">
            <button type="button" onClick={()=>stepPhoto(-1)} disabled={photoIndex<=0} aria-label="上一张">←</button>
            <button type="button" onClick={()=>stepPhoto(1)} disabled={photoIndex+1>=runwayImages.length} aria-label="下一张">→</button>
          </div>
          <ImageDownload item={activePhoto} title={selected?.designer ?? publicationName} compact/>
        </div>
      </div>}
    </dialog>

    <dialog ref={saveDialog} className="save-dialog" aria-labelledby="save-heading"
      onClose={()=>setSaveTarget(null)} onClick={event=>{if(event.target===event.currentTarget) setSaveTarget(null);}}>
      {saveTarget && <div className="save-sheet">
        <button type="button" className="close" aria-label="关闭图片保存菜单" onClick={()=>setSaveTarget(null)}>×</button>
        <h2 id="save-heading">保存图片</h2>
        <p>{saveTarget.title} · {saveTarget.label}</p>
        <SaveOptions key={saveTarget.url} image={saveTarget}/>
      </div>}
    </dialog>
  </>;
}

function StudyCard({study,onOpen,onSave}:{study:Study;onOpen:()=>void;onSave:OpenSave}) {
  const [coverFailed,setCoverFailed]=useState(false);
  const cover=study.images.find(item=>directImage(item.url));
  return <article className="study-card">
    <div className="brand-cover">
      {cover && !coverFailed
        ? <SavableImage className="tap-photo" src={cover.thumbnailUrl||cover.url} alt={study.designer+" 秀场图"} loading="lazy"
          save={{url:cover.url,label:"秀场图",title:study.designer}} onSave={onSave}
          decoding="async" referrerPolicy="no-referrer" onClick={onOpen} onError={()=>setCoverFailed(true)}/>
        : <span>查看系列资料</span>}
    </div>
    <button type="button" className="study-open" onClick={onOpen}>
      <span className="card-meta"><span>{study.season}</span><Arrow diagonal/></span>
      <strong>{study.designer}</strong><span className="study-title">{study.title}</span>
    </button>
  </article>;
}

function TrendCard({item}:{item:Trend}) {
  const color=categoryOf(item)==="color";
  return <article className={"trend"+(color?"":" trend-text")}>
    <div><div className="eyebrow">{item.season} / {item.kind}</div><h3>{item.title}</h3><p>{item.description}</p><p className="apply"><strong>试样</strong> {item.application}</p><Sources sources={item.sources}/></div>
    {color && <Palette palette={item.palette}/>}
  </article>;
}

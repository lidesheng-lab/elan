import { editorialImages } from "../lib/editorial-images";
import type { Study } from "../lib/initial";
import { SavableImage, type OpenSave } from "./savable-image";

const coverSlug = "balenciaga";
const storySlugs = ["feng-chen-wang", "carolina-herrera-spring-2027", "thom-browne-fall-2026"] as const;

export default function Editorial({features,onOpen,onSave}:{features:Study[];onOpen:(study:Study)=>void;onSave:OpenSave}) {
  const cover = features.find(study => study.slug === coverSlug);
  const coverImages = editorialImages[coverSlug];
  return <>
    {cover && <article className="cover-story" aria-labelledby="cover-headline">
      <div className="cover-copy">
        <p className="eyebrow">封面专题 <span>Runway</span></p>
        <h1 id="cover-headline">剪裁的<br/>留白</h1>
        <p className="cover-season">{cover.designer} <span>{cover.season}</span></p>
        <p className="cover-intro">一件衣服如何在身体外保留自己的轮廓？从 Balenciaga 的袋形裙、圆鼓外套和披缠结构，看面料如何塑造这层空间。</p>
        <button type="button" className="primary cover-action" onClick={()=>onOpen(cover)}>阅读封面专题</button>
      </div>
      <figure className="cover-figure">
        <div className="cover-images">{coverImages.map(({number,url})=>
          <SavableImage key={number} src={url} fetchPriority={number===17?"high":undefined}
            save={{url,label:"秀场造型 "+number,title:cover.designer}} onSave={onSave}
            alt={cover.designer + " 秀场造型 " + number} referrerPolicy="no-referrer"/>
        )}</div>
        <figcaption>{cover.designer} / Look 17 &amp; 01 <span>{coverImages[0].credit}</span></figcaption>
      </figure>
    </article>}
    <section className="editorial-stories" aria-labelledby="editorial-stories-title">
      <div className="editorial-heading"><h2 id="editorial-stories-title">秀场选读</h2><a href="#designers">全部品牌</a></div>
      <div className="editorial-grid">{storySlugs.map(slug=>{
        const study = features.find(item => item.slug===slug);
        const photo = editorialImages[slug][0];
        if (!study) return null;
        return <article className="editorial-story" key={slug}>
          <SavableImage className="tap-photo" src={photo.url} alt={study.designer+" 秀场图"} loading="lazy"
            save={{url:photo.url,label:"秀场造型 "+photo.number,title:study.designer}} onSave={onSave}
            decoding="async" referrerPolicy="no-referrer" onClick={()=>onOpen(study)}/>
          <p className="eyebrow">{study.season}</p>
          <h3><button type="button" onClick={()=>onOpen(study)}>{study.designer}</button></h3>
          <p className="editorial-story-title">{study.title}</p>
          <small>{photo.credit}</small>
        </article>;
      })}</div>
    </section>
  </>;
}

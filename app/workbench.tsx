import { useEffect, useState } from "react";
import type { Study } from "../lib/initial";

const filters = ["雕塑支撑", "垂坠", "镂空透层", "解构剪裁", "西装条纹", "低饱和"];

export default function Workbench({ studies }: { studies: Study[] }) {
  const [tags, setTags] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("");
  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const local = URL.createObjectURL(file);
    setPreview(local);
    return () => URL.revokeObjectURL(local);
  }, [file]);

  const ranked = studies.map(study => ({ study, matches: tags.filter(tag => study.tags.includes(tag)).length }))
    .filter(item => item.matches > 0).sort((a, b) => b.matches - a.matches).slice(0, 3);
  const best = ranked[0]?.study;
  const task = best ? [
    "用 $study-fashion-materials 分析我附上的服装线稿。请先列出保留的结构，再制作写实全身成衣参考。",
    "线稿特征：" + tags.join("、") + "。",
    "保留原线稿的轮廓、主要分割线、领口、肩袖和衣长；面料成分未知时注明打样候选。",
    "档案参考：" + best.designer + " · " + best.season + "。",
    "面料搭配参考：" + best.fabric,
    "造型参考：" + best.silhouette,
    "请结合线稿合理迁移技法，使用原创分片，并表现真实织纹、支撑和垂坠。",
    note.trim() && "补充要求：" + note.trim(),
  ].filter(Boolean).join("\n") : "";
  async function copy() {
    try { await navigator.clipboard.writeText(task); setStatus("任务单已复制。"); }
    catch { setStatus("可在下方选中任务单并手动复制。"); }
  }
  return <div className="member-workbench">
    <div>
      <label htmlFor="sketch-upload">服装线稿（选填）</label>
      <input id="sketch-upload" type="file" accept="image/png,image/jpeg,image/webp"
        onChange={event => setFile(event.currentTarget.files?.[0] ?? null)}/>
      {preview && <img src={preview} alt="线稿预览" className="workbench-preview"/>}
      <p>线稿只在当前设备预览。你可以将线稿和任务单一起提交到对话生成。</p>
      <label htmlFor="sketch-note">需要补充的设计要求</label>
      <textarea id="sketch-note" value={note} maxLength={400} rows={3} onChange={event => setNote(event.currentTarget.value)}/>
    </div>
    <section>
      <h2>匹配面料方案</h2>
      <div className="pills" aria-label="选择线稿特征">
        {filters.map(tag => <button key={tag} type="button" aria-pressed={tags.includes(tag)}
          onClick={() => { setStatus(""); setTags(current => current.includes(tag) ? current.filter(value => value !== tag) : [...current, tag]); }}>{tag}</button>)}
      </div>
      {!best ? <p>选择线稿特征，查看对应的品牌和面料技巧。</p> : <>
        <ul className="workbench-matches">{ranked.map(({study}) => <li key={study.slug}><strong>{study.designer}</strong> · {study.season}<p>{study.title}</p></li>)}</ul>
        <label htmlFor="sketch-brief">写实还原任务单</label>
        <textarea id="sketch-brief" readOnly value={task} rows={8}/>
        <div className="member-actions">
          <button className="primary" type="button" onClick={() => void copy()}>复制任务单</button>
          <a className="text-action" href="https://chatgpt.com/" target="_blank" rel="noreferrer">打开对话</a>
        </div>
        <p role="status">{status}</p>
      </>}
    </section>
  </div>;
}

const fs = require("node:fs");
const path = require("node:path");
const { randomBytes, createCipheriv, publicEncrypt } = require("node:crypto");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const dir = path.join(root, "dist/collection-reader");
const publicKey = fs.readFileSync(path.join(root, "history-public.pem"));

function seal(name, bytes) {
  const key = randomBytes(32);
  const iv = randomBytes(12);
  const wrapped = publicEncrypt({ key: publicKey, oaepHash: "sha256", oaepLabel: Buffer.from("elan-collection-file-v1") }, key);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([wrapped, iv, cipher.update(bytes), cipher.final(), cipher.getAuthTag()]);
  fs.writeFileSync(path.join(dir, name + ".sealed"), data);
}
const readerPath = path.join(dir, "reader.js");
const reader = fs.readFileSync(readerPath, "utf8");
const match = /,se=(\[\{brand:[\s\S]+?\}\]);function ce\(\)/.exec(reader);
if (!match || !reader.includes("children:se.map(")) throw Error("Unknown beauty reader format");
seal("beauty.json", Buffer.from(JSON.stringify(vm.runInNewContext(match[1], {}, {timeout:1000}))));
fs.writeFileSync(readerPath, reader.replace(match[0], ";function ce()").replace("children:se.map(", "children:(window.elanMember.beauty || []).map("));
const catalog = JSON.parse(fs.readFileSync(path.join(dir, "catalog.json")));
const fields = ["slug","tags","designer","season","fabric","silhouette","title"];
const tags = ["雕塑支撑","垂坠","镂空透层","解构剪裁","西装条纹","低饱和"];
const references = new Set();
for (let mask = 1; mask < 2 ** tags.length; mask++) {
  const selected = tags.filter((_, i) => mask & (1 << i));
  const ranked = catalog.studies.map(study => ({study, score:selected.filter(tag => study.tags.includes(tag)).length}));
  ranked.sort((a,b) => b.score-a.score).slice(0,3).filter(r => r.score).forEach(r => references.add(r.study));
}
const studies = catalog.studies.filter(s => references.has(s)).map(s => Object.fromEntries(fields.map(k => [k,s[k]])));
fs.writeFileSync(path.join(dir,"studio.json"), JSON.stringify({studies,trends:[],latestDate:catalog.latestDate,dailyCount:0}));
for (const name of ["catalog.json","shows.json",...["shows","galleries","downloads"].flatMap(folder => {
  const base = path.join(dir,folder);
  return fs.existsSync(base) ? fs.readdirSync(base).map(n => path.join(folder,n)) : [];
})]) {
  const file = path.join(dir, name);
  seal(name, fs.readFileSync(file));
  fs.unlinkSync(file);
}

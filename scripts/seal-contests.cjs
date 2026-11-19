const {existsSync,readFileSync,writeFileSync}=require("node:fs");
const {resolve}=require("node:path");
const {constants,createCipheriv,createHash,publicEncrypt,randomBytes}=require("node:crypto");
const {contestPage}=require("./public-editorial.cjs");

const [inputPath,outputPath=resolve(__dirname,"../contest-feed.json")]=process.argv.slice(2);
if(!inputPath) throw new Error("Supply a JSON array of verified fashion design contests");
const publicKey=readFileSync(resolve(__dirname,"../history-public.pem"));
const entries=JSON.parse(readFileSync(inputPath,"utf8"));
const feed=existsSync(outputPath) ? JSON.parse(readFileSync(outputPath,"utf8")) : [];
const entriesBySlug=new Map(feed.map(entry=>[entry.slug,entry]));
const submitted=new Set();
const text=value=>typeof value==="string" && value.trim().length>0;
function validSource(source) {
  if(!text(source?.title) || !text(source?.url)) return false;
  try {
    const url=new URL(source.url);
    return url.protocol==="https:" && !url.username && !url.password;
  } catch { return false; }
}
for(const item of entries) {
  const {id:slug,kind,title,category,organizer,summary,date,deadline,source,details,references}=item;
  if(!/^[a-z0-9-]{1,100}$/.test(slug) || !["recruit","award"].includes(kind) ||
      ![title,category,organizer,summary].every(text) || !validSource(source) ||
      (references!==undefined && (!Array.isArray(references) || references.length>4 || !references.every(validSource))) ||
      (details!==undefined && (!Array.isArray(details) || details.length>8 ||
        !details.every(detail=>text(detail?.title) && text(detail?.text) && detail.title.length<=45 && detail.text.length<=650))) ||
      (kind==="recruit" && !/^20\d{2}-\d{2}-\d{2}$/.test(deadline)) ||
      (kind==="award" && !/^20\d{2}(?:-\d{2}(?:-\d{2})?)?$/.test(date))) throw new Error("Invalid contest "+slug);
  if(submitted.has(slug)) throw new Error("Duplicate input contest "+slug);
  const id=createHash("sha256").update("contest:"+slug).digest("hex");
  const secret=randomBytes(32);
  const nonce=randomBytes(12);
  const cipher=createCipheriv("aes-256-gcm",secret,nonce);
  cipher.setAAD(Buffer.from(id,"hex"));
  const body=Buffer.concat([cipher.update(JSON.stringify(item),"utf8"),cipher.final()]);
  const key=publicEncrypt({key:publicKey,padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:"sha256"},secret);
  const encode=buffer=>buffer.toString("base64url");
  entriesBySlug.set(slug,{id,slug,nonce:encode(nonce),tag:encode(cipher.getAuthTag()),key:encode(key),body:encode(body),
    public:contestPage(item)});
  submitted.add(slug);
}
writeFileSync(outputPath,JSON.stringify([...entriesBySlug.values()])+"\n");

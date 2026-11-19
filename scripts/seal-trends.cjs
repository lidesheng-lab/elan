const { readFileSync, writeFileSync, existsSync } = require("node:fs");
const { resolve } = require("node:path");
const { constants, createCipheriv, createHash, publicEncrypt, randomBytes } = require("node:crypto");
const { trendPage } = require("./public-editorial.cjs");

const [inputPath, outputPath = resolve(__dirname, "../trend-vault.json")] = process.argv.slice(2);
if (!inputPath) throw new Error("Supply a JSON file containing one article or an array of articles");
const encryptionKey = readFileSync(resolve(__dirname, "../history-public.pem"));
const input = JSON.parse(readFileSync(inputPath, "utf8"));
const entries = Array.isArray(input) ? input : [input];
const feed = existsSync(outputPath) ? JSON.parse(readFileSync(outputPath, "utf8")) : [];
const known = new Set(feed.map(entry => entry.slug));
const text = value => typeof value === "string" && value.trim().length > 0;
function secureUrl(value, host) {
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password && (!host || host.test(url.hostname));
}
for (const post of entries) {
  const { slug, date, season, category, title, lead, sections, images, sources } = post;
  if (!/^[a-z0-9-]{1,100}$/.test(slug) || !/^20\d\d-\d\d-\d\d$/.test(date) ||
      !["color","fabric","silhouette"].includes(category) || ![season,title,lead].every(text) ||
      !Array.isArray(sections) || sections.length < 2 ||
      !sections.every(section => text(section.heading) && Array.isArray(section.paragraphs) &&
        section.paragraphs.length && section.paragraphs.every(text)) ||
      !Array.isArray(images) || !images.length || !Array.isArray(sources) || !sources.length ||
      !sources.every(source => text(source.title) && secureUrl(source.url))) {
    throw new Error("Invalid trend article " + slug);
  }
  for (const image of images) {
    if (!secureUrl(image.url, /^(upload|thumb)\.wikimedia\.org$/) ||
        !secureUrl(image.sourceUrl, /^commons\.wikimedia\.org$/) || !new URL(image.sourceUrl).pathname.startsWith("/wiki/File:") ||
        !secureUrl(image.licenseUrl, /^creativecommons\.org$/) ||
        !/^\/(?:licenses\/by(?:-sa)?\/(?:2\.0|2\.5|3\.0|4\.0)|publicdomain\/(?:zero|mark)\/1\.0)\/$/.test(new URL(image.licenseUrl).pathname) ||
        ![image.alt,image.caption,image.credit,image.license].every(text)) throw new Error("Invalid trend image " + slug);
  }
  if (known.has(slug)) continue;
  const cover = images[0] && Object.fromEntries(["url","alt","credit","license","licenseUrl","sourceUrl"]
    .map(key => [key, images[0][key]]));
  const id = createHash("sha256").update("trend:" + slug).digest("hex");
  const secret = randomBytes(32);
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secret, nonce);
  cipher.setAAD(Buffer.from(id, "hex"));
  const body = Buffer.concat([cipher.update(JSON.stringify(post), "utf8"), cipher.final()]);
  const wrapped = publicEncrypt({key:encryptionKey, padding:constants.RSA_PKCS1_OAEP_PADDING, oaepHash:"sha256"}, secret);
  const encode = buffer => buffer.toString("base64url");
  feed.push({id, slug, date, season, category, title, ...(cover && {cover}), nonce:encode(nonce), tag:encode(cipher.getAuthTag()), key:encode(wrapped), body:encode(body),
    public:trendPage(post)});
  known.add(slug);
}
writeFileSync(outputPath, JSON.stringify(feed) + "\n");

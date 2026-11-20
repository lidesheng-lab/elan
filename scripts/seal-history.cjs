const { readFileSync, writeFileSync, existsSync } = require("node:fs");
const { resolve } = require("node:path");
const { constants, createCipheriv, createHash, publicEncrypt, randomBytes } = require("node:crypto");

const [inputPath, outputPath = resolve(__dirname, "../history-feed.json")] = process.argv.slice(2);
if (!inputPath) throw new Error("Supply a JSON array of new archive entries");
const encryptionKey = readFileSync(resolve(__dirname, "../history-public.pem"));
const entries = JSON.parse(readFileSync(inputPath, "utf8"));
const feed = existsSync(outputPath) ? JSON.parse(readFileSync(outputPath, "utf8")) : [];
const known = new Set(feed.map(entry => entry.id));
for (const entry of entries) {
  const { study, gallery } = entry;
  if (!/^[a-z0-9-]{1,100}$/.test(study.slug) || !/^20\d\d-\d\d-\d\d$/.test(study.date) ||
      !study.libraryOnly || !study.sources.length || Boolean(study.hasRunway) !== Boolean(gallery)) {
    throw new Error("Invalid historical archive entry");
  }
  const id = createHash("sha256").update(study.slug).digest("hex");
  if (known.has(id)) continue;
  const secret = randomBytes(32);
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secret, nonce);
  cipher.setAAD(Buffer.from(id, "hex"));
  const body = Buffer.concat([cipher.update(JSON.stringify(entry), "utf8"), cipher.final()]);
  const wrapped = publicEncrypt({key:encryptionKey, padding:constants.RSA_PKCS1_OAEP_PADDING, oaepHash:"sha256"}, secret);
  const encode = buffer => buffer.toString("base64url");
  feed.push({id, public:entry, nonce:encode(nonce), tag:encode(cipher.getAuthTag()), key:encode(wrapped), body:encode(body)});
  known.add(id);
}
writeFileSync(outputPath, JSON.stringify(feed) + "\n");


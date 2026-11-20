// CloudBase HTTP function (Node 18+). Mount at /wechat-share.
const {createHash, randomBytes} = require("node:crypto");
const site = "https://elan.lidesheng.art";
let ticket, expires = 0, pending;

async function wechat(step, url, options) {
  let res, json;
  try {
    res = await fetch(url, {...options,signal:AbortSignal.timeout(8000)});
    json = await res.json();
  } catch {
    throw Object.assign(new Error("WeChat request failed"), {code: "WECHAT_REQUEST_FAILED", step});
  }
  if (!res.ok || json.errcode) {
    throw Object.assign(new Error("WeChat rejected the request"), {
      code: "WECHAT_REJECTED", step,
      wechatCode: Number.isInteger(json.errcode) ? json.errcode : undefined
    });
  }
  return json;
}
async function loadTicket() {
  const token = await wechat("access_token", "https://api.weixin.qq.com/cgi-bin/stable_token", {
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({grant_type:"client_credential",appid:process.env.WECHAT_APP_ID,secret:process.env.WECHAT_APP_SECRET})
  });
  if (!token.access_token) throw Object.assign(new Error("Missing access token"), {code:"WECHAT_RESPONSE_INVALID",step:"access_token"});
  const data = await wechat("jsapi_ticket", "https://api.weixin.qq.com/cgi-bin/ticket/getticket?type=jsapi&access_token="+encodeURIComponent(token.access_token));
  if (!data.ticket || !(data.expires_in>300)) {
    throw Object.assign(new Error("Missing or invalid ticket"), {code:"WECHAT_RESPONSE_INVALID",step:"jsapi_ticket"});
  }
  ticket=data.ticket;
  expires=Date.now()+(data.expires_in-300)*1000;
}
exports.main = async event => {
  const headers={"Access-Control-Allow-Origin":site,"Content-Type":"application/json","Cache-Control":"no-store"};
  const reply=(statusCode,body)=>({statusCode,headers,body:JSON.stringify(body)});
  try {
    const input=event.queryStringParameters?.url || event.queryString?.url;
    if(typeof input!=="string" || input.length>4096) return reply(400,{});
    const url=new URL(input);
    if(url.origin!==site || url.username || url.password || url.hash ||
       !/^\/(contests|trends|designers)\/[a-z0-9-]{1,100}\/$/.test(url.pathname)) return reply(400,{});
    if(!process.env.WECHAT_APP_ID || !process.env.WECHAT_APP_SECRET) return reply(503,{code:"CONFIG_MISSING"});
    if(Date.now()>=expires) {
      pending ||= loadTicket().finally(()=>{pending=null;});
      await pending;
    }
    const nonceStr=randomBytes(16).toString("hex");
    const timestamp=Math.floor(Date.now()/1000);
    const signature=createHash("sha1").update(`jsapi_ticket=${ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${input}`).digest("hex");
    return reply(200,{appId:process.env.WECHAT_APP_ID,nonceStr,timestamp,signature});
  } catch (error) {
    const {code, step, wechatCode} = error;
    if (!step) return reply(503,{code:"SIGNING_FAILED"});
    console.warn("WeChat share signing unavailable", {code, step, wechatCode});
    return reply(503,{code, step, wechatCode});
  }
};

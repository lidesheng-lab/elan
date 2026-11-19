const api = "https://elan-d8gtdxsaw5a7788d2-1507516836.ap-shanghai.app.tcloudbase.com/newsletter";
const storageKey = "elan-member-session";
const root = document.getElementById("root");
let session = sessionStorage.getItem(storageKey) || "";

async function request(body, signal, credentials = session) {
  const headers = { "Content-Type": "application/json" };
  if (credentials) headers.Authorization = "Bearer " + credentials;
  const response = await fetch(api, { method: "POST", headers, body: JSON.stringify(body),
    signal: signal || AbortSignal.timeout(15000) });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.error || "操作暂不可用，请稍后再试。"), { status: response.status });
  return result;
}

function panel(label, text, markup) {
  root.innerHTML = `<main class="member-entry">
    <p class="member-wordmark"><a href="/">ÉLAN</a></p>
    <section class="member-panel">
      <h1>${label}</h1><p>${text}</p>
      ${markup}
      <p class="member-message" role="status" id="member-message"></p>
    </section>
  </main>`;
}
function message(text) { document.getElementById("member-message").textContent = text; }
function bindForm(id, operation) {
  const form = document.getElementById(id);
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const button = event.submitter || form.querySelector("button");
    button.disabled = true;
    message("正在处理…");
    try { await operation(new FormData(form), button); }
    catch (error) { message(error.message); }
    finally { button.disabled = false; }
  });
}
function entry() {
  panel("网站仅供会员使用", "请联系管理员申请访问权限。微信 LDSH557788。", `
    <form id="access-form">
      <label for="member-email">邮箱地址</label>
      <input id="member-email" name="email" type="email" autocomplete="email" required maxlength="254" placeholder="name@example.com">
      <div class="member-actions">
        <button class="primary" type="submit" value="login">发送登录邮件</button>
        <button class="member-secondary" type="submit" value="apply">申请会员</button>
      </div>
    </form>`);
  bindForm("access-form", async (data, button) => {
    const action = button.value;
    await request({ memberAction: action, email: data.get("email") }, undefined, "");
    message(action === "apply" ? "申请已登记，请联系管理员审核。" : "已获授权的邮箱会收到 ÉLAN 登录邮件。");
  });
}
function confirmLink(action, id, token) {
  const login = action === "exchange";
  const unsubscribe = action === "unsubscribe";
  const title = login ? "确认登录" : unsubscribe ? "确认退订" : "确认订阅";
  panel(title, login ? "确认后即可使用与你邮箱绑定的会员权限。" : "确认后将更新周报发送设置。",
    `<form id="mail-form"><button class="primary" type="submit">${title}</button></form>`);
  bindForm("mail-form", async () => {
    if (login) {
      const result = await request({ memberAction: "exchange", id, token }, undefined, "");
      session = result.session;
      sessionStorage.setItem(storageKey, session);
      history.replaceState(null, "", "/");
      await openMember();
      return;
    }
    await request({ action, id, token }, undefined, "");
    document.getElementById("mail-form").remove();
    message(unsubscribe ? "已退订 ÉLAN 周报。" : "已确认订阅 ÉLAN 周报。");
  });
}
async function logout() {
  try { await request({ memberAction: "logout" }); }
  finally {
    sessionStorage.removeItem(storageKey);
    window.location.replace("/");
  }
}
async function openArchive(profile) {
  const { script } = await request({ memberAction: "app" });
  window.elanMember = {
    email: profile.email,
    session,
    request,
    photo(url) {
      if (!/^https:\/\//i.test(url) || url.startsWith(api + "?")) return url;
      return api + "?" + new URLSearchParams({ picture: "1", src: url });
    },
  };
  root.replaceChildren();
  const app = URL.createObjectURL(new Blob([script], { type: "text/javascript" }));
  try { await import(app); } finally { URL.revokeObjectURL(app); }
  const signout = document.createElement("button");
  signout.type = "button";
  signout.className = "member-exit";
  signout.textContent = "退出";
  signout.onclick = () => void logout();
  root.after(signout);
  if (profile.admin) {
    const admin = document.createElement("a");
    admin.className = "member-exit member-admin-link";
    admin.href = "/?panel=admin";
    admin.textContent = "会员管理";
    signout.after(admin);
  }
}
async function adminPanel(profile) {
  panel("会员管理", "只有管理员可以授权或撤销邮箱的访问权限。", `
    <div class="member-actions">
      <a class="member-secondary" href="/">查看档案</a>
      <button class="member-secondary" id="exit-admin" type="button">退出</button>
    </div>
    <form id="approve-form">
      <label for="approve-email">授权邮箱</label>
      <input id="approve-email" name="email" type="email" required maxlength="254">
      <button class="primary" type="submit">批准访问</button>
    </form>
    <label for="member-state">按状态查看</label>
    <select id="member-state"><option value="pending">待审批</option><option value="approved">已授权</option><option value="revoked">已撤销</option></select>
    <ul id="members" class="member-list"></ul>`);
  document.getElementById("exit-admin").onclick = () => void logout();
  const state = document.getElementById("member-state");
  const list = document.getElementById("members");
  async function refresh() {
    const current = state.value;
    const { members } = await request({ memberAction: "members", state: current });
    if (current !== state.value) return;
    list.replaceChildren();
    for (const member of members) {
      if (member.email === profile.email) continue;
      const row = document.createElement("li");
      const address = document.createElement("span");
      address.textContent = member.email;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "member-secondary";
      button.textContent = current === "approved" ? "撤销权限" : "批准访问";
      button.onclick = async () => {
        button.disabled = true;
        try {
          await request({ memberAction: current === "approved" ? "revoke" : "approve", email: member.email });
          await refresh();
          message("权限已更新。");
        } catch (error) { message(error.message); button.disabled = false; }
      };
      row.append(address, button);
      list.append(row);
    }
    if (!list.childElementCount) {
      const row = document.createElement("li");
      row.textContent = "暂无记录。";
      list.append(row);
    }
  }
  state.onchange = () => refresh().catch(error => message(error.message));
  bindForm("approve-form", async data => {
    await request({ memberAction: "approve", email: data.get("email") });
    document.getElementById("approve-form").reset();
    await refresh();
    message("权限已开通。");
  });
  await refresh();
}
async function openMember() {
  const profile = await request({ memberAction: "profile" });
  if (profile.admin && new URLSearchParams(location.search).get("panel") === "admin") await adminPanel(profile);
  else await openArchive(profile);
}

const login = /^#member-login\/([a-f0-9]{64})\/([A-Za-z0-9_-]{43})$/.exec(location.hash);
const newsletter = /^#newsletter\/(confirm|unsubscribe)\/([a-f0-9]{64})\/([A-Za-z0-9_-]{43})$/.exec(location.hash);
if (login) confirmLink("exchange", login[1], login[2]);
else if (newsletter) confirmLink(newsletter[1], newsletter[2], newsletter[3]);
else if (session) {
  panel("会员档案", "正在核验访问权限。", "");
  openMember().catch(error => {
    if (error.status === 403) sessionStorage.removeItem(storageKey);
    entry();
    if (error.status !== 403) message("会员档案暂时无法加载，请稍后重试。");
  });
} else entry();

import { useState, type FormEvent } from "react";

const endpoint = import.meta.env.VITE_ELAN_SUBSCRIBE_URL?.trim() ||
  "https://elan-d8gtdxsaw5a7788d2-1507516836.ap-shanghai.app.tcloudbase.com/newsletter";

async function submitNewsletter(payload: Record<string, string>) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(12000),
  });
  const result = await response.json() as { registered?: boolean; status?: string; error?: string };
  if (!response.ok) throw new Error(result.error || "暂时无法操作，请稍后再试。");
  return result;
}

export function NewsletterManage() {
  const [, action, id, token] = window.location.hash.split("/");
  const valid = (action === "confirm" || action === "unsubscribe") &&
    /^[a-f0-9]{64}$/.test(id || "") && /^[A-Za-z0-9_-]{43}$/.test(token || "");
  const unsubscribing = action === "unsubscribe";
  const heading = unsubscribing ? "退订 ÉLAN 周报" : "确认订阅 ÉLAN";
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
  const [error, setError] = useState("");
  async function manage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || status !== "idle") return;
    setStatus("submitting");
    setError("");
    try {
      const result = await submitNewsletter({ action, id, token });
      if (result.status !== (unsubscribing ? "unsubscribed" : "confirmed")) throw new Error();
      setStatus("done");
    } catch (failure) {
      setError(failure instanceof Error && failure.message ? failure.message : "暂时连不上订阅服务，请稍后再试。");
      setStatus("idle");
    }
  }
  return <main className="newsletter-manage">
    <div className="subscribe-section">
      <div>
        <h1>ÉLAN</h1>
        <h2>{heading}</h2>
        <a className="text-action" href="./">返回 ÉLAN</a>
      </div>
      {!valid ? <p role="alert">订阅链接无效。</p>
        : status === "done" ? <p className="subscribe-success" role="status">
          {unsubscribing ? "你已退订 ÉLAN 周报。" : "邮箱已确认，感谢订阅 ÉLAN。"}
        </p> : <form onSubmit={manage}>
          <button type="submit" className="primary" disabled={status === "submitting"}>
            {status === "submitting" ? "提交中…" : unsubscribing ? "确认退订" : "确认邮箱并订阅"}
          </button>
          {error && <p className="subscribe-error" role="alert">{error}</p>}
        </form>}
    </div>
  </main>;
}

export default function Subscribe() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "registered">("idle");
  const [error, setError] = useState("");

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status !== "idle") return;
    setStatus("submitting");
    setError("");
    try {
      const result = await submitNewsletter({ email });
      if (result.registered) {
        setStatus("registered");
        return;
      }
      setError("暂时无法登记，请稍后再试。");
    } catch (failure) {
      setError(failure instanceof Error && failure.message ? failure.message : "暂时连不上订阅服务，请稍后再试。");
    }
    setStatus("idle");
  }

  return <section className="subscribe-section" aria-labelledby="subscribe-title">
    <div>
      <h2 id="subscribe-title">免费订阅</h2>
      <p>每周趋势与秀场选读。登记后请确认邮箱，邮件内可退订。</p>
    </div>
    {status === "registered"
        ? <p className="subscribe-success" role="status">邮箱已登记。首次订阅请查看确认邮件。</p>
        : <form onSubmit={register}>
          <label htmlFor="subscribe-email">订阅邮箱</label>
          <div className="subscribe-fields">
            <input id="subscribe-email" type="email" autoComplete="email" maxLength={254} required
              value={email} onChange={event => setEmail(event.target.value)} placeholder="name@example.com"
              disabled={status === "submitting"}/>
            <button className="primary" type="submit" disabled={status === "submitting"}>
              {status === "submitting" ? "登记中…" : "免费订阅"}
            </button>
          </div>
          {error && <p className="subscribe-error" role="alert">{error}</p>}
        </form>}
  </section>;
}

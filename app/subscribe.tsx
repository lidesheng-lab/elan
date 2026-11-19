const subscriptionLink = "https://material-index-ld.lidesheng.chatgpt.site/#subscribe";

export default function Subscribe() {
  return <section className="subscribe-section" aria-labelledby="subscribe-title">
    <div>
      <h2 id="subscribe-title">免费订阅</h2>
      <p>每周趋势与秀场选读。邮箱登记目前由原站处理。</p>
    </div>
    <a className="text-action" href={subscriptionLink} target="_blank" rel="noreferrer">前往订阅</a>
  </section>;
}

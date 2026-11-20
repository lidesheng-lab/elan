// Paste inside members.js, immediately before: if (!user && publicCommunity.has(action)) {
if (action === "guestCommunityCapabilities") return reply(200, { writing: true });
if (!user && ["communityPost", "communityComment", "communityPostRemove"].includes(action)) {
  const device = input.device;
  if (typeof device !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(device)) {
    return reply(400, { error: "请重新打开页面后再试。" });
  }
  const ip = event.requestContext?.sourceIp || event.requestContext?.identity?.sourceIp;
  const rateKey = typeof ip === "string" && ip ? hash(ip) : "unknown";
  const id = "guest-" + hash(device);
  if (action !== "communityPostRemove") {
    const limit = action === "communityPost" ? 12 : 40;
    const allowed = await store.atomic(tx => consumeLimit(tx, "guest-" + action + "-" + rateKey, limit, time));
    if (!allowed) return reply(429, { error: "提交较频繁，请稍后再试。" });
  }
  return community.handle(input, { id, guest: true, admin: false, canReact: true, rateKey }, reply);
}

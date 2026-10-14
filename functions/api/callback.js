// Decap CMS GitHub OAuth — callback: exchange code for token, redirect back to CMS
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const provider = url.searchParams.get("provider") || "github";
  const clientId = env.OAUTH_GITHUB_CLIENT_ID;
  const clientSecret = env.OAUTH_GITHUB_CLIENT_SECRET;
  if (!code) return new Response("Missing code", { status: 400 });
  if (!clientId || !clientSecret) {
    return new Response("Missing OAuth env vars", { status: 500 });
  }
  try {
    const r = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code
      })
    });
    const data = await r.json();
    if (data.error) return new Response(data.error_description || data.error, { status: 400 });
    const html = "<html><body><h1>Login successful — returning to the editor…</h1>"
      + "<script>"
      + "var p={token:'" + (data.access_token || "") + "',provider:'" + provider + "',"
      + "scope:'" + (data.scope || "") + "',type:'" + (data.token_type || "bearer") + "'};"
      + "try{window.opener.postMessage(p,window.opener.location.origin);window.close();}"
      + "catch(e){location.href=location.origin;} "
      + "</script></body></html>";
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch (e) {
    return new Response("OAuth callback failed: " + e.message, { status: 500 });
  }
}

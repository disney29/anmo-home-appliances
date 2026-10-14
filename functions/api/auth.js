// Decap CMS GitHub OAuth — auth entry: redirect to GitHub authorize
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const provider = url.searchParams.get("provider") || "github";
  const scope = url.searchParams.get("scope") || "repo";
  const redirectUri = url.searchParams.get("redirect_uri") || (url.origin + "/api/callback?provider=" + provider);
  const clientId = env.OAUTH_GITHUB_CLIENT_ID;
  if (!clientId) {
    return new Response("Missing OAUTH_GITHUB_CLIENT_ID env var", { status: 500 });
  }
  const authUrl = "https://github.com/login/oauth/authorize"
    + "?client_id=" + encodeURIComponent(clientId)
    + "&redirect_uri=" + encodeURIComponent(redirectUri)
    + "&scope=" + encodeURIComponent(scope);
  return Response.redirect(authUrl, 302);
}

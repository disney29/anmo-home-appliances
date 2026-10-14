// Decap CMS GitHub OAuth — token refresh (GitHub tokens don't expire;
// this endpoint exists for CMS compatibility)
export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const refreshToken = url.searchParams.get("refresh_token");
  if (!refreshToken) {
    return new Response(JSON.stringify({ error: "Missing refresh_token" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  return new Response(JSON.stringify({ access_token: refreshToken, token_type: "bearer" }), {
    headers: { "Content-Type": "application/json" }
  });
}

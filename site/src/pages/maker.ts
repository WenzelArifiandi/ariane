// Redirect to homepage after Cloudflare Access authentication
// The homepage will detect the query param and auto-open the Maker menu
export async function GET() {
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/?maker=open'
    }
  });
}

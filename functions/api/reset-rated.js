const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function onRequestPost({ env }) {
  const { meta } = await env.DB.prepare(
    'UPDATE beers SET description = NULL, flavor_tags = NULL'
  ).run()
  return Response.json({ reset: meta?.changes ?? 0 }, { headers: CORS })
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function onRequestPatch({ params, request, env }) {
  const id = parseInt(params.id)
  const { rater, rating } = await request.json()

  if (!rater || rating == null) {
    return Response.json({ error: 'rater and rating required' }, { status: 400, headers: CORS })
  }

  const existing = await env.DB.prepare('SELECT * FROM beers WHERE id = ?').bind(id).first()
  if (!existing) {
    return Response.json({ error: 'not found' }, { status: 404, headers: CORS })
  }

  const ratings = JSON.parse(existing.ratings || '{}')
  ratings[rater] = rating

  const scores = Object.values(ratings).filter(v => v != null)
  const avg = scores.length ? +(scores.reduce((a, b) => a + b) / scores.length).toFixed(1) : null

  await env.DB.prepare(
    'UPDATE beers SET ratings = ?, avg = ?, rating_count = ? WHERE id = ?'
  ).bind(JSON.stringify(ratings), avg, scores.length, id).run()

  return Response.json({ ok: true, ratings, avg, ratingCount: scores.length }, { headers: CORS })
}

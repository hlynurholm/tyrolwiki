const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM beers ORDER BY id'
  ).all()

  const beers = results.map(r => ({
    id: r.id,
    name: r.name,
    style: r.style,
    brewery: r.brewery,
    country: r.country,
    abv: r.abv,
    ratings: JSON.parse(r.ratings || '{}'),
    avg: r.avg,
    ratingCount: r.rating_count,
  }))

  return Response.json(beers, { headers: CORS })
}

export async function onRequestPost({ request, env }) {
  const beer = await request.json()

  if (!beer.name || typeof beer.name !== 'string') {
    return Response.json({ error: 'name required' }, { status: 400, headers: CORS })
  }

  const maxRow = await env.DB.prepare('SELECT MAX(id) as maxId FROM beers').first()
  const nextId = (maxRow?.maxId ?? -1) + 1

  await env.DB.prepare(
    'INSERT INTO beers (id, name, style, brewery, country, abv, ratings, avg, rating_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    nextId,
    beer.name,
    beer.style ?? null,
    beer.brewery ?? null,
    beer.country ?? null,
    beer.abv ?? null,
    JSON.stringify(beer.ratings ?? {}),
    beer.avg ?? null,
    beer.ratingCount ?? 0,
  ).run()

  return Response.json({ id: nextId }, { status: 201, headers: CORS })
}

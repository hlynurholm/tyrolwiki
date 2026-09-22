import { extractTags, normalize } from '../lib/flavor.js'
import { fetchDescription } from '../lib/vinbudin.js'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const BATCH = 10 // fetched one at a time: Vínbúðin 429s on parallel bursts

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS })
}

// Match rated beers to the Vínbúðin catalog by name+brewery and scrape their tasting notes.
// Batched; call repeatedly until done.
export async function onRequestPost({ env }) {
  const [{ results: beers }, { results: vbBeers }] = await Promise.all([
    env.DB.prepare(`SELECT id, name, brewery FROM beers WHERE description IS NULL LIMIT ${BATCH}`).all(),
    env.DB.prepare('SELECT id, name, brewery FROM vinbudin_beers').all(),
  ])

  const done = []
  for (const beer of beers) {
    const match = findBestMatch(beer, vbBeers)
    try {
      const desc = match ? await fetchDescription(match.id) : null
      done.push({ id: beer.id, name: beer.name, matched: !!match, desc: desc ?? '', tags: extractTags(desc) })
    } catch { break } // rate limited: leave the rest NULL for the next call
  }

  const stmt = env.DB.prepare('UPDATE beers SET description = ?, flavor_tags = ? WHERE id = ?')
  if (done.length) await env.DB.batch(done.map(v => stmt.bind(v.desc, JSON.stringify(v.tags), v.id)))

  const { count: remaining } = await env.DB.prepare('SELECT COUNT(*) as count FROM beers WHERE description IS NULL').first()
  return Response.json({
    enriched: done.filter(v => v.tags.length).length,
    notFound: done.filter(v => !v.matched).map(v => v.name),
    remaining, done: remaining === 0,
  }, { headers: CORS })
}

function nameSim(a, b) {
  const na = normalize(a), nb = normalize(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.9
  const ta = new Set(na.split(' ').filter(t => t.length > 2))
  const tb = new Set(nb.split(' ').filter(t => t.length > 2))
  if (!ta.size || !tb.size) return 0
  let overlap = 0
  for (const t of ta) if (tb.has(t)) overlap++
  return overlap / Math.max(ta.size, tb.size)
}

function brewerySim(a, b) {
  const na = normalize(a ?? ''), nb = normalize(b ?? '')
  if (!na || !nb) return 0
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.8
  return 0
}

function findBestMatch(beer, vbBeers) {
  let best = null, bestScore = 0.6
  for (const vb of vbBeers) {
    const ns = nameSim(beer.name, vb.name)
    if (ns < 0.6) continue
    const score = ns * 0.7 + brewerySim(beer.brewery, vb.brewery) * 0.3
    if (score > bestScore) { bestScore = score; best = vb }
  }
  return best
}

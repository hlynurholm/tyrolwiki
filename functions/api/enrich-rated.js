import { extractTags, normalize } from '../lib/flavor.js'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function onRequestPost({ env }) {
  // Get rated beers missing descriptions
  const { results: beers } = await env.DB.prepare(
    'SELECT id, name, brewery FROM beers WHERE description IS NULL'
  ).all()

  if (!beers || beers.length === 0) {
    return Response.json({ enriched: 0, notFound: [], done: true }, { headers: CORS })
  }

  // Get the Vínbúðin catalog to match against (has product IDs we can use to fetch pages)
  const { results: vbBeers } = await env.DB.prepare(
    'SELECT id, name, brewery FROM vinbudin_beers'
  ).all()

  // For each rated beer, find the best Vínbúðin match by name+brewery
  const matches = beers.map(b => {
    const match = findBestMatch(b, vbBeers)
    return { beer: b, vbId: match?.id ?? null }
  })

  const toFetch = matches.filter(m => m.vbId !== null)
  const notFound = matches.filter(m => m.vbId === null)

  // Mark unmatched beers with empty description so they don't keep blocking the queue
  await Promise.all(notFound.map(({ beer }) =>
    env.DB.prepare('UPDATE beers SET description = ?, flavor_tags = ? WHERE id = ?')
      .bind('', '[]', beer.id).run().catch(() => {})
  ))

  // Fetch product pages concurrently
  const fetched = await Promise.allSettled(
    toFetch.map(async ({ beer, vbId }) => {
      const res = await fetch(
        `https://www.vinbudin.is/heim/vorur/stoek-vara.aspx/?productid=${vbId}`,
        { headers: { 'User-Agent': UA, Accept: 'text/html', 'Accept-Language': 'is,en;q=0.9' } }
      )
      if (!res.ok) return { id: beer.id, desc: '', tags: [] }
      const html = await res.text()
      const desc = extractDescription(html)
      return { id: beer.id, desc, tags: extractTags(desc) }
    })
  )

  let enriched = 0
  for (const r of fetched) {
    if (r.status !== 'fulfilled' || !r.value) continue
    const { id, desc, tags } = r.value
    try {
      await env.DB.prepare(
        'UPDATE beers SET description = ?, flavor_tags = ? WHERE id = ?'
      ).bind(desc ?? '', JSON.stringify(tags), id).run()
      enriched++
    } catch (e) { /* skip */ }
  }

  return Response.json({ enriched, notFound: notFound.map(m => m.beer.name), remaining: beers.length - enriched }, { headers: CORS })
}

function extractDescription(html) {
  const m = html.match(/class="hidden entire-text"[^>]*>\s*<p>([\s\S]*?)<\/p>/i)
  if (m) {
    const text = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    if (text.length > 5) return text
  }
  return null
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
  let best = null, bestScore = 0.6 // minimum threshold
  for (const vb of vbBeers) {
    const ns = nameSim(beer.name, vb.name)
    if (ns < 0.6) continue
    const bs = brewerySim(beer.brewery, vb.brewery)
    const score = ns * 0.7 + bs * 0.3
    if (score > bestScore) { bestScore = score; best = vb }
  }
  return best
}

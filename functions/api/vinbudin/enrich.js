import { extractTags } from '../../lib/flavor.js'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const BATCH = 20

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function onRequestPost({ env }) {
  // Grab next batch of beers missing a description
  const { results: beers } = await env.DB.prepare(
    `SELECT id FROM vinbudin_beers WHERE description IS NULL ORDER BY id LIMIT ${BATCH}`
  ).all()

  if (!beers || beers.length === 0) {
    const { count } = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM vinbudin_beers'
    ).first()
    return Response.json({ enriched: 0, remaining: 0, total: count, done: true }, { headers: CORS })
  }

  // Fetch all pages concurrently
  const fetched = await Promise.allSettled(
    beers.map(async ({ id }) => {
      const res = await fetch(
        `https://www.vinbudin.is/heim/vorur/stoek-vara.aspx/?productid=${id}`,
        { headers: { 'User-Agent': UA, Accept: 'text/html', 'Accept-Language': 'is,en;q=0.9' } }
      )
      if (!res.ok) return null
      const html = await res.text()
      const desc = extractDescription(html)
      return { id, desc, tags: extractTags(desc) }
    })
  )

  // Write results to DB
  let enriched = 0
  for (const r of fetched) {
    if (r.status !== 'fulfilled' || !r.value) continue
    const { id, desc, tags } = r.value
    try {
      await env.DB.prepare(
        'UPDATE vinbudin_beers SET description = ?, flavor_tags = ? WHERE id = ?'
      ).bind(desc ?? '', JSON.stringify(tags), id).run()
      enriched++
    } catch (e) { /* skip */ }
  }

  const { count: remaining } = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM vinbudin_beers WHERE description IS NULL'
  ).first()

  return Response.json({ enriched, remaining, done: remaining === 0 }, { headers: CORS })
}

function extractDescription(html) {
  // First <p> inside .hidden.entire-text is the specific tasting notes
  const m = html.match(/class="hidden entire-text"[^>]*>\s*<p>([\s\S]*?)<\/p>/i)
  if (m) {
    const text = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    if (text.length > 5) return text
  }
  return null
}

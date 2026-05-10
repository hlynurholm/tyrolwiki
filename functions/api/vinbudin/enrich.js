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
    `SELECT id, image_url FROM vinbudin_beers WHERE description IS NULL ORDER BY id LIMIT ${BATCH}`
  ).all()

  if (!beers || beers.length === 0) {
    const { count } = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM vinbudin_beers'
    ).first()
    return Response.json({ enriched: 0, remaining: 0, total: count, done: true }, { headers: CORS })
  }

  // Fetch product pages and check image URLs concurrently
  const fetched = await Promise.allSettled(
    beers.map(async ({ id, image_url }) => {
      const [res, imgRes] = await Promise.all([
        fetch(
          `https://www.vinbudin.is/heim/vorur/stoek-vara.aspx/?productid=${id}`,
          { headers: { 'User-Agent': UA, Accept: 'text/html', 'Accept-Language': 'is,en;q=0.9' } }
        ),
        image_url ? fetch(image_url, { method: 'HEAD' }) : Promise.resolve({ ok: false }),
      ])
      if (!res.ok) return null
      const html = await res.text()
      const desc = extractDescription(html)
      const inStock = isAvailable(html)
      const hasImage = imgRes.ok
      return { id, desc, tags: extractTags(desc), inStock, hasImage }
    })
  )

  // Write results to DB
  let enriched = 0
  for (const r of fetched) {
    if (r.status !== 'fulfilled' || !r.value) continue
    const { id, desc, tags, inStock, hasImage } = r.value
    try {
      await env.DB.prepare(
        'UPDATE vinbudin_beers SET description = ?, flavor_tags = ?, in_stock = ?, has_image = ? WHERE id = ?'
      ).bind(desc ?? '', JSON.stringify(tags), inStock ? 1 : 0, hasImage ? 1 : 0, id).run()
      enriched++
    } catch (e) { /* skip */ }
  }

  const { count: remaining } = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM vinbudin_beers WHERE description IS NULL'
  ).first()

  return Response.json({ enriched, remaining, done: remaining === 0 }, { headers: CORS })
}

function extractDescription(html) {
  const m = html.match(/class="hidden entire-text"[^>]*>\s*<p>([\s\S]*?)<\/p>/i)
  if (m) {
    const text = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    if (text.length > 5) return text
  }
  return null
}

function isAvailable(html) {
  if (html.includes('Vara hættir')) return false
  if (html.includes('Því miður er varan hvergi fáanleg')) return false
  const tableMatch = html.match(/<table[^>]*TableStockStatusHofudborgarsvaedid[^>]*>([\s\S]*?)<\/table>/i)
  if (!tableMatch) return false
  const rowRe = /<a[^>]*>([^<]+)<\/a><\/td><td[^>]*stockstatus[^>]*>(\d+)\s+stykki/gi
  let m
  while ((m = rowRe.exec(tableMatch[1])) !== null) {
    if (parseInt(m[2], 10) > 0) return true
  }
  return false
}

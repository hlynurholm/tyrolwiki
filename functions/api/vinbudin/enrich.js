import { extractTags } from '../../lib/flavor.js'
import { fetchDescription } from '../../lib/vinbudin.js'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const BATCH = 10 // fetched one at a time: Vínbúðin 429s on parallel bursts

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS })
}

// Scrape tasting notes + verify image for beers not yet enriched. Call repeatedly until done.
export async function onRequestPost({ env }) {
  const { results: beers } = await env.DB.prepare(
    `SELECT id, image_url FROM vinbudin_beers WHERE description IS NULL ORDER BY id LIMIT ${BATCH}`
  ).all()

  const done = []
  for (const { id, image_url } of beers) {
    try {
      const [desc, img] = await Promise.all([
        fetchDescription(id),
        fetch(image_url, { method: 'HEAD', redirect: 'manual' }).catch(() => null),
      ])
      // missing images redirect to a generic placeholder (or come back empty), so require a real 200 with a body
      const hasImage = img?.status === 200 && Number(img.headers.get('content-length')) > 0 ? 1 : 0
      done.push({ id, desc: desc ?? '', tags: extractTags(desc), hasImage })
    } catch { break } // rate limited: leave the rest NULL for the next call
  }

  const stmt = env.DB.prepare('UPDATE vinbudin_beers SET description = ?, flavor_tags = ?, has_image = ? WHERE id = ?')
  if (done.length) await env.DB.batch(done.map(v => stmt.bind(v.desc, JSON.stringify(v.tags), v.hasImage, v.id)))

  const { count: remaining } = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM vinbudin_beers WHERE description IS NULL'
  ).first()
  return Response.json({ enriched: done.length, remaining, done: remaining === 0 }, { headers: CORS })
}

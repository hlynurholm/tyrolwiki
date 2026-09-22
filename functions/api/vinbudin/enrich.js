import { extractTags } from '../../lib/flavor.js'
import { fetchDescription } from '../../lib/vinbudin.js'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const BATCH = 15 // 2 subrequests per beer; stay well under the Workers per-invocation limit

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS })
}

// Scrape tasting notes + verify image for beers not yet enriched. Call repeatedly until done.
export async function onRequestPost({ env }) {
  const { results: beers } = await env.DB.prepare(
    `SELECT id, image_url FROM vinbudin_beers WHERE description IS NULL ORDER BY id LIMIT ${BATCH}`
  ).all()

  const fetched = await Promise.allSettled(beers.map(async ({ id, image_url }) => {
    const [desc, img] = await Promise.all([
      fetchDescription(id),
      fetch(image_url, { method: 'HEAD', redirect: 'manual' }).catch(() => null),
    ])
    // missing images redirect to a generic placeholder (or come back empty), so require a real 200 with a body
    const hasImage = img?.status === 200 && Number(img.headers.get('content-length')) > 0 ? 1 : 0
    return { id, desc: desc ?? '', tags: extractTags(desc), hasImage }
  }))

  const stmt = env.DB.prepare('UPDATE vinbudin_beers SET description = ?, flavor_tags = ?, has_image = ? WHERE id = ?')
  const writes = fetched.filter(r => r.status === 'fulfilled')
    .map(({ value: v }) => stmt.bind(v.desc, JSON.stringify(v.tags), v.hasImage, v.id))
  if (writes.length) await env.DB.batch(writes)

  const { count: remaining } = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM vinbudin_beers WHERE description IS NULL'
  ).first()
  return Response.json({ enriched: writes.length, remaining, done: remaining === 0 }, { headers: CORS })
}

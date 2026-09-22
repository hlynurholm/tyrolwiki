import { fetchCatalog, fetchCapitalStock, mapStyle, migrate, IMAGE_BASE, PRODUCT_BASE } from '../../lib/vinbudin.js'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function onRequestPost({ env }) {
  let products, stock
  try {
    await migrate(env)
    ;[products, stock] = await Promise.all([fetchCatalog(), fetchCapitalStock()])
  } catch (err) {
    return Response.json({ error: `Failed to fetch from Vinbudin: ${err.message}` }, { status: 502, headers: CORS })
  }

  // individual bottles/cans only — no kegs, gift boxes, special orders, multi-packs
  const bottles = products.filter(p => {
    const ct = (p.ProductContainerType ?? '').toUpperCase()
    if (ct.startsWith('KÚT') || ct.startsWith('KUT') || ct === 'GIFT' || ct === 'ASKJA') return false
    if (p.ProductIsSpecialOrder) return false
    const name = (p.ProductName ?? '').toLowerCase()
    return !['advent', 'dagatal', 'gjafapakk', 'pakki'].some(w => name.includes(w))
  })

  const now = new Date().toISOString()
  // upsert so description/flavor_tags from enrich survive a re-sync
  const stmt = env.DB.prepare(`
    INSERT INTO vinbudin_beers (id, name, brewery, style, abv, image_url, product_url, synced_at, in_stock, price, volume)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name, brewery = excluded.brewery, style = excluded.style, abv = excluded.abv,
      image_url = excluded.image_url, product_url = excluded.product_url, synced_at = excluded.synced_at,
      in_stock = excluded.in_stock, price = excluded.price, volume = excluded.volume`)

  const batch = bottles.map(p => {
    const id = String(p.ProductID)
    return stmt.bind(
      id, p.ProductName ?? '', p.ProductProducer ?? null, mapStyle(p.ProductTasteGroup2),
      p.ProductAlchoholVolume ?? null, `${IMAGE_BASE}/${id}_r.jpg`, `${PRODUCT_BASE}${id}/`, now,
      stock.has(id) ? 1 : 0, p.ProductPrice ?? null, p.ProductBottledVolume ?? null,
    )
  })
  if (batch.length) await env.DB.batch(batch)
  await env.DB.prepare('DELETE FROM vinbudin_beers WHERE synced_at != ?').bind(now).run()

  const inStock = batch.filter((_, i) => stock.has(String(bottles[i].ProductID))).length
  return Response.json({ ok: true, synced: batch.length, inStock, syncedAt: now }, { headers: CORS })
}

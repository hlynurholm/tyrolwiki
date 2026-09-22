import { fetchCatalog, CAPITAL_SHOPS } from '../../../lib/vinbudin.js'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS })
}

// Live per-store stock for one beer across the capital region; details come from the synced row
export async function onRequestGet({ params, env }) {
  const id = params.id
  const row = await env.DB.prepare('SELECT description, price, volume FROM vinbudin_beers WHERE id = ?').bind(id).first()
  const details = {
    description: row?.description || null,
    price: row?.price != null ? `${Math.round(row.price)} kr` : null,
    volume: row?.volume != null ? `${Math.round(row.volume)} ml` : null,
  }

  try {
    const perShop = await Promise.all(
      Object.entries(CAPITAL_SHOPS).map(async ([code, name]) => {
        const p = (await fetchCatalog(code)).find(p => String(p.ProductID) === id)
        return { name, stock: p?.ProductStoreSelected?.Quantity ?? 0 }
      })
    )
    const stores = perShop.filter(s => s.stock > 0).sort((a, b) => b.stock - a.stock)
    await env.DB.prepare('UPDATE vinbudin_beers SET in_stock = ? WHERE id = ?').bind(stores.length ? 1 : 0, id).run()
    return Response.json({ stores, ...details }, { headers: CORS })
  } catch (err) {
    return Response.json({ stores: [], ...details, error: err.message }, { headers: CORS })
  }
}

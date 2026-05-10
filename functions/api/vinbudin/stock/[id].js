const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const STORES_API = 'https://www.vinbudin.is/addons/origo/module/ajaxwebservices/search.asmx/getProductStores'

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function onRequestGet({ params }) {
  const productId = params.id
  try {
    const res = await fetch(`${STORES_API}?productID=${encodeURIComponent(productId)}`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Referer': 'https://www.vinbudin.is/heim/vorur/stoek-vara.aspx/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    })
    if (!res.ok) throw new Error(`Vinbudin returned ${res.status}`)
    const envelope = await res.json()
    const raw = typeof envelope.d === 'string' ? JSON.parse(envelope.d) : envelope.d
    const list = Array.isArray(raw) ? raw : (raw?.data ?? raw?.Stores ?? [])
    const stores = list
      .map(s => ({
        name: s.StoreName ?? s.Name ?? s.name ?? '',
        stock: s.Quantity ?? s.ProductStock ?? s.Count ?? s.count ?? 0,
      }))
      .filter(s => s.stock > 0)
      .sort((a, b) => b.stock - a.stock)
    return Response.json({ stores }, { headers: CORS })
  } catch (err) {
    return Response.json({ stores: [], error: err.message }, { headers: CORS })
  }
}

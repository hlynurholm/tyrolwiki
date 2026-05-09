const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const IMAGE_BASE = 'https://www.vinbudin.is/Portaldata/1/Resources/vorumyndir/medium'
const PRODUCT_BASE = 'https://www.vinbudin.is/heim/vorur/stoek-vara.aspx/?productid='
const API_URL = 'https://www.vinbudin.is/addons/origo/module/ajaxwebservices/search.asmx/DoSearch?skip=0&count=99999&category=beer'

// Map Vinbudin's TasteGroup2 codes to readable style names
const STYLE_MAP = {
  'PILSNER': 'Pilsner', 'LAGER': 'Lager', 'LITE': 'Light Lager',
  'DUNKEL': 'Dunkel', 'BOCK': 'Bock', 'MARZEN': 'Märzen',
  'NEIPA': 'NEIPA', 'IPA': 'IPA', 'DIPA': 'Double IPA',
  'SESSION IPA': 'Session IPA', 'BLACK IPA': 'Black IPA',
  'PALE ALE': 'Pale Ale', 'APA': 'APA', 'GOLDEN ALE': 'Golden Ale',
  'AMBER ALE': 'Amber Ale', 'RED ALE': 'Red Ale', 'STOUT': 'Stout',
  'PORTER': 'Porter', 'WHEAT': 'Wheat Beer', 'HEFEWEIZEN': 'Hefeweizen',
  'WITBIER': 'Witbier', 'SAISON': 'Saison', 'FARMHOUSE': 'Farmhouse Ale',
  'BELGIAN ALE': 'Belgian Ale', 'TRIPEL': 'Tripel', 'DUBBEL': 'Dubbel',
  'QUADRUPEL': 'Quadrupel', 'BARLEYWINE': 'Barleywine', 'SOUR': 'Sour',
  'GEUZE': 'Geuze', 'LAMBIC': 'Lambic', 'FRUIT': 'Fruit Beer',
  'CIDER': 'Cider', 'ANNARHV': 'Wheat Beer', 'ANNARLL': 'Lager',
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function onRequestPost({ env }) {
  let products
  try {
    const res = await fetch(API_URL, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Referer': 'https://www.vinbudin.is/heim/vorur/vorur.aspx/?category=beer',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    })
    if (!res.ok) throw new Error(`Vinbudin returned ${res.status}`)
    const envelope = await res.json()
    const inner = JSON.parse(envelope.d)
    products = inner.data ?? inner.Products ?? []
  } catch (err) {
    return Response.json({ error: `Failed to fetch from Vinbudin: ${err.message}` }, { status: 502, headers: CORS })
  }

  // filter out kegs, gift packs, and special orders — just individual bottles/cans
  const bottles = products.filter(p => {
    const ct = (p.ProductContainerType ?? '').toUpperCase()
    if (ct === 'KÚT.' || ct === 'KUT.' || ct === 'GIFT') return false
    if (p.ProductIsSpecialOrder) return false
    // skip advent calendars and multi-packs by name
    const name = (p.ProductName ?? '').toLowerCase()
    if (name.includes('advent') || name.includes('dagatal') || name.includes('gávupakk') || name.includes('pakki')) return false
    return true
  })

  const now = new Date().toISOString()

  // clear old data before inserting fresh records
  await env.DB.prepare('DELETE FROM vinbudin_beers').run()

  const stmt = env.DB.prepare(
    'INSERT INTO vinbudin_beers (id, name, brewery, style, abv, image_url, product_url, synced_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  )

  const batch = bottles.map(p => {
    const id = String(p.ProductID ?? '')
    const name = p.ProductName ?? ''
    const brewery = p.ProductProducer ?? null
    const rawStyle = (p.ProductTasteGroup2 ?? p.ProductSubCategory ?? '').toUpperCase().trim()
    const style = STYLE_MAP[rawStyle] ?? (rawStyle ? rawStyle.charAt(0) + rawStyle.slice(1).toLowerCase() : null)
    const abv = p.ProductAlchoholVolume ?? null
    const imageUrl = id ? `${IMAGE_BASE}/${id}_r.jpg` : null
    const productUrl = id ? `${PRODUCT_BASE}${id}/` : null
    return stmt.bind(id, name, brewery, style, abv, imageUrl, productUrl, now)
  })

  if (batch.length > 0) {
    await env.DB.batch(batch)
  }

  return Response.json({ ok: true, synced: batch.length, syncedAt: now }, { headers: CORS })
}

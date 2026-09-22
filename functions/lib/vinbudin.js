// Vínbúðin search API. The product page HTML no longer carries stock (rendered client-side),
// so stock comes from DoSearch?shop=<postcode>, which returns each product's quantity in that store.
const API = 'https://www.vinbudin.is/addons/origo/module/ajaxwebservices/search.asmx/DoSearch'
export const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
export const IMAGE_BASE = 'https://www.vinbudin.is/Portaldata/1/Resources/vorumyndir/medium'
export const PRODUCT_BASE = 'https://www.vinbudin.is/heim/vorur/stoek-vara.aspx/?productid='

// shop code == store post code
export const CAPITAL_SHOPS = {
  101: 'Austurstræti', 103: 'Kringlan', 104: 'Skútuvogur', 108: 'Skeifan',
  109: 'Álfabakki', 110: 'Heiðrún', 112: 'Spöngin', 170: 'Eiðistorg',
  200: 'Dalvegur', 210: 'Garðabær', 220: 'Hafnarfjörður', 270: 'Mosfellsbær',
}

// ProductTasteGroup2 codes as the API actually returns them
const STYLE_MAP = {
  PILSNER: 'Pilsner', PREMIUM: 'Lager', STANDARD: 'Lager', CLASSIC: 'Lager', EXPORT: 'Lager',
  LITE: 'Light Lager', HELLES: 'Helles Lager', ADJUNKT: 'Lager', ANNARL: 'Lager', ANNARLL: 'Lager',
  STERKUR: 'Strong Lager', HUML: 'Hoppy Lager', DUNKEL: 'Dunkel', MARZEN: 'Märzen', BOCK: 'Bock',
  KÖLSCH: 'Kölsch', IPA: 'IPA', NEIPA: 'NEIPA', DIPA: 'Double IPA', SESSION: 'Session IPA',
  PALE: 'Pale Ale', GOLDEN: 'Golden Ale', AMBER: 'Amber Ale', RED: 'Red Ale',
  STRONGALE: 'Strong Ale', BLONDE: 'Blonde', TRIPEL: 'Tripel', QUAD: 'Quadrupel',
  STOUT: 'Stout', PORTER: 'Porter', IMPERIAL: 'Imperial Stout',
  HEFE: 'Hefeweizen', WIT: 'Witbier', DUNKELW: 'Dunkelweizen', ANNARHV: 'Wheat Beer',
  SUR: 'Sour', GEUZE: 'Geuze', FLANDERS: 'Flanders Red', GOSE: 'Gose', ÁVAXTABJÓR: 'Fruit Beer',
}

export function mapStyle(raw) {
  const key = (raw ?? '').toUpperCase().trim()
  if (!key) return null
  return STYLE_MAP[key] ?? key.charAt(0) + key.slice(1).toLowerCase()
}

export async function fetchCatalog(shop) {
  const url = `${API}?skip=0&count=99999&category=beer${shop ? `&shop=${shop}` : ''}`
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': UA,
      Referer: 'https://www.vinbudin.is/heim/vorur/vorur.aspx/?category=beer',
    },
  })
  if (!res.ok) throw new Error(`Vinbudin returned ${res.status}`)
  const inner = JSON.parse((await res.json()).d)
  return inner.data ?? []
}

// Map<productId, [{ name, stock }]> across all capital-region stores
export async function fetchCapitalStock() {
  const perShop = await Promise.all(
    Object.entries(CAPITAL_SHOPS).map(async ([code, name]) => [name, await fetchCatalog(code)])
  )
  const stock = new Map()
  for (const [name, products] of perShop) {
    for (const p of products) {
      const qty = p.ProductStoreSelected?.Quantity ?? 0
      if (qty <= 0) continue
      const id = String(p.ProductID)
      if (!stock.has(id)) stock.set(id, [])
      stock.get(id).push({ name, stock: qty })
    }
  }
  for (const list of stock.values()) list.sort((a, b) => b.stock - a.stock)
  return stock
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

// Product page still has the tasting notes; returns null when the page has none.
// Vínbúðin rate-limits bursts (429), so back off and retry; throws if it never clears.
export async function fetchDescription(id) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`${PRODUCT_BASE}${id}`, {
      headers: { 'User-Agent': UA, Accept: 'text/html', 'Accept-Language': 'is,en;q=0.9' },
    })
    if (res.status === 429) { await sleep(1500 * (attempt + 1)); continue }
    if (!res.ok) return null
    const m = (await res.text()).match(/class="hidden entire-text"[^>]*>\s*<p>([\s\S]*?)<\/p>/i)
    if (!m) return null
    const text = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    return text.length > 5 ? text : null
  }
  throw new Error('rate limited')
}

// Idempotent column additions; "duplicate column" means already applied
export async function migrate(env) {
  const cols = [
    ['beers', 'description TEXT'], ['beers', 'flavor_tags TEXT'],
    ['vinbudin_beers', 'description TEXT'], ['vinbudin_beers', 'flavor_tags TEXT'],
    ['vinbudin_beers', 'in_stock INTEGER DEFAULT 1'], ['vinbudin_beers', 'has_image INTEGER DEFAULT 1'],
    ['vinbudin_beers', 'price REAL'], ['vinbudin_beers', 'volume REAL'],
  ]
  for (const [table, col] of cols) {
    await env.DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${col}`).run().catch(e => {
      if (!e.message.includes('duplicate')) throw e
    })
  }
}

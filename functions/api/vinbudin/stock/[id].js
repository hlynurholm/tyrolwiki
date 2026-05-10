const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function onRequestGet({ params, env }) {
  const productId = params.id
  try {
    const res = await fetch(
      `https://www.vinbudin.is/heim/vorur/stoek-vara.aspx/?productid=${productId}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'is,en;q=0.9',
          'Referer': 'https://www.vinbudin.is/heim/vorur/vorur.aspx/?category=beer',
        },
      }
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()

    // ── stores: capital region table ──────────────────────────────────────────
    const stores = []
    const tableMatch = html.match(/<table[^>]*TableStockStatusHofudborgarsvaedid[^>]*>([\s\S]*?)<\/table>/i)
    if (tableMatch) {
      const rowRe = /<a[^>]*>([^<]+)<\/a><\/td><td[^>]*stockstatus[^>]*>(\d+)\s+stykki/gi
      let m
      while ((m = rowRe.exec(tableMatch[1])) !== null) {
        const stock = parseInt(m[2], 10)
        if (stock > 0) stores.push({ name: m[1].trim(), stock })
      }
      stores.sort((a, b) => b.stock - a.stock)
    }

    // ── description: first <p> inside .hidden.entire-text ─────────────────��──
    let description = null
    const descMatch = html.match(/class="hidden entire-text"[^>]*>\s*<p>([\s\S]*?)<\/p>/i)
    if (descMatch) {
      description = descMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() || null
    }

    // ── price ─────────────────────────────────────────────────────────────────
    let price = null
    const priceMatch = html.match(/class="price"[^>]*>\s*(\d[\d.,]+)/)
    if (priceMatch) price = priceMatch[1].replace(/\./g, '').replace(',', '.') + ' kr'

    // ── volume ────────────────────────────────────────────────────────────────
    let volume = null
    const volMatch = html.match(/Eining\s*<\/[^>]+>\s*<[^>]+>\s*(\d+)\s*ml/i)
      ?? html.match(/Eining[^<]*?(\d{2,4})\s*ml/i)
    if (volMatch) volume = volMatch[1] + ' ml'

    if (stores.length === 0 && env?.DB) {
      await env.DB.prepare('UPDATE vinbudin_beers SET in_stock = 0 WHERE id = ?').bind(productId).run().catch(() => {})
    }

    return Response.json({ stores, description, price, volume }, { headers: CORS })
  } catch (err) {
    return Response.json({ stores: [], description: null, price: null, volume: null, error: err.message }, { headers: CORS })
  }
}

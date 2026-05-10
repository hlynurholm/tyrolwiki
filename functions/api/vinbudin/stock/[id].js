const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function onRequestGet({ params }) {
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

    // The capital region table has id="...TableStockStatusHofudborgarsvaedid"
    // Each row: <td class="...store">NUM <a href="...">Name</a></td><td class="...stockstatus">N stykki</td>
    const tableMatch = html.match(/<table[^>]*TableStockStatusHofudborgarsvaedid[^>]*>([\s\S]*?)<\/table>/i)
    if (!tableMatch) {
      return Response.json({ stores: [] }, { headers: CORS })
    }

    const stores = []
    const rowRe = /<a[^>]*>([^<]+)<\/a><\/td><td[^>]*stockstatus[^>]*>(\d+)\s+stykki/gi
    let m
    while ((m = rowRe.exec(tableMatch[1])) !== null) {
      const name = m[1].trim()
      const stock = parseInt(m[2], 10)
      if (stock > 0) stores.push({ name, stock })
    }

    return Response.json({ stores: stores.sort((a, b) => b.stock - a.stock) }, { headers: CORS })
  } catch (err) {
    return Response.json({ stores: [], error: err.message }, { headers: CORS })
  }
}

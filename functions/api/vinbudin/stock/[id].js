const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function onRequestGet({ params, request }) {
  const productId = params.id
  const debug = new URL(request.url).searchParams.has('debug')

  try {
    const url = `https://www.vinbudin.is/heim/vorur/stoek-vara.aspx/?productid=${productId}`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'is,en;q=0.9',
        'Referer': 'https://www.vinbudin.is/heim/vorur/vorur.aspx/?category=beer',
      },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const html = await res.text()

    // Strip scripts, styles, comments, then all tags → plain text
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#\d+;/g, ' ')
      .replace(/&[a-z]+;/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .trim()

    // Find "Höfuðborgarsvæðið" section
    const capitalIdx = text.indexOf('Höfuðborgarsvæðið')
    if (capitalIdx === -1) {
      return Response.json({
        stores: [],
        debug: debug ? text.slice(0, 3000) : undefined,
      }, { headers: CORS })
    }

    // Cut from just after the heading to the next region or a safe limit
    const afterHeading = text.slice(capitalIdx + 'Höfuðborgarsvæðið'.length)
    const otherRegions = ['Suðurnes', 'Vesturland', 'Vestfirðir', 'Norðurland', 'Austurland', 'Suðurland']
    let endIdx = Math.min(afterHeading.length, 6000)
    for (const r of otherRegions) {
      const i = afterHeading.indexOf(r)
      if (i > 0 && i < endIdx) endIdx = i
    }
    const section = afterHeading.slice(0, endIdx)

    // Each store entry looks like:  REY  Vínbúðin Austurstræti  12 stykki
    // The 3-letter code is 2–4 uppercase Icelandic letters, followed by
    // the store name (no digits), then a number and "stykki".
    const stores = []
    // We anchor on the "N stykki" part and grab everything before it on the same "chunk"
    const re = /\b([A-ZÁÉÍÓÚÝÞÆÖ]{2,4})\b\s+([\wÁÉÍÓÚÝÞÆÖáéíóúýþæö /\-\.]+?)\s+(\d+)\s+stykki/gi
    let m
    while ((m = re.exec(section)) !== null) {
      const name = m[2].replace(/\s+/g, ' ').trim()
      const stock = parseInt(m[3], 10)
      if (name.length >= 3 && stock > 0) {
        stores.push({ name, stock })
      }
    }

    return Response.json({
      stores: stores.sort((a, b) => b.stock - a.stock),
      debug: debug ? section.slice(0, 3000) : undefined,
    }, { headers: CORS })
  } catch (err) {
    return Response.json({ stores: [], error: err.message }, { headers: CORS })
  }
}

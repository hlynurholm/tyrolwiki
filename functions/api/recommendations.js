const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS })
}

function normalize(s) {
  if (!s) return ''
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function nameSimilarity(a, b) {
  const na = normalize(a)
  const nb = normalize(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.9

  const ta = new Set(na.split(' ').filter(t => t.length > 2))
  const tb = new Set(nb.split(' ').filter(t => t.length > 2))
  if (ta.size === 0 || tb.size === 0) return 0
  let overlap = 0
  for (const t of ta) if (tb.has(t)) overlap++
  return overlap / Math.max(ta.size, tb.size)
}

function brewerySimilarity(a, b) {
  const na = normalize(a)
  const nb = normalize(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.85
  return 0
}

function isTried(vb, triedBeers) {
  for (const tried of triedBeers) {
    const ns = nameSimilarity(vb.name, tried.name)
    const bs = brewerySimilarity(vb.brewery, tried.brewery)
    if (ns >= 0.9) return true
    if (ns >= 0.65 && bs >= 0.7) return true
  }
  return false
}

function scoreRecommendations(vinbudinBeers, triedBeers, filterBeers) {
  const styleScores = {}
  const styleCounts = {}
  for (const b of triedBeers) {
    if (!b.style || b.score == null) continue
    const s = normalize(b.style)
    styleScores[s] = (styleScores[s] ?? 0) + b.score
    styleCounts[s] = (styleCounts[s] ?? 0) + 1
  }
  const styleAvg = {}
  for (const s of Object.keys(styleScores)) {
    styleAvg[s] = styleScores[s] / styleCounts[s]
  }

  // top-rated examples per style for the match explanation
  const styleExamplesMap = {}
  for (const s of Object.keys(styleAvg)) {
    styleExamplesMap[s] = triedBeers
      .filter(b => normalize(b.style ?? '') === s && b.score != null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(b => ({ name: b.name, score: +b.score.toFixed(0) }))
  }

  return vinbudinBeers
    .filter(vb => !isTried(vb, filterBeers))
    .map(vb => {
      const ns = normalize(vb.style ?? '')
      let relevance = 50
      let matchedStyle = null

      if (ns) {
        if (styleAvg[ns] != null) {
          relevance = styleAvg[ns]
          matchedStyle = ns
        } else {
          for (const [style, avg] of Object.entries(styleAvg)) {
            if ((ns.includes(style) || style.includes(ns)) && avg > relevance) {
              relevance = avg
              matchedStyle = style
            }
          }
        }
      }

      const styleCount = matchedStyle ? (styleCounts[matchedStyle] ?? 0) : 0
      const styleExamples = matchedStyle ? (styleExamplesMap[matchedStyle] ?? []) : []

      return {
        ...vb,
        relevance: +relevance.toFixed(1),
        matchedStyle,
        styleCount,
        styleExamples,
      }
    })
    .sort((a, b) => b.relevance - a.relevance)
}

export async function onRequestGet({ env, request }) {
  const url = new URL(request.url)
  const rater = url.searchParams.get('rater') ?? null

  const [vbResult, beersResult] = await Promise.all([
    env.DB.prepare('SELECT * FROM vinbudin_beers ORDER BY name').all(),
    env.DB.prepare('SELECT name, brewery, style, avg, ratings FROM beers').all(),
  ])

  const vinbudinBeers = vbResult.results ?? []
  const allBeers = (beersResult.results ?? []).map(b => ({
    ...b,
    ratings: typeof b.ratings === 'string' ? JSON.parse(b.ratings) : (b.ratings ?? {}),
  }))

  if (vinbudinBeers.length === 0) {
    return Response.json({ recommendations: [], syncedAt: null, total: 0 }, { headers: CORS })
  }

  const syncedAt = vinbudinBeers[0]?.synced_at ?? null

  let recommendations
  if (rater) {
    // per-rater: score based only on this rater's ratings, filter beers they've personally tried
    const raterBeers = allBeers
      .filter(b => b.ratings[rater] != null)
      .map(b => ({ ...b, score: b.ratings[rater] }))
    recommendations = scoreRecommendations(vinbudinBeers, raterBeers, raterBeers)
  } else {
    // group: score based on overall avg, filter beers anyone has tried
    const groupBeers = allBeers
      .filter(b => b.avg != null)
      .map(b => ({ ...b, score: b.avg }))
    recommendations = scoreRecommendations(vinbudinBeers, groupBeers, allBeers)
  }

  return Response.json({ recommendations, syncedAt, total: vinbudinBeers.length }, { headers: CORS })
}

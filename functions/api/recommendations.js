import { normalize, getStyleFamily, abvBucket, bayesian } from '../lib/flavor.js'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS })
}

// ─── similarity helpers (for deduplication) ──────────────────────────────────

function nameSimilarity(a, b) {
  const na = normalize(a), nb = normalize(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.9
  const ta = new Set(na.split(' ').filter(t => t.length > 2))
  const tb = new Set(nb.split(' ').filter(t => t.length > 2))
  if (!ta.size || !tb.size) return 0
  let overlap = 0
  for (const t of ta) if (tb.has(t)) overlap++
  return overlap / Math.max(ta.size, tb.size)
}

function brewerySimilarity(a, b) {
  const na = normalize(a ?? ''), nb = normalize(b ?? '')
  if (!na || !nb) return 0
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.85
  return 0
}

function isTried(vb, triedBeers) {
  for (const t of triedBeers) {
    const ns = nameSimilarity(vb.name, t.name)
    if (ns >= 0.9) return true
    if (ns >= 0.65 && brewerySimilarity(vb.brewery, t.brewery) >= 0.7) return true
  }
  return false
}

// ─── stat builders ────────────────────────────────────────────────────────────

function buildStats(beers) {
  const style = {}, family = {}, abv = {}, brewery = {}, flavor = {}, pairs = {}

  for (const b of beers) {
    const s = b.score
    if (s == null) continue

    // style
    const ns = normalize(b.style ?? '')
    if (ns) acc(style, ns, s)

    // family
    const fam = getStyleFamily(ns)
    if (fam) acc(family, fam, s)

    // abv bucket
    const bkt = abvBucket(b.abv)
    if (bkt) acc(abv, bkt, s)

    // brewery
    const nb = normalize(b.brewery ?? '')
    if (nb) acc(brewery, nb, s)

    // flavor tags
    const tags = parseTags(b.flavor_tags)
    for (const t of tags) acc(flavor, t, s)

    // flavor pairs
    for (let i = 0; i < tags.length; i++) {
      for (let j = i + 1; j < tags.length; j++) {
        const key = [tags[i], tags[j]].sort().join('|')
        acc(pairs, key, s)
      }
    }
  }

  return { style, family, abv, brewery, flavor, pairs }
}

function acc(map, key, score) {
  if (!map[key]) map[key] = { sum: 0, count: 0 }
  map[key].sum += score
  map[key].count++
}

function parseTags(raw) {
  if (!raw) return []
  try { return JSON.parse(raw) } catch { return [] }
}

// ─── scoring ─────────────────────────────────────────────────────────────────

function scoreRecommendations(vinbudinBeers, triedBeers, filterBeers) {
  const stats = buildStats(triedBeers)

  const globalAvg = triedBeers.length > 0
    ? triedBeers.reduce((s, b) => s + (b.score ?? 0), 0) / triedBeers.length
    : 65

  function b(stat, key) {
    const e = stat[key]
    return e ? bayesian(e.sum, e.count, globalAvg) : null
  }

  // Pre-build style examples for the UI explanation
  function styleExamples(ns, fam) {
    return triedBeers
      .filter(b => normalize(b.style ?? '') === ns && b.score != null)
      .sort((a, c) => c.score - a.score)
      .slice(0, 3)
      .map(b => ({ name: b.name, score: +b.score.toFixed(0) }))
  }

  return vinbudinBeers
    .filter(vb => !isTried(vb, filterBeers))
    .map(vb => {
      const ns   = normalize(vb.style ?? '')
      const fam  = getStyleFamily(ns)
      const bkt  = abvBucket(vb.abv)
      const nb   = normalize(vb.brewery ?? '')
      const tags = parseTags(vb.flavor_tags)

      // ── STYLE SCORE (40%) ───────────────────────────────────────────────────
      const exactScore  = b(stats.style, ns)
      const familyScore = b(stats.family, fam)

      let styleScore, matchedStyle
      if (exactScore != null) {
        // 60% exact + 30% family + 10% global
        const fPart = familyScore ?? globalAvg
        styleScore  = 0.60 * exactScore + 0.30 * fPart + 0.10 * globalAvg
        matchedStyle = ns
      } else if (familyScore != null) {
        // No exact match: 80% family + 20% global (slight penalty)
        styleScore   = 0.80 * familyScore + 0.20 * globalAvg
        matchedStyle = fam + ' (family)'
      } else {
        styleScore   = globalAvg
        matchedStyle = null
      }

      // ── FLAVOR SCORE (45%) ──────────────────────────────────────────────────
      let flavorScore = null
      if (tags.length > 0) {
        const tagScores = tags.map(t => b(stats.flavor, t)).filter(v => v != null)
        if (tagScores.length > 0) {
          flavorScore = tagScores.reduce((s, v) => s + v, 0) / tagScores.length

          // Interaction lift (only pairs with ≥3 rated samples)
          let liftSum = 0, liftN = 0
          for (let i = 0; i < tags.length; i++) {
            for (let j = i + 1; j < tags.length; j++) {
              const key  = [tags[i], tags[j]].sort().join('|')
              const pair = stats.pairs[key]
              if (pair && pair.count >= 3) {
                const pairAvg  = bayesian(pair.sum, pair.count, globalAvg)
                const indivAvg = ((b(stats.flavor, tags[i]) ?? globalAvg) + (b(stats.flavor, tags[j]) ?? globalAvg)) / 2
                liftSum += pairAvg - indivAvg
                liftN++
              }
            }
          }
          if (liftN > 0) flavorScore += 0.30 * (liftSum / liftN)
        }
      }

      // ── ABV & BREWERY ───────────────────────────────────────────────────────
      const abvScore      = b(stats.abv, bkt) ?? globalAvg
      const breweryScore  = b(stats.brewery, nb) ?? globalAvg

      // ── COMBINE ─────────────────────────────────────────────────────────────
      let relevance
      if (flavorScore != null) {
        relevance = 0.40 * styleScore + 0.45 * flavorScore + 0.10 * abvScore + 0.05 * breweryScore
      } else {
        // Phase 1 only (no flavor data)
        relevance = 0.75 * styleScore + 0.15 * abvScore + 0.10 * breweryScore
      }
      relevance = Math.max(0, Math.min(100, relevance))

      const styleCount = ns && stats.style[ns] ? stats.style[ns].count : 0

      return {
        ...vb,
        relevance:    +relevance.toFixed(1),
        matchedStyle,
        styleCount,
        styleExamples: styleExamples(ns, fam),
      }
    })
    .sort((a, b) => b.relevance - a.relevance)
}

// ─── handler ──────────────────────────────────────────────────────────────────

export async function onRequestGet({ env, request }) {
  const url   = new URL(request.url)
  const rater = url.searchParams.get('rater') ?? null

  const [vbResult, beersResult] = await Promise.all([
    env.DB.prepare('SELECT * FROM vinbudin_beers ORDER BY name').all(),
    env.DB.prepare('SELECT name, brewery, style, abv, avg, ratings, description, flavor_tags FROM beers').all(),
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
    const raterBeers = allBeers
      .filter(b => b.ratings[rater] != null)
      .map(b => ({ ...b, score: b.ratings[rater] }))
    recommendations = scoreRecommendations(vinbudinBeers, raterBeers, raterBeers)
  } else {
    const groupBeers = allBeers
      .filter(b => b.avg != null)
      .map(b => ({ ...b, score: b.avg }))
    recommendations = scoreRecommendations(vinbudinBeers, groupBeers, allBeers)
  }

  return Response.json({ recommendations, syncedAt, total: vinbudinBeers.length }, { headers: CORS })
}

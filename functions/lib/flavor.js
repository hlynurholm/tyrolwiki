// Icelandic root → English flavor tag (substring match, lowercase)
export const FLAVOR_MAP = [
  ['beisk',      'bitter'],
  ['sæt',        'sweet'],   ['sykur',    'sweet'],
  ['súr',        'sour'],    ['edik',     'sour'],
  ['humal',      'hoppy'],
  ['malt',       'malty'],
  ['ávext',      'fruity'],  ['ávax',     'fruity'],
  ['sítró',      'citrus'],  ['appelsín', 'citrus'],
  ['greipald',   'citrus'],  ['lime',     'citrus'],
  ['mangó',      'tropical'],['ananas',   'tropical'],
  ['passion',    'tropical'],['kókos',    'tropical'],
  ['kirsuber',   'berry'],   ['hindber',  'berry'],
  ['brómber',    'berry'],   ['bláber',   'berry'],
  ['jarðarber',  'berry'],
  ['blóm',       'floral'],  ['lyktar',   'floral'],
  ['brauð',      'bready'],  ['hafrar',   'bready'],  ['kex', 'bready'],
  ['ristað',     'roasty'],  ['brennt',   'roasty'],
  ['kaffi',      'coffee'],
  ['súkkulaði',  'chocolate'],['kakó',    'chocolate'],
  ['karamel',    'caramel'],
  ['vaníl',      'vanilla'],
  ['krydd',      'spicy'],   ['pipar',    'spicy'],   ['kanill', 'spicy'],
  ['reyk',       'smoky'],
  ['hveiti',     'wheat'],
  ['ger',        'yeasty'],
  ['fura',       'piney'],   ['gran',     'piney'],
  ['jarðlæg',    'earthy'],
  ['ferskur',    'fresh'],   ['hreinn',   'clean'],
]

export function extractTags(description) {
  if (!description) return []
  const lower = description.toLowerCase()
  const found = new Set()
  for (const [kw, tag] of FLAVOR_MAP) {
    if (lower.includes(kw)) found.add(tag)
  }
  return [...found].sort()
}

// Style family map (normalized lowercase keys)
export const STYLE_FAMILIES = {
  lager:    ['lager', 'light lager', 'pilsner', 'rice lager', 'zwickel', 'marzen', 'bock', 'dunkel', 'european dark lager', 'annarll'],
  ipa:      ['ipa', 'session ipa', 'neipa', 'double ipa', 'dipa', 'nedipa', 'milkshake ipa', 'belgian ipa', 'black ipa'],
  'pale ale': ['pale ale', 'apa', 'golden ale', 'ale', 'kveik', 'saison', 'farmhouse ale', 'nordic saison', 'barleywine style ale'],
  amber:    ['amber ale', 'red ale', 'irish red ale'],
  wheat:    ['wheat beer', 'hefeweizen', 'weizen', 'witbier', 'white ale', 'hveitibjor', 'annarhv'],
  belgian:  ['belgian ale', 'blonde', 'tripel', 'dubbel', 'quadrupel', 'abbey ale', 'trappist'],
  dark:     ['stout', 'porter', 'imperial stout', 'milk stout', 'oatmeal stout', 'schwarzbier'],
  sour:     ['sour', 'geuze', 'lambic', 'berliner weisse', 'gose', 'flanders'],
}

export function getStyleFamily(ns) {
  if (!ns) return null
  for (const [family, styles] of Object.entries(STYLE_FAMILIES)) {
    if (styles.some(s => ns === s || ns.includes(s) || s.includes(ns))) return family
  }
  return null
}

export function normalize(s) {
  if (!s) return ''
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function abvBucket(abv) {
  if (abv == null) return null
  if (abv <= 3.5) return 'low'
  if (abv <= 5.5) return 'medium'
  if (abv <= 8.0) return 'strong'
  return 'very_strong'
}

export function bayesian(sum, count, globalAvg, k = 3) {
  return (sum + globalAvg * k) / (count + k)
}

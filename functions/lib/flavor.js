// Icelandic root → English flavor tag (substring match, lowercase only — accents preserved)
export const FLAVOR_MAP = [
  // bitter
  ['beisk',       'bitter'],
  // sweet
  ['sæt',         'sweet'],    ['sykur',     'sweet'],   ['hunang',    'sweet'],
  // sour / tart
  ['súr',         'sour'],     ['edik',      'sour'],    ['sýr',       'sour'],
  // hoppy
  ['humal',       'hoppy'],
  // malty / grainy
  ['malt',        'malty'],    ['barr',      'malty'],   ['korn',      'malty'],
  ['bygg',        'malty'],
  // fruity (general)
  ['ávext',       'fruity'],   ['ávax',      'fruity'],  ['epli',      'fruity'],
  ['pera',        'fruity'],   ['sveskj',    'fruity'],  ['plóm',      'fruity'],
  ['ferskj',      'fruity'],   ['nektarín',  'fruity'],
  // citrus
  ['sítró',       'citrus'],   ['appelsín',  'citrus'],  ['greipald',  'citrus'],
  ['lime',        'citrus'],   ['sítrón',    'citrus'],  ['líma',      'citrus'],
  // tropical
  ['mangó',       'tropical'], ['ananas',    'tropical'],['passion',   'tropical'],
  ['kókos',       'tropical'], ['guava',     'tropical'], ['tróp',     'tropical'],
  // berry
  ['kirsuber',    'berry'],    ['hindber',   'berry'],   ['brómber',   'berry'],
  ['bláber',      'berry'],    ['jarðarber', 'berry'],
  // floral
  ['blóm',        'floral'],   ['lyktar',    'floral'],  ['rósa',      'floral'],
  ['lavend',      'floral'],
  // bready
  ['brauð',       'bready'],   ['hafrar',    'bready'],  ['kex',       'bready'],
  ['bisk',        'bready'],
  // roasty
  ['ristað',      'roasty'],   ['brennt',    'roasty'],  ['kolin',     'roasty'],
  // coffee
  ['kaffi',       'coffee'],   ['espresso',  'coffee'],
  // chocolate
  ['súkkulaði',   'chocolate'],['kakó',      'chocolate'],
  // caramel
  ['karamel',     'caramel'],  ['toffee',    'caramel'],
  // vanilla
  ['vaníl',       'vanilla'],
  // spicy
  ['krydd',       'spicy'],    ['pipar',     'spicy'],   ['kanill',    'spicy'],
  ['negull',      'spicy'],    ['kóríand',   'spicy'],   ['múskat',    'spicy'],
  ['stjörnuanís', 'spicy'],    ['kardimóm',  'spicy'],
  // smoky
  ['reyk',        'smoky'],
  // wheat
  ['hveiti',      'wheat'],
  // yeasty
  ['ger',         'yeasty'],
  // piney / herbal
  ['fura',        'piney'],    ['gran',      'piney'],   ['jurt',      'piney'],
  // earthy
  ['jarðlæg',     'earthy'],   ['mold',      'earthy'],  ['sveppur',   'earthy'],
  // fresh / clean
  ['ferskur',     'fresh'],    ['hreinn',    'clean'],   ['ferskt',    'fresh'],
  ['gras',        'fresh'],
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
// Order matters: first family whose token appears in the style wins, so specific
// families come before the greedy 'ale' entry in pale ale.
export const STYLE_FAMILIES = {
  wheat:    ['wheat beer', 'hefeweizen', 'weizen', 'witbier', 'white ale', 'hveitibjor', 'annarhv'],
  ipa:      ['ipa', 'session ipa', 'neipa', 'double ipa', 'dipa', 'nedipa', 'milkshake ipa', 'belgian ipa', 'black ipa'],
  belgian:  ['belgian ale', 'blonde', 'tripel', 'dubbel', 'quadrupel', 'abbey ale', 'trappist', 'strong ale'],
  dark:     ['stout', 'porter', 'imperial stout', 'milk stout', 'oatmeal stout', 'schwarzbier'],
  sour:     ['sour', 'geuze', 'lambic', 'berliner weisse', 'gose', 'flanders'],
  amber:    ['amber ale', 'red ale', 'irish red ale'],
  lager:    ['lager', 'light lager', 'pilsner', 'rice lager', 'zwickel', 'marzen', 'bock', 'dunkel', 'european dark lager', 'annarll', 'kolsch', 'helles'],
  'pale ale': ['pale ale', 'apa', 'golden ale', 'ale', 'kveik', 'saison', 'farmhouse ale', 'nordic saison', 'barleywine style ale'],
}

export function getStyleFamily(ns) {
  if (!ns) return null
  for (const [family, styles] of Object.entries(STYLE_FAMILIES)) {
    if (styles.some(s => ns === s || ns.includes(s))) return family
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

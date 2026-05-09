import { readFileSync, writeFileSync } from 'fs'

const beers = JSON.parse(readFileSync('./src/data/beers.json', 'utf8'))

function esc(str) {
  return str ? str.replace(/'/g, "''") : null
}

function sqlVal(v) {
  if (v == null) return 'NULL'
  if (typeof v === 'number') return String(v)
  return "'" + esc(v) + "'"
}

const rows = beers.map(b => {
  const ratingsJson = JSON.stringify(b.ratings || {})
  return [
    b.id,
    sqlVal(b.name),
    sqlVal(b.style),
    sqlVal(b.brewery),
    sqlVal(b.country),
    sqlVal(b.abv),
    sqlVal(ratingsJson),
    sqlVal(b.avg),
    b.ratingCount || 0,
  ].join(', ')
}).map(row => `(${row})`)

const sql = `INSERT INTO beers (id, name, style, brewery, country, abv, ratings, avg, rating_count) VALUES\n${rows.join(',\n')};`

writeFileSync('seed.sql', sql)
console.log(`seed.sql written with ${beers.length} rows`)

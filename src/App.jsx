import { useState, useMemo } from 'react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  ScatterChart, Scatter, CartesianGrid,
} from 'recharts'
import beers from './data/beers.json'

const RATERS = ['Hlynur', 'Robert', 'Steinar', 'Palli']
const RATER_COLORS = { Hlynur: '#f59e0b', Robert: '#60a5fa', Steinar: '#a78bfa', Palli: '#34d399' }

function scoreColor(s) {
  if (s >= 85) return '#22c55e'
  if (s >= 70) return '#f59e0b'
  if (s >= 50) return '#f97316'
  return '#f87171'
}

function ScoreBadge({ score, size = 'md' }) {
  if (score == null) return <span style={{ color: 'var(--text3)', fontSize: 13 }}>–</span>
  const fs = size === 'lg' ? 22 : size === 'sm' ? 12 : 15
  return (
    <span style={{
      fontWeight: 700, fontSize: fs, color: scoreColor(score),
      fontVariantNumeric: 'tabular-nums',
    }}>{score.toFixed(1)}</span>
  )
}

function StatCard({ label, value, sub }) {
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 16, padding: '24px 28px', flex: 1, minWidth: 140,
    }}>
      <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: -1, color: 'var(--amber)' }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function SectionHeader({ children }) {
  return (
    <h2 style={{
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2,
      color: 'var(--text3)', marginBottom: 20,
    }}>{children}</h2>
  )
}

// ── COUNTRIES ───────────────────────────────────────────────────────────────
const FLAG_EMOJI = {
  Iceland: '🇮🇸', Belgium: '🇧🇪', Denmark: '🇩🇰', USA: '🇺🇸',
  Germany: '🇩🇪', UK: '🇬🇧', Scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', Mexico: '🇲🇽',
  Italy: '🇮🇹', 'Czech Republic': '🇨🇿', Sweden: '🇸🇪', Japan: '🇯🇵',
}

function CountriesSection() {
  const data = useMemo(() => {
    const map = {}
    beers.forEach(b => {
      if (!b.country) return
      if (!map[b.country]) map[b.country] = { country: b.country, count: 0, scores: [] }
      map[b.country].count++
      if (b.avg != null) map[b.country].scores.push(b.avg)
    })
    return Object.values(map)
      .map(c => ({ ...c, avg: c.scores.length ? Math.round(c.scores.reduce((a, b) => a + b) / c.scores.length * 10) / 10 : null }))
      .sort((a, b) => b.count - a.count)
  }, [])

  return (
    <section>
      <SectionHeader>By Country</SectionHeader>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
        {data.map(c => (
          <div key={c.country} style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '18px 20px',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div style={{ fontSize: 32 }}>{FLAG_EMOJI[c.country] || '🍺'}</div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{c.country}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text2)' }}>{c.count} beer{c.count !== 1 ? 's' : ''}</span>
              {c.avg != null && <ScoreBadge score={c.avg} size="sm" />}
            </div>
            <div style={{ height: 3, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 2,
                width: `${(c.count / data[0].count) * 100}%`,
                background: `linear-gradient(90deg, var(--amber), var(--amber-dim))`,
                backgroundColor: 'var(--amber)',
              }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── BREWERIES ────────────────────────────────────────────────────────────────
function BreweriesSection() {
  const data = useMemo(() => {
    const map = {}
    beers.forEach(b => {
      if (!b.brewery) return
      if (!map[b.brewery]) map[b.brewery] = { brewery: b.brewery, country: b.country, count: 0, scores: [] }
      map[b.brewery].count++
      if (b.avg != null) map[b.brewery].scores.push(b.avg)
    })
    return Object.values(map)
      .map(c => ({ ...c, avg: c.scores.length ? Math.round(c.scores.reduce((a, b) => a + b) / c.scores.length * 10) / 10 : null }))
      .sort((a, b) => b.count - a.count || (b.avg || 0) - (a.avg || 0))
      .slice(0, 15)
  }, [])

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <div style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>{d.brewery}</div>
        <div style={{ color: 'var(--text2)' }}>{d.count} beers · avg <span style={{ color: scoreColor(d.avg) }}>{d.avg}</span></div>
      </div>
    )
  }

  return (
    <section>
      <SectionHeader>Top Breweries</SectionHeader>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Top 5 podium */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.slice(0, 8).map((b, i) => (
            <div key={b.brewery} style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: i < 3 ? 'var(--amber-dim)' : 'var(--bg3)',
                border: i < 3 ? '1px solid var(--amber)' : '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, color: i < 3 ? 'var(--amber)' : 'var(--text3)',
                flexShrink: 0,
              }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.brewery}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>{FLAG_EMOJI[b.country] || ''} {b.country} · {b.count} beers</div>
              </div>
              {b.avg != null && <ScoreBadge score={b.avg} />}
            </div>
          ))}
        </div>
        {/* Bar chart */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 16px 12px' }}>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12, fontWeight: 600 }}>Beers per brewery</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} layout="vertical" margin={{ left: 0, right: 40, top: 0, bottom: 0 }}>
              <XAxis type="number" tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="brewery" tick={{ fill: 'var(--text2)', fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {data.map((_, i) => <Cell key={i} fill={i < 3 ? '#f59e0b' : '#1c1c28'} stroke={i < 3 ? '#f59e0b88' : '#ffffff11'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}

// ── STYLES ───────────────────────────────────────────────────────────────────
const STYLE_COLORS = [
  '#f59e0b','#60a5fa','#a78bfa','#34d399','#f97316',
  '#f43f5e','#06b6d4','#84cc16','#ec4899','#8b5cf6',
]

function StylesSection() {
  const data = useMemo(() => {
    const map = {}
    beers.forEach(b => {
      if (!b.style) return
      if (!map[b.style]) map[b.style] = { style: b.style, count: 0, scores: [] }
      map[b.style].count++
      if (b.avg != null) map[b.style].scores.push(b.avg)
    })
    return Object.values(map)
      .map(s => ({ ...s, avg: s.scores.length ? Math.round(s.scores.reduce((a, b) => a + b) / s.scores.length * 10) / 10 : null }))
      .sort((a, b) => b.count - a.count)
  }, [])

  const total = data.reduce((s, d) => s + d.count, 0)

  return (
    <section>
      <SectionHeader>By Style</SectionHeader>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.map((s, i) => (
            <div key={s.style} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: STYLE_COLORS[i % STYLE_COLORS.length], flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{s.style}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', width: 40, textAlign: 'right' }}>{Math.round(s.count / total * 100)}%</div>
              <div style={{ width: 60, height: 4, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${s.count / data[0].count * 100}%`, background: STYLE_COLORS[i % STYLE_COLORS.length], borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)', width: 16, textAlign: 'right' }}>{s.count}</div>
              {s.avg != null && <div style={{ width: 36, textAlign: 'right' }}><ScoreBadge score={s.avg} size="sm" /></div>}
            </div>
          ))}
        </div>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 16px 12px' }}>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12, fontWeight: 600 }}>Avg score by style</div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={[...data].sort((a, b) => (b.avg || 0) - (a.avg || 0)).filter(s => s.avg != null)} layout="vertical" margin={{ left: 0, right: 50, top: 0, bottom: 0 }}>
              <XAxis type="number" domain={[0, 100]} tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="style" tick={{ fill: 'var(--text2)', fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
              <Tooltip formatter={(v) => [v.toFixed(1), 'Avg score']} contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 8, fontSize: 12 }} itemStyle={{ color: 'var(--text)' }} labelStyle={{ color: 'var(--text)' }} />
              <Bar dataKey="avg" radius={[0, 4, 4, 0]}>
                {data.map((s, i) => <Cell key={i} fill={STYLE_COLORS[i % STYLE_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}

// ── RATERS ───────────────────────────────────────────────────────────────────
function RatersSection() {
  const stats = useMemo(() => RATERS.map(r => {
    const scores = beers.map(b => b.ratings[r]).filter(v => v != null)
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    const sorted = [...scores].sort((a, b) => a - b)
    return {
      name: r,
      count: scores.length,
      avg: Math.round(avg * 10) / 10,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      harsh: scores.filter(s => s < 40).length,
      generous: scores.filter(s => s >= 85).length,
    }
  }), [])

  // Radar: avg per style per rater (top 6 styles)
  const topStyles = useMemo(() => {
    const map = {}
    beers.forEach(b => { if (b.style) map[b.style] = (map[b.style] || 0) + 1 })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6).map(e => e[0])
  }, [])

  const radarData = useMemo(() => topStyles.map(style => {
    const entry = { style: style.length > 10 ? style.slice(0, 10) + '…' : style }
    RATERS.forEach(r => {
      const scores = beers.filter(b => b.style === style && b.ratings[r] != null).map(b => b.ratings[r])
      entry[r] = scores.length ? Math.round(scores.reduce((a, b) => a + b) / scores.length) : null
    })
    return entry
  }), [topStyles])

  // Agreement: pairwise correlation
  const agreement = useMemo(() => {
    const pairs = []
    for (let i = 0; i < RATERS.length; i++) {
      for (let j = i + 1; j < RATERS.length; j++) {
        const r1 = RATERS[i], r2 = RATERS[j]
        const shared = beers.filter(b => b.ratings[r1] != null && b.ratings[r2] != null)
        if (shared.length < 3) continue
        const diffs = shared.map(b => Math.abs(b.ratings[r1] - b.ratings[r2]))
        const avgDiff = diffs.reduce((a, b) => a + b) / diffs.length
        pairs.push({ pair: `${r1} & ${r2}`, avgDiff: Math.round(avgDiff * 10) / 10, shared: shared.length })
      }
    }
    return pairs.sort((a, b) => a.avgDiff - b.avgDiff)
  }, [])

  return (
    <section>
      <SectionHeader>The Raters</SectionHeader>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {stats.map(s => (
          <div key={s.name} style={{
            background: 'var(--bg2)', border: `1px solid ${RATER_COLORS[s.name]}33`,
            borderRadius: 14, padding: '18px 16px',
          }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${RATER_COLORS[s.name]}22`, border: `2px solid ${RATER_COLORS[s.name]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: RATER_COLORS[s.name], marginBottom: 10 }}>
              {s.name[0]}
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>{s.name}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: RATER_COLORS[s.name], letterSpacing: -1 }}>{s.avg}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>avg score</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Row label="Rated" value={s.count} />
              <Row label="Harshest" value={`${s.min}`} color="var(--red)" />
              <Row label="Highest" value={`${s.max}`} color="var(--green)" />
              <Row label="≥85" value={s.generous} color="var(--green)" />
              <Row label="<40" value={s.harsh} color="var(--red)" />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Radar */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 16px' }}>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4, fontWeight: 600 }}>Avg score by style</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 12 }}>Top 6 styles with most ratings</div>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
              <PolarGrid stroke="var(--border2)" />
              <PolarAngleAxis dataKey="style" tick={{ fill: 'var(--text2)', fontSize: 11 }} />
              {RATERS.map(r => (
                <Radar key={r} name={r} dataKey={r} stroke={RATER_COLORS[r]} fill={RATER_COLORS[r]} fillOpacity={0.08} strokeWidth={2} dot={false} />
              ))}
            </RadarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 }}>
            {RATERS.map(r => <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: RATER_COLORS[r] }} />
              <span style={{ color: 'var(--text2)' }}>{r}</span>
            </div>)}
          </div>
        </div>

        {/* Agreement */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 16px' }}>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4, fontWeight: 600 }}>Taste Agreement</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 20 }}>Avg score difference on shared beers — lower = more alike</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {agreement.map((a, i) => (
              <div key={a.pair}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{a.pair}</span>
                  <span style={{ fontSize: 13, color: scoreColor(100 - a.avgDiff) }}>{a.avgDiff} pts apart</span>
                </div>
                <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    width: `${Math.min(100, (a.avgDiff / 40) * 100)}%`,
                    background: a.avgDiff < 15 ? 'var(--green)' : a.avgDiff < 25 ? 'var(--amber)' : 'var(--red)',
                  }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{a.shared} beers in common</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function Row({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
      <span style={{ color: 'var(--text3)' }}>{label}</span>
      <span style={{ fontWeight: 600, color: color || 'var(--text2)' }}>{value}</span>
    </div>
  )
}

// ── BEER LIST ────────────────────────────────────────────────────────────────
function BeerList() {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('avg')
  const [filterCountry, setFilterCountry] = useState('All')
  const [filterStyle, setFilterStyle] = useState('All')

  const countries = useMemo(() => ['All', ...new Set(beers.map(b => b.country).filter(Boolean).sort())], [])
  const styles = useMemo(() => ['All', ...new Set(beers.map(b => b.style).filter(Boolean).sort())], [])

  const filtered = useMemo(() => {
    let list = [...beers]
    if (search) list = list.filter(b => b.name.toLowerCase().includes(search.toLowerCase()) || b.brewery?.toLowerCase().includes(search.toLowerCase()))
    if (filterCountry !== 'All') list = list.filter(b => b.country === filterCountry)
    if (filterStyle !== 'All') list = list.filter(b => b.style === filterStyle)
    list.sort((a, b) => {
      if (sortBy === 'avg') return (b.avg || 0) - (a.avg || 0)
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'abv') return (b.abv || 0) - (a.abv || 0)
      if (sortBy === 'ratings') return b.ratingCount - a.ratingCount
      return 0
    })
    return list
  }, [search, sortBy, filterCountry, filterStyle])

  return (
    <section>
      <SectionHeader>All Beers</SectionHeader>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search beers or brewery…"
          style={{
            flex: 1, minWidth: 200, background: 'var(--bg2)', border: '1px solid var(--border2)',
            borderRadius: 10, padding: '9px 14px', fontSize: 14, color: 'var(--text)',
            outline: 'none',
          }}
        />
        {[
          { label: 'Sort', value: sortBy, set: setSortBy, opts: [['avg','Top Rated'],['name','A–Z'],['abv','ABV'],['ratings','Most Rated']] },
          { label: 'Country', value: filterCountry, set: setFilterCountry, opts: countries.map(c => [c, c]) },
          { label: 'Style', value: filterStyle, set: setFilterStyle, opts: styles.map(s => [s, s]) },
        ].map(({ label, value, set, opts }) => (
          <select key={label} value={value} onChange={e => set(e.target.value)} style={{
            background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 10,
            padding: '9px 12px', fontSize: 13, color: 'var(--text2)', outline: 'none', cursor: 'pointer',
          }}>
            {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
        <div style={{ fontSize: 13, color: 'var(--text3)', alignSelf: 'center', paddingLeft: 4 }}>
          {filtered.length} beer{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 120px 80px 80px 80px 80px 80px 70px',
          padding: '10px 18px', borderBottom: '1px solid var(--border)',
          fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.5,
        }}>
          <span>Beer</span><span style={{ textAlign: 'center' }}>Style</span>
          <span style={{ textAlign: 'center' }}>Hlynur</span><span style={{ textAlign: 'center' }}>Robert</span>
          <span style={{ textAlign: 'center' }}>Steinar</span><span style={{ textAlign: 'center' }}>Palli</span>
          <span style={{ textAlign: 'center' }}>Avg</span><span style={{ textAlign: 'center' }}>ABV</span>
        </div>
        {filtered.map((b, i) => (
          <div key={b.id} style={{
            display: 'grid', gridTemplateColumns: '1fr 120px 80px 80px 80px 80px 80px 70px',
            padding: '12px 18px', borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
            alignItems: 'center',
            transition: 'background 0.1s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
            onMouseLeave={e => e.currentTarget.style.background = ''}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{b.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                {FLAG_EMOJI[b.country] || ''} {b.brewery}
              </div>
            </div>
            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text2)' }}>{b.style || '–'}</div>
            {['Hlynur', 'Robert', 'Steinar', 'Palli'].map(r => (
              <div key={r} style={{ textAlign: 'center' }}>
                <ScoreBadge score={b.ratings[r] ?? null} size="sm" />
              </div>
            ))}
            <div style={{ textAlign: 'center' }}><ScoreBadge score={b.avg} /></div>
            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text3)' }}>{b.abv != null ? `${b.abv}%` : '–'}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── SCATTER: ABV vs Score ────────────────────────────────────────────────────
function AbvScatterSection() {
  const data = useMemo(() => beers.filter(b => b.abv != null && b.avg != null).map(b => ({
    ...b, abv: b.abv, avg: b.avg,
  })), [])

  const CustomDot = (props) => {
    const { cx, cy, payload } = props
    return (
      <circle cx={cx} cy={cy} r={5} fill={scoreColor(payload.avg)} fillOpacity={0.8} stroke="none" />
    )
  }

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const b = payload[0].payload
    return (
      <div style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>
        <div style={{ fontWeight: 700 }}>{b.name}</div>
        <div style={{ color: 'var(--text2)', marginTop: 2 }}>{b.brewery}</div>
        <div style={{ marginTop: 6, display: 'flex', gap: 12 }}>
          <span>ABV: <b>{b.abv}%</b></span>
          <span>Score: <b style={{ color: scoreColor(b.avg) }}>{b.avg}</b></span>
        </div>
      </div>
    )
  }

  return (
    <section>
      <SectionHeader>ABV vs Score</SectionHeader>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 16px 12px' }}>
        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12, fontWeight: 600 }}>Does stronger = better?</div>
        <ResponsiveContainer width="100%" height={280}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="abv" name="ABV" unit="%" tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} label={{ value: 'ABV %', position: 'insideBottom', offset: -4, fill: 'var(--text3)', fontSize: 11 }} />
            <YAxis dataKey="avg" name="Score" domain={[0, 100]} tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border2)' }} />
            <Scatter data={data} shape={<CustomDot />} />
          </ScatterChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8 }}>
          {[['≥85', '#22c55e'], ['70–85', '#f59e0b'], ['50–70', '#f97316'], ['<50', '#f87171']].map(([l, c]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
              <span style={{ color: 'var(--text2)' }}>{l}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── APP ───────────────────────────────────────────────────────────────────────
const totalRatings = beers.reduce((s, b) => s + b.ratingCount, 0)
const avgScore = Math.round(beers.filter(b => b.avg != null).reduce((s, b) => s + b.avg, 0) / beers.filter(b => b.avg).length * 10) / 10
const topBeer = beers.filter(b => b.avg != null).sort((a, b) => b.avg - a.avg)[0]

export default function App() {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }}>
      {/* Hero */}
      <div style={{ paddingTop: 60, paddingBottom: 48, borderBottom: '1px solid var(--border)', marginBottom: 48 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: 2 }}>Café Tyrol</span>
        </div>
        <h1 style={{ fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 900, letterSpacing: -2, lineHeight: 1, marginBottom: 16, color: 'var(--text)' }}>
          The Ultimate<br />Beer Wiki 🍺
        </h1>
        <p style={{ fontSize: 17, color: 'var(--text2)', maxWidth: 480, lineHeight: 1.6 }}>
          {beers.length} beers rated by four friends. Ranked, charted, and exposed.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 32 }}>
          <StatCard label="Beers" value={beers.length} />
          <StatCard label="Total Ratings" value={totalRatings} />
          <StatCard label="Avg Score" value={avgScore} />
          <StatCard label="Top Beer" value={topBeer?.avg} sub={topBeer?.name} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>
        <CountriesSection />
        <BreweriesSection />
        <StylesSection />
        <RatersSection />
        <AbvScatterSection />
        <BeerList />
      </div>
    </div>
  )
}

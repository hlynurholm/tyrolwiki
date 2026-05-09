import { useState, useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  RadialLinearScale, PointElement, LineElement, Filler,
  Tooltip, Legend
} from 'chart.js'
import { Bar, Radar, Scatter } from 'react-chartjs-2'
import beersData from './data/beers.json'

ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  RadialLinearScale, PointElement, LineElement, Filler,
  Tooltip, Legend
)

// ── constants ────────────────────────────────────────────────────────────────
const RATERS = ['Hlynur', 'Robert', 'Steinar', 'Palli']
const RATER_COLORS = {
  Hlynur:  '#f59e0b',
  Robert:  '#60a5fa',
  Steinar: '#a78bfa',
  Palli:   '#34d399',
}
const FLAG = {
  Iceland: '🇮🇸', Belgium: '🇧🇪', Denmark: '🇩🇰', USA: '🇺🇸',
  Germany: '🇩🇪', UK: '🇬🇧', Scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', Mexico: '🇲🇽',
  Italy: '🇮🇹', 'Czech Republic': '🇨🇿', Sweden: '🇸🇪', Japan: '🇯🇵',
}
const PALETTE = ['#f59e0b','#60a5fa','#a78bfa','#34d399','#f97316','#f43f5e','#06b6d4','#84cc16','#ec4899','#8b5cf6']

const RADAR_CATEGORIES = ['Lager', 'Pale Ale', 'IPA', 'Amber Ale', 'Wheat Beer', 'Belgian']
const STYLE_TO_RADAR = {
  // Lager family
  'Lager':                 'Lager',
  'Light Lager':           'Lager',
  'Pilsner':               'Lager',
  'Rice Lager':            'Lager',
  'European Dark Lager':   'Lager',
  'Zwickel':               'Lager',
  'Märzen':                'Lager',
  'Bock':                  'Lager',
  'Dunkel':                'Lager',

  // Pale Ale / general ale family
  'Pale Ale':              'Pale Ale',
  'APA':                   'Pale Ale',
  'Golden Ale':            'Pale Ale',
  'Ale':                   'Pale Ale',
  'Kveik':                 'Pale Ale',
  'Nordic Saison':         'Pale Ale',
  'Saison':                'Pale Ale',
  'Barleywine Style Ale':  'Pale Ale',
  'Farmhouse Ale':         'Pale Ale',

  // IPA family
  'IPA':                   'IPA',
  'Session IPA':           'IPA',
  'NEIPA':                 'IPA',
  'Double IPA':            'IPA',
  'NEDIPA':                'IPA',
  'Milkshake IPA':         'IPA',
  'Sumar session IPA':     'IPA',
  'Belgian IPA':           'IPA',
  'Black IPA':             'IPA',
  'Brut IPA':              'IPA',

  // Amber Ale family
  'Amber Ale':             'Amber Ale',
  'Red Ale':               'Amber Ale',
  'Irish Red Ale':         'Amber Ale',

  // Wheat Beer family
  'Wheat Beer':            'Wheat Beer',
  'Hveitibjór':            'Wheat Beer',
  'Hefeweizen':            'Wheat Beer',
  'Weizen':                'Wheat Beer',
  'Witbier':               'Wheat Beer',
  'White Ale':             'Wheat Beer',

  // Belgian family
  'Belgian Ale':           'Belgian',
  'Belgískt Öl':           'Belgian',
  'Blonde':                'Belgian',
  'Trappist':              'Belgian',
  'Dubbel':                'Belgian',
  'Tripel':                'Belgian',
  'Quadrupel':             'Belgian',
  'Abbey Ale':             'Belgian',
}

ChartJS.defaults.font = { family: 'Inter, system-ui, sans-serif' }
ChartJS.defaults.color = '#8888a8'

// ── helpers ───────────────────────────────────────────────────────────────────
function scoreColor(s) {
  if (s == null) return '#55556a'
  if (s >= 85) return '#22c55e'
  if (s >= 70) return '#f59e0b'
  if (s >= 50) return '#f97316'
  return '#f87171'
}

function trunc(str, n) {
  return str && str.length > n ? str.slice(0, n) + '…' : str
}

// ── tiny components ───────────────────────────────────────────────────────────
function ScoreBadge({ score, size = 'md' }) {
  if (score == null) return <span style={{ color: 'var(--text3)', fontSize: 13 }}>–</span>
  const fs = size === 'lg' ? 22 : size === 'sm' ? 12 : 15
  return (
    <span style={{ fontWeight: 700, fontSize: fs, color: scoreColor(score), fontVariantNumeric: 'tabular-nums' }}>
      {score.toFixed(1)}
    </span>
  )
}

function StatCard({ label, value, sub }) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px 28px', flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: -1, color: 'var(--amber)' }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function SectionHead({ children }) {
  return <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--text3)', marginBottom: 20 }}>{children}</h2>
}

function Card({ children, style }) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 18px', ...style }}>
      {children}
    </div>
  )
}

function CardLabel({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 }}>
      {children}
    </div>
  )
}

// ── chart theme ───────────────────────────────────────────────────────────────
const gridColor = 'rgba(255,255,255,0.05)'
const tooltipStyle = {
  backgroundColor: '#1c1c28',
  borderColor: 'rgba(255,255,255,0.12)',
  borderWidth: 1,
  titleColor: '#eeeef8',
  bodyColor: '#8888a8',
  padding: 10,
  cornerRadius: 8,
}

const hBarOpts = (maxVal) => ({
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { ...tooltipStyle } },
  scales: {
    x: {
      grid: { color: gridColor },
      ticks: { color: '#55556a', font: { size: 11 } },
      max: maxVal,
      border: { color: 'transparent' },
    },
    y: {
      grid: { display: false },
      ticks: { color: '#8888a8', font: { size: 11 }, maxRotation: 0 },
      border: { color: 'transparent' },
    },
  },
})

// ── ADD BEER FORM ─────────────────────────────────────────────────────────────
function AddBeerForm({ beers, onAdd }) {
  const [open, setOpen] = useState(false)
  const blank = { name: '', style: '', brewery: '', country: '', abv: '', Hlynur: '', Robert: '', Steinar: '', Palli: '' }
  const [form, setForm] = useState(blank)

  const styleOpts    = useMemo(() => [...new Set(beers.map(b => b.style).filter(Boolean).sort())], [beers])
  const breweryOpts  = useMemo(() => [...new Set(beers.map(b => b.brewery).filter(Boolean).sort())], [beers])
  const countryOpts  = useMemo(() => [...new Set(beers.map(b => b.country).filter(Boolean).sort())], [beers])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    const ratings = {}
    RATERS.forEach(r => { if (form[r] !== '') ratings[r] = parseFloat(form[r]) })
    const scores = Object.values(ratings)
    const avg = scores.length ? +(scores.reduce((a, b) => a + b) / scores.length).toFixed(1) : null
    onAdd({
      id: Math.max(...beers.map(b => b.id), 0) + 1,
      name: form.name.trim(),
      style: form.style.trim() || null,
      brewery: form.brewery.trim() || null,
      country: form.country.trim() || null,
      abv: form.abv ? parseFloat(form.abv) : null,
      ratings, avg, ratingCount: scores.length,
    })
    setForm(blank)
    setOpen(false)
  }

  const inp = {
    background: 'var(--bg3)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text)',
    outline: 'none', fontFamily: 'inherit', width: '100%',
  }
  const lbl = { fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.6, display: 'block', marginBottom: 4 }

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: open ? 16 : 0 }}>
        <SectionHead style={{ marginBottom: 0 }}>Add a Beer</SectionHead>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            fontSize: 12, fontWeight: 600,
            color: open ? 'var(--text3)' : 'var(--amber)',
            background: open ? 'var(--bg3)' : 'rgba(245,158,11,0.12)',
            border: `1px solid ${open ? 'var(--border)' : 'rgba(245,158,11,0.3)'}`,
            borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
          }}
        >
          {open ? 'Cancel' : '+ Add Beer'}
        </button>
      </div>
      {open && (
        <Card>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 0.6fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={lbl}>Beer Name *</label>
                <input list="dl-names" style={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Chimay Blue" required />
                <datalist id="dl-names">{beers.map(b => <option key={b.id} value={b.name} />)}</datalist>
              </div>
              <div>
                <label style={lbl}>Style</label>
                <input list="dl-styles" style={inp} value={form.style} onChange={e => set('style', e.target.value)} placeholder="IPA, Lager…" />
                <datalist id="dl-styles">{styleOpts.map(s => <option key={s} value={s} />)}</datalist>
              </div>
              <div>
                <label style={lbl}>Brewery</label>
                <input list="dl-breweries" style={inp} value={form.brewery} onChange={e => set('brewery', e.target.value)} placeholder="Brewery" />
                <datalist id="dl-breweries">{breweryOpts.map(b => <option key={b} value={b} />)}</datalist>
              </div>
              <div>
                <label style={lbl}>Country</label>
                <input list="dl-countries" style={inp} value={form.country} onChange={e => set('country', e.target.value)} placeholder="Country" />
                <datalist id="dl-countries">{countryOpts.map(c => <option key={c} value={c} />)}</datalist>
              </div>
              <div>
                <label style={lbl}>ABV %</label>
                <input style={inp} type="number" step="0.1" min="0" max="20" value={form.abv} onChange={e => set('abv', e.target.value)} placeholder="5.0" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) auto', gap: 10, alignItems: 'end' }}>
              {RATERS.map(r => (
                <div key={r}>
                  <label style={{ ...lbl, color: RATER_COLORS[r] }}>{r}</label>
                  <input
                    style={{ ...inp, borderColor: RATER_COLORS[r] + '44' }}
                    type="number" min="0" max="100" step="1"
                    value={form[r]} onChange={e => set(r, e.target.value)}
                    placeholder="0–100"
                  />
                </div>
              ))}
              <button type="submit" style={{ background: 'var(--amber)', color: '#0a0a0f', fontWeight: 700, fontSize: 13, border: 'none', borderRadius: 8, padding: '9px 20px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Add Beer
              </button>
            </div>
          </form>
        </Card>
      )}
    </section>
  )
}

// ── COUNTRIES ─────────────────────────────────────────────────────────────────
function CountriesSection({ beers }) {
  const data = useMemo(() => {
    const m = {}
    beers.forEach(b => {
      if (!b.country) return
      if (!m[b.country]) m[b.country] = { country: b.country, count: 0, scores: [] }
      m[b.country].count++
      if (b.avg != null) m[b.country].scores.push(b.avg)
    })
    return Object.values(m)
      .map(c => ({ ...c, avg: c.scores.length ? +(c.scores.reduce((a, b) => a + b) / c.scores.length).toFixed(1) : null }))
      .filter(c => c.count >= 2)
      .sort((a, b) => b.count - a.count)
  }, [beers])
  const max = data[0]?.count || 1

  return (
    <section>
      <SectionHead>By Country</SectionHead>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
        {data.map(c => (
          <Card key={c.country} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 30 }}>{FLAG[c.country] || '🍺'}</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{c.country}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>{c.count} beer{c.count !== 1 ? 's' : ''}</span>
              <ScoreBadge score={c.avg} size="sm" />
            </div>
            <div style={{ height: 3, background: 'var(--bg3)', borderRadius: 2 }}>
              <div style={{ height: '100%', width: `${(c.count / max) * 100}%`, background: 'var(--amber)', borderRadius: 2 }} />
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}

// ── BREWERIES ─────────────────────────────────────────────────────────────────
function BreweriesSection({ beers }) {
  const data = useMemo(() => {
    const m = {}
    beers.forEach(b => {
      if (!b.brewery) return
      if (!m[b.brewery]) m[b.brewery] = { brewery: b.brewery, country: b.country, count: 0, scores: [] }
      m[b.brewery].count++
      if (b.avg != null) m[b.brewery].scores.push(b.avg)
    })
    return Object.values(m)
      .map(c => ({ ...c, avg: c.scores.length ? +(c.scores.reduce((a, b) => a + b) / c.scores.length).toFixed(1) : null }))
      .filter(b => b.count >= 2)
      .sort((a, b) => b.count - a.count || (b.avg || 0) - (a.avg || 0))
      .slice(0, 12)
  }, [beers])

  const chartData = {
    labels: data.map(d => trunc(d.brewery, 18)),
    datasets: [{
      data: data.map(d => d.count),
      backgroundColor: data.map((_, i) => i < 3 ? '#f59e0b44' : '#1c1c2888'),
      borderColor: data.map((_, i) => i < 3 ? '#f59e0b' : '#ffffff22'),
      borderWidth: 1,
      borderRadius: 4,
    }],
  }

  return (
    <section>
      <SectionHead>Top Breweries</SectionHead>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.slice(0, 8).map((b, i) => (
            <div key={b.brewery} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                background: i < 3 ? 'rgba(245,158,11,0.15)' : 'var(--bg3)',
                border: `1px solid ${i < 3 ? '#f59e0b' : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, color: i < 3 ? 'var(--amber)' : 'var(--text3)',
              }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.brewery}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{FLAG[b.country] || ''} {b.country} · {b.count} beers</div>
              </div>
              <ScoreBadge score={b.avg} size="sm" />
            </div>
          ))}
        </div>
        <Card>
          <CardLabel>Beers per brewery</CardLabel>
          <div style={{ height: Math.max(200, data.length * 38) }}>
            <Bar data={chartData} options={hBarOpts((data[0]?.count || 1) + 1)} />
          </div>
        </Card>
      </div>
    </section>
  )
}

// ── STYLES ────────────────────────────────────────────────────────────────────
function StylesSection({ beers }) {
  const data = useMemo(() => {
    const m = {}
    beers.forEach(b => {
      if (!b.style) return
      if (!m[b.style]) m[b.style] = { style: b.style, count: 0, scores: [] }
      m[b.style].count++
      if (b.avg != null) m[b.style].scores.push(b.avg)
    })
    return Object.values(m)
      .map(s => ({ ...s, avg: s.scores.length ? +(s.scores.reduce((a, b) => a + b) / s.scores.length).toFixed(1) : null }))
      .filter(s => s.count >= 2)
      .sort((a, b) => b.count - a.count)
  }, [beers])

  const total = data.reduce((s, d) => s + d.count, 0)
  const sorted = [...data].filter(s => s.avg != null).sort((a, b) => (b.avg || 0) - (a.avg || 0))

  const chartData = {
    labels: sorted.map(s => trunc(s.style, 18)),
    datasets: [{
      data: sorted.map(s => s.avg),
      backgroundColor: sorted.map(s => scoreColor(s.avg) + '55'),
      borderColor: sorted.map(s => scoreColor(s.avg)),
      borderWidth: 1,
      borderRadius: 4,
    }],
  }

  return (
    <section>
      <SectionHead>Beer Styles</SectionHead>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <Card>
          <CardLabel>Distribution</CardLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.map((s, i) => (
              <div key={s.style} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.style}</div>
                <span style={{ fontSize: 11, color: 'var(--text3)', width: 32, textAlign: 'right' }}>{Math.round(s.count / total * 100)}%</span>
                <div style={{ width: 60, height: 4, background: 'var(--bg3)', borderRadius: 2, flexShrink: 0 }}>
                  <div style={{ height: '100%', width: `${(s.count / data[0].count) * 100}%`, background: PALETTE[i % PALETTE.length], borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--text2)', width: 14, textAlign: 'right' }}>{s.count}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardLabel>Avg score by style</CardLabel>
          <div style={{ height: Math.max(200, sorted.length * 38) }}>
            <Bar data={chartData} options={hBarOpts(100)} />
          </div>
        </Card>
      </div>
    </section>
  )
}

// ── RATERS ────────────────────────────────────────────────────────────────────
function RatersSection({ beers }) {
  const stats = useMemo(() => RATERS.map(r => {
    const scores = beers.map(b => b.ratings[r]).filter(v => v != null)
    return {
      name: r,
      count: scores.length,
      avg: scores.length ? +(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : null,
      min: scores.length ? Math.min(...scores) : null,
      max: scores.length ? Math.max(...scores) : null,
      harsh: scores.filter(s => s < 40).length,
      generous: scores.filter(s => s >= 85).length,
    }
  }), [beers])

  const radarData = useMemo(() => ({
    labels: RADAR_CATEGORIES,
    datasets: RATERS.map(r => ({
      label: r,
      spanGaps: false,
      data: RADAR_CATEGORIES.map(cat => {
        const scores = beers
          .filter(b => STYLE_TO_RADAR[b.style] === cat && b.ratings[r] != null)
          .map(b => b.ratings[r])
        return scores.length ? Math.round(scores.reduce((a, b) => a + b) / scores.length) : null
      }),
      borderColor: RATER_COLORS[r],
      backgroundColor: RATER_COLORS[r] + '18',
      borderWidth: 2,
      pointRadius: 3,
      pointBackgroundColor: RATER_COLORS[r],
    }))
  }), [beers])

  const radarOpts = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        min: 0, max: 100,
        grid: { color: gridColor },
        angleLines: { color: gridColor },
        pointLabels: { color: '#8888a8', font: { size: 11 } },
        ticks: { display: false },
      },
    },
    plugins: {
      legend: { position: 'bottom', labels: { color: '#8888a8', boxWidth: 10, padding: 16, font: { size: 11 } } },
      tooltip: { ...tooltipStyle },
    },
  }

  const agreement = useMemo(() => {
    const pairs = []
    for (let i = 0; i < RATERS.length; i++) for (let j = i + 1; j < RATERS.length; j++) {
      const r1 = RATERS[i], r2 = RATERS[j]
      const shared = beers.filter(b => b.ratings[r1] != null && b.ratings[r2] != null)
      if (shared.length < 3) continue
      const avgDiff = +(shared.map(b => Math.abs(b.ratings[r1] - b.ratings[r2])).reduce((a, b) => a + b) / shared.length).toFixed(1)
      pairs.push({ pair: `${r1} & ${r2}`, avgDiff, shared: shared.length })
    }
    return pairs.sort((a, b) => a.avgDiff - b.avgDiff)
  }, [beers])

  return (
    <section>
      <SectionHead>The Raters</SectionHead>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {stats.map(s => (
          <Card key={s.name}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: RATER_COLORS[s.name] + '22', border: `2px solid ${RATER_COLORS[s.name]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: RATER_COLORS[s.name], marginBottom: 10 }}>{s.name[0]}</div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{s.name}</div>
            <div style={{ fontSize: 30, fontWeight: 900, color: RATER_COLORS[s.name], letterSpacing: -1, lineHeight: 1 }}>{s.avg}</div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>avg score</div>
            {[['Rated', s.count], ['Min', s.min, 'var(--red)'], ['Max', s.max, 'var(--green)'], ['≥ 85', s.generous, 'var(--green)'], ['< 40', s.harsh, 'var(--red)']].map(([l, v, c]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 4 }}>
                <span style={{ color: 'var(--text3)' }}>{l}</span>
                <span style={{ fontWeight: 600, color: c || 'var(--text2)' }}>{v}</span>
              </div>
            ))}
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <Card>
          <CardLabel>Taste profile by style</CardLabel>
          <div style={{ height: 300 }}>
            <Radar data={radarData} options={radarOpts} />
          </div>
        </Card>
        <Card>
          <CardLabel>Taste agreement — lower = more alike</CardLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 8 }}>
            {agreement.map(a => (
              <div key={a.pair}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{a.pair}</span>
                  <span style={{ fontSize: 13, color: scoreColor(100 - a.avgDiff) }}>{a.avgDiff} pts apart</span>
                </div>
                <div style={{ height: 5, background: 'var(--bg3)', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${Math.min(100, (a.avgDiff / 35) * 100)}%`, background: a.avgDiff < 12 ? 'var(--green)' : a.avgDiff < 20 ? 'var(--amber)' : 'var(--red)', borderRadius: 3 }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{a.shared} beers in common</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  )
}

// ── ABV SCATTER ───────────────────────────────────────────────────────────────
function AbvSection({ beers }) {
  const pts = useMemo(() =>
    beers.filter(b => b.abv != null && b.avg != null).map(b => ({ x: b.abv, y: b.avg, name: b.name, brewery: b.brewery })),
    [beers]
  )

  const scatterData = {
    datasets: [{
      label: 'Beers',
      data: pts,
      backgroundColor: pts.map(p => scoreColor(p.y) + 'cc'),
      pointRadius: 6,
      pointHoverRadius: 8,
    }],
  }

  const scatterOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        ...tooltipStyle,
        callbacks: {
          label: ctx => {
            const p = ctx.raw
            return [`${p.name}`, `${p.brewery}`, `ABV: ${p.x}%  ·  Score: ${p.y}`]
          },
          title: () => '',
        },
      },
    },
    scales: {
      x: { title: { display: true, text: 'ABV %', color: '#55556a' }, grid: { color: gridColor }, ticks: { color: '#55556a' }, border: { color: 'transparent' } },
      y: { title: { display: true, text: 'Score', color: '#55556a' }, min: 0, max: 100, grid: { color: gridColor }, ticks: { color: '#55556a' }, border: { color: 'transparent' } },
    },
  }

  return (
    <section>
      <SectionHead>ABV vs Score</SectionHead>
      <Card>
        <CardLabel>Does stronger = better?</CardLabel>
        <div style={{ height: 300 }}>
          <Scatter data={scatterData} options={scatterOpts} />
        </div>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
          {[['≥ 85', '#22c55e'], ['70–85', '#f59e0b'], ['50–70', '#f97316'], ['< 50', '#f87171']].map(([l, c]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
              <span style={{ color: 'var(--text2)' }}>{l}</span>
            </div>
          ))}
        </div>
      </Card>
    </section>
  )
}

// ── BEER TABLE ────────────────────────────────────────────────────────────────
function BeerTable({ beers }) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('avg')
  const [country, setCountry] = useState('All')
  const [style, setStyle] = useState('All')

  const countries = useMemo(() => ['All', ...new Set(beers.map(b => b.country).filter(Boolean).sort())], [beers])
  const styles = useMemo(() => ['All', ...new Set(beers.map(b => b.style).filter(Boolean).sort())], [beers])

  const filtered = useMemo(() => {
    let list = [...beers]
    if (search) list = list.filter(b => b.name.toLowerCase().includes(search.toLowerCase()) || (b.brewery || '').toLowerCase().includes(search.toLowerCase()))
    if (country !== 'All') list = list.filter(b => b.country === country)
    if (style !== 'All') list = list.filter(b => b.style === style)
    return list.sort((a, b) => {
      if (sortBy === 'avg') return (b.avg || 0) - (a.avg || 0)
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'abv') return (b.abv || 0) - (a.abv || 0)
      return b.ratingCount - a.ratingCount
    })
  }, [beers, search, sortBy, country, style])

  const inputStyle = {
    background: 'var(--bg2)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10, padding: '8px 14px', fontSize: 13, color: 'var(--text)',
    outline: 'none', fontFamily: 'inherit',
  }

  return (
    <section>
      <SectionHead>All Beers</SectionHead>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" style={{ ...inputStyle, flex: 1, minWidth: 180 }} />
        {[
          ['sort', sortBy, setSortBy, [['avg','Top Rated'],['name','A–Z'],['abv','ABV'],['ratingCount','Most Rated']]],
          ['country', country, setCountry, countries.map(c => [c, c])],
          ['style', style, setStyle, styles.map(s => [s, s])],
        ].map(([, val, set, opts]) => (
          <select key={String(opts[0])} value={val} onChange={e => set(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>{filtered.length} beers</span>
      </div>

      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 72px 72px 72px 72px 68px 58px', padding: '9px 16px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.6 }}>
          <span>Beer</span><span style={{ textAlign: 'center' }}>Style</span>
          <span style={{ textAlign: 'center' }}>Hlynur</span><span style={{ textAlign: 'center' }}>Robert</span>
          <span style={{ textAlign: 'center' }}>Steinar</span><span style={{ textAlign: 'center' }}>Palli</span>
          <span style={{ textAlign: 'center' }}>Avg</span><span style={{ textAlign: 'center' }}>ABV</span>
        </div>
        {filtered.map((b, i) => (
          <div
            key={b.id}
            style={{
              display: 'grid', gridTemplateColumns: '1fr 110px 72px 72px 72px 72px 68px 58px',
              padding: '11px 16px', borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
              alignItems: 'center', transition: 'background 0.1s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
            onMouseLeave={e => e.currentTarget.style.background = ''}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{b.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{FLAG[b.country] || ''} {b.brewery}</div>
            </div>
            <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text2)' }}>{b.style || '–'}</div>
            {RATERS.map(r => (
              <div key={r} style={{ textAlign: 'center' }}><ScoreBadge score={b.ratings[r] ?? null} size="sm" /></div>
            ))}
            <div style={{ textAlign: 'center' }}><ScoreBadge score={b.avg} /></div>
            <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text3)' }}>{b.abv != null ? `${b.abv}%` : '–'}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [customBeers, setCustomBeers] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tyrolCustomBeers') || '[]') }
    catch { return [] }
  })

  const allBeers = useMemo(() => [...beersData, ...customBeers], [customBeers])

  function addBeer(beer) {
    const next = [...customBeers, beer]
    setCustomBeers(next)
    localStorage.setItem('tyrolCustomBeers', JSON.stringify(next))
  }

  const totalRatings = useMemo(() => allBeers.reduce((s, b) => s + b.ratingCount, 0), [allBeers])
  const scored       = useMemo(() => allBeers.filter(b => b.avg != null), [allBeers])
  const avgScore     = useMemo(() => scored.length ? +(scored.reduce((s, b) => s + b.avg, 0) / scored.length).toFixed(1) : 0, [scored])
  const topBeer      = useMemo(() => [...scored].sort((a, b) => b.avg - a.avg)[0], [scored])

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }}>
      <div style={{ paddingTop: 56, paddingBottom: 44, borderBottom: '1px solid var(--border)', marginBottom: 48 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 }}>Café Tyrol</div>
        <h1 style={{ fontSize: 'clamp(34px, 6vw, 68px)', fontWeight: 900, letterSpacing: -2, lineHeight: 1.05, marginBottom: 14 }}>
          The Ultimate<br />Beer Wiki 🍺
        </h1>
        <p style={{ fontSize: 16, color: 'var(--text2)', maxWidth: 420, lineHeight: 1.65 }}>
          {allBeers.length} beers rated by four friends. Ranked, charted, and exposed.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 28 }}>
          <StatCard label="Beers" value={allBeers.length} />
          <StatCard label="Total Ratings" value={totalRatings} />
          <StatCard label="Avg Score" value={avgScore} />
          <StatCard label="Top Beer" value={topBeer?.avg} sub={topBeer?.name} />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 52 }}>
        <AddBeerForm beers={allBeers} onAdd={addBeer} />
        <CountriesSection beers={allBeers} />
        <BreweriesSection beers={allBeers} />
        <StylesSection beers={allBeers} />
        <RatersSection beers={allBeers} />
        <AbvSection beers={allBeers} />
        <BeerTable beers={allBeers} />
      </div>
    </div>
  )
}

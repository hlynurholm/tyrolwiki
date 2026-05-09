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
  Hlynur:  '#a96f10',
  Robert:  '#2056a0',
  Steinar: '#6b4a9e',
  Palli:   '#2e7d52',
}
const FLAG = {
  Iceland: '🇮🇸', Belgium: '🇧🇪', Denmark: '🇩🇰', USA: '🇺🇸',
  Germany: '🇩🇪', UK: '🇬🇧', Scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', Mexico: '🇲🇽',
  Italy: '🇮🇹', 'Czech Republic': '🇨🇿', Sweden: '🇸🇪', Japan: '🇯🇵',
}

const RADAR_CATEGORIES = ['Lager', 'Pale Ale', 'IPA', 'Amber Ale', 'Wheat Beer', 'Belgian']
const STYLE_TO_RADAR = {
  'Lager': 'Lager', 'Light Lager': 'Lager', 'Pilsner': 'Lager',
  'Rice Lager': 'Lager', 'European Dark Lager': 'Lager', 'Zwickel': 'Lager',
  'Märzen': 'Lager', 'Bock': 'Lager', 'Dunkel': 'Lager',
  'Pale Ale': 'Pale Ale', 'APA': 'Pale Ale', 'Golden Ale': 'Pale Ale',
  'Ale': 'Pale Ale', 'Kveik': 'Pale Ale', 'Nordic Saison': 'Pale Ale',
  'Saison': 'Pale Ale', 'Barleywine Style Ale': 'Pale Ale', 'Farmhouse Ale': 'Pale Ale',
  'IPA': 'IPA', 'Session IPA': 'IPA', 'NEIPA': 'IPA',
  'Double IPA': 'IPA', 'NEDIPA': 'IPA', 'Milkshake IPA': 'IPA',
  'Sumar session IPA': 'IPA', 'Belgian IPA': 'IPA', 'Black IPA': 'IPA', 'Brut IPA': 'IPA',
  'Amber Ale': 'Amber Ale', 'Red Ale': 'Amber Ale', 'Irish Red Ale': 'Amber Ale',
  'Wheat Beer': 'Wheat Beer', 'Hveitibjór': 'Wheat Beer', 'Hefeweizen': 'Wheat Beer',
  'Weizen': 'Wheat Beer', 'Witbier': 'Wheat Beer', 'White Ale': 'Wheat Beer',
  'Belgian Ale': 'Belgian', 'Belgískt Öl': 'Belgian', 'Blonde': 'Belgian',
  'Trappist': 'Belgian', 'Dubbel': 'Belgian', 'Tripel': 'Belgian',
  'Quadrupel': 'Belgian', 'Abbey Ale': 'Belgian',
}

ChartJS.defaults.font = { family: 'Inter, system-ui, sans-serif', size: 11 }
ChartJS.defaults.color = '#b2b0a9'

// ── helpers ───────────────────────────────────────────────────────────────────
function scoreColor(s) {
  if (s == null) return '#b2b0a9'
  if (s >= 85) return '#2e7d52'
  if (s >= 70) return '#a96f10'
  if (s >= 50) return '#c45a20'
  return '#b83030'
}

function trunc(str, n) {
  return str && str.length > n ? str.slice(0, n) + '…' : str
}

// ── chart theme ───────────────────────────────────────────────────────────────
const gridColor = 'rgba(0,0,0,0.05)'
const tooltipStyle = {
  backgroundColor: '#ffffff',
  borderColor: 'rgba(0,0,0,0.1)',
  borderWidth: 1,
  titleColor: '#1a1917',
  bodyColor: '#706f6a',
  padding: 12,
  cornerRadius: 6,
}

const hBarOpts = (maxVal) => ({
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { ...tooltipStyle } },
  scales: {
    x: {
      grid: { color: gridColor },
      ticks: { color: '#b2b0a9', font: { size: 10 } },
      max: maxVal,
      border: { color: 'transparent' },
    },
    y: {
      grid: { display: false },
      ticks: { color: '#706f6a', font: { size: 11 }, maxRotation: 0 },
      border: { color: 'transparent' },
    },
  },
})

// ── tiny components ───────────────────────────────────────────────────────────
function ScoreBadge({ score, size = 'md' }) {
  if (score == null) return <span style={{ color: '#b2b0a9', fontSize: 13 }}>—</span>
  const fs = size === 'lg' ? 20 : size === 'sm' ? 12 : 14
  return (
    <span style={{ fontWeight: 700, fontSize: fs, color: scoreColor(score), fontVariantNumeric: 'tabular-nums', letterSpacing: -0.3 }}>
      {score.toFixed(1)}
    </span>
  )
}

function SectionHead({ children }) {
  return (
    <h2 style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 3, color: 'var(--text3)', marginBottom: 24 }}>
      {children}
    </h2>
  )
}

function Card({ children, style }) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '24px', ...style }}>
      {children}
    </div>
  )
}

function CardLabel({ children }) {
  return (
    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 2.5, marginBottom: 18 }}>
      {children}
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--border)', margin: '0 0 52px' }} />
}

// ── ADD BEER FORM ─────────────────────────────────────────────────────────────
function AddBeerForm({ beers, onAdd }) {
  const [open, setOpen] = useState(false)
  const blank = { name: '', style: '', brewery: '', country: '', abv: '', Hlynur: '', Robert: '', Steinar: '', Palli: '' }
  const [form, setForm] = useState(blank)

  const styleOpts   = useMemo(() => [...new Set(beers.map(b => b.style).filter(Boolean).sort())], [beers])
  const breweryOpts = useMemo(() => [...new Set(beers.map(b => b.brewery).filter(Boolean).sort())], [beers])
  const countryOpts = useMemo(() => [...new Set(beers.map(b => b.country).filter(Boolean).sort())], [beers])

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
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid rgba(0,0,0,0.12)',
    borderRadius: 0,
    padding: '6px 0',
    fontSize: 13,
    color: 'var(--text)',
    outline: 'none',
    fontFamily: 'inherit',
    width: '100%',
  }
  const lbl = {
    fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase',
    letterSpacing: 2, display: 'block', marginBottom: 6, fontWeight: 600,
  }

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <SectionHead>Log a Beer</SectionHead>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
            color: open ? 'var(--text3)' : 'var(--text2)',
            background: 'none', border: 'none', cursor: 'pointer',
            marginTop: -24, marginBottom: 24,
            textDecoration: open ? 'none' : 'underline',
            textUnderlineOffset: 3,
          }}
        >
          {open ? 'cancel' : '+ add'}
        </button>
      </div>
      {open && (
        <Card style={{ marginTop: -4 }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 0.6fr', gap: '0 24px', marginBottom: 28 }}>
              {[
                { key: 'name', label: 'Beer Name *', list: 'dl-names', ph: 'e.g. Chimay Blue', required: true },
                { key: 'style', label: 'Style', list: 'dl-styles', ph: 'IPA, Lager…' },
                { key: 'brewery', label: 'Brewery', list: 'dl-breweries', ph: '' },
                { key: 'country', label: 'Country', list: 'dl-countries', ph: '' },
              ].map(({ key, label, list, ph, required }) => (
                <div key={key}>
                  <label style={lbl}>{label}</label>
                  <input list={list} style={inp} value={form[key]} onChange={e => set(key, e.target.value)} placeholder={ph} required={required} />
                </div>
              ))}
              <div>
                <label style={lbl}>ABV %</label>
                <input style={inp} type="number" step="0.1" min="0" max="20" value={form.abv} onChange={e => set('abv', e.target.value)} placeholder="5.0" />
              </div>
            </div>
            <datalist id="dl-names">{beers.map(b => <option key={b.id} value={b.name} />)}</datalist>
            <datalist id="dl-styles">{styleOpts.map(s => <option key={s} value={s} />)}</datalist>
            <datalist id="dl-breweries">{breweryOpts.map(b => <option key={b} value={b} />)}</datalist>
            <datalist id="dl-countries">{countryOpts.map(c => <option key={c} value={c} />)}</datalist>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) auto', gap: '0 24px', alignItems: 'end' }}>
              {RATERS.map(r => (
                <div key={r}>
                  <label style={{ ...lbl, color: RATER_COLORS[r] }}>{r}</label>
                  <input style={{ ...inp, borderBottomColor: RATER_COLORS[r] + '55' }} type="number" min="0" max="100" step="1" value={form[r]} onChange={e => set(r, e.target.value)} placeholder="0–100" />
                </div>
              ))}
              <button type="submit" style={{ background: 'var(--text)', color: 'var(--bg2)', fontWeight: 600, fontSize: 12, letterSpacing: 0.5, border: 'none', borderRadius: 6, padding: '9px 20px', cursor: 'pointer', whiteSpace: 'nowrap', alignSelf: 'end', marginBottom: 1 }}>
                Add
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
        {data.map(c => (
          <Card key={c.country} style={{ padding: '20px' }}>
            <div style={{ fontSize: 26, marginBottom: 10 }}>{FLAG[c.country] || '🍺'}</div>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{c.country}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>{c.count} beers</span>
              <ScoreBadge score={c.avg} size="sm" />
            </div>
            <div style={{ height: 2, background: 'var(--bg3)', borderRadius: 1 }}>
              <div style={{ height: '100%', width: `${(c.count / max) * 100}%`, background: 'var(--text3)', borderRadius: 1 }} />
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
      backgroundColor: 'rgba(0,0,0,0.06)',
      borderColor: 'rgba(0,0,0,0.18)',
      borderWidth: 1,
      borderRadius: 3,
    }],
  }

  return (
    <section>
      <SectionHead>Breweries</SectionHead>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {data.slice(0, 8).map((b, i) => (
            <div key={b.brewery} style={{
              background: 'var(--bg2)', borderRadius: i === 0 ? '10px 10px 0 0' : i === Math.min(7, data.length - 1) ? '0 0 10px 10px' : 0,
              border: '1px solid var(--border)',
              marginTop: i > 0 ? -1 : 0,
              padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: i < 3 ? 'var(--amber)' : 'var(--text3)', width: 18, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.brewery}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{FLAG[b.country] || ''} {b.country} · {b.count} beers</div>
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
      backgroundColor: sorted.map(s => scoreColor(s.avg) + '22'),
      borderColor: sorted.map(s => scoreColor(s.avg) + 'aa'),
      borderWidth: 1,
      borderRadius: 3,
    }],
  }

  return (
    <section>
      <SectionHead>Styles</SectionHead>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <CardLabel>Distribution</CardLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {data.map((s, i) => (
              <div key={s.style} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 2, height: 14, background: 'var(--text3)', opacity: 1 - i * 0.07, flexShrink: 0, borderRadius: 1 }} />
                <div style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>{s.style}</div>
                <span style={{ fontSize: 11, color: 'var(--text3)', width: 28, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{Math.round(s.count / total * 100)}%</span>
                <div style={{ width: 56, height: 2, background: 'var(--bg3)', borderRadius: 1, flexShrink: 0 }}>
                  <div style={{ height: '100%', width: `${(s.count / data[0].count) * 100}%`, background: 'var(--text3)', borderRadius: 1 }} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--text2)', width: 14, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{s.count}</span>
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
      backgroundColor: RATER_COLORS[r] + '14',
      borderWidth: 1.5,
      pointRadius: 2.5,
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
        pointLabels: { color: '#706f6a', font: { size: 10 } },
        ticks: { display: false },
      },
    },
    plugins: {
      legend: { position: 'bottom', labels: { color: '#706f6a', boxWidth: 8, padding: 16, font: { size: 10 } } },
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        {stats.map(s => (
          <Card key={s.name} style={{ padding: '22px 20px', borderLeft: `3px solid ${RATER_COLORS[s.name]}` }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, color: RATER_COLORS[s.name] }}>{s.name}</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--text)', letterSpacing: -2, lineHeight: 1, marginBottom: 4, fontVariantNumeric: 'tabular-nums' }}>{s.avg}</div>
            <div style={{ fontSize: 9, color: 'var(--text3)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 2 }}>avg score</div>
            {[['Rated', s.count], ['Min', s.min, 'var(--red)'], ['Max', s.max, 'var(--green)'], ['≥ 85', s.generous, 'var(--green)'], ['< 40', s.harsh, 'var(--red)']].map(([l, v, c]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 5, borderBottom: '1px solid var(--border)', paddingBottom: 5 }}>
                <span style={{ color: 'var(--text3)' }}>{l}</span>
                <span style={{ fontWeight: 600, color: c || 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{v}</span>
              </div>
            ))}
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <CardLabel>Taste profile by style</CardLabel>
          <div style={{ height: 300 }}>
            <Radar data={radarData} options={radarOpts} />
          </div>
        </Card>
        <Card>
          <CardLabel>Agreement — lower = more alike</CardLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 8 }}>
            {agreement.map(a => (
              <div key={a.pair}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{a.pair}</span>
                  <span style={{ fontSize: 12, color: scoreColor(100 - a.avgDiff), fontVariantNumeric: 'tabular-nums' }}>{a.avgDiff} pts</span>
                </div>
                <div style={{ height: 2, background: 'var(--bg3)', borderRadius: 1 }}>
                  <div style={{ height: '100%', width: `${Math.min(100, (a.avgDiff / 35) * 100)}%`, background: a.avgDiff < 12 ? 'var(--green)' : a.avgDiff < 20 ? 'var(--amber)' : 'var(--red)', borderRadius: 1 }} />
                </div>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>{a.shared} beers in common</div>
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
      backgroundColor: pts.map(p => scoreColor(p.y) + 'bb'),
      pointRadius: 5,
      pointHoverRadius: 7,
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
      x: { title: { display: true, text: 'ABV %', color: '#b2b0a9', font: { size: 10 } }, grid: { color: gridColor }, ticks: { color: '#b2b0a9' }, border: { color: 'transparent' } },
      y: { title: { display: true, text: 'Score', color: '#b2b0a9', font: { size: 10 } }, min: 0, max: 100, grid: { color: gridColor }, ticks: { color: '#b2b0a9' }, border: { color: 'transparent' } },
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
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 14, flexWrap: 'wrap' }}>
          {[['≥ 85', '#2e7d52'], ['70–85', '#a96f10'], ['50–70', '#c45a20'], ['< 50', '#b83030']].map(([l, c]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: c }} />
              <span style={{ color: 'var(--text3)' }}>{l}</span>
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
  const styles    = useMemo(() => ['All', ...new Set(beers.map(b => b.style).filter(Boolean).sort())], [beers])

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

  const ctrl = {
    background: 'var(--bg2)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--text)',
    outline: 'none', fontFamily: 'inherit',
  }

  return (
    <section>
      <SectionHead>All Beers</SectionHead>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" style={{ ...ctrl, flex: 1, minWidth: 160 }} />
        {[
          ['sort', sortBy, setSortBy, [['avg','Top Rated'],['name','A–Z'],['abv','ABV'],['ratingCount','Most Rated']]],
          ['country', country, setCountry, countries.map(c => [c, c])],
          ['style', style, setStyle, styles.map(s => [s, s])],
        ].map(([, val, set, opts]) => (
          <select key={String(opts[0])} value={val} onChange={e => set(e.target.value)} style={{ ...ctrl, cursor: 'pointer' }}>
            {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
        <span style={{ fontSize: 11, color: 'var(--text3)', fontVariantNumeric: 'tabular-nums' }}>{filtered.length}</span>
      </div>

      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 66px 66px 66px 66px 62px 52px', padding: '10px 18px', borderBottom: '1px solid var(--border)', fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 2 }}>
          <span>Beer</span><span style={{ textAlign: 'center' }}>Style</span>
          <span style={{ textAlign: 'center' }}>Hlynur</span><span style={{ textAlign: 'center' }}>Robert</span>
          <span style={{ textAlign: 'center' }}>Steinar</span><span style={{ textAlign: 'center' }}>Palli</span>
          <span style={{ textAlign: 'center' }}>Avg</span><span style={{ textAlign: 'center' }}>ABV</span>
        </div>
        {filtered.map((b, i) => (
          <div
            key={b.id}
            style={{
              display: 'grid', gridTemplateColumns: '1fr 100px 66px 66px 66px 66px 62px 52px',
              padding: '12px 18px',
              borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
              alignItems: 'center',
              transition: 'background 0.08s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
            onMouseLeave={e => e.currentTarget.style.background = ''}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{b.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{FLAG[b.country] || ''} {b.brewery}</div>
            </div>
            <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text3)' }}>{b.style || '—'}</div>
            {RATERS.map(r => (
              <div key={r} style={{ textAlign: 'center' }}><ScoreBadge score={b.ratings[r] ?? null} size="sm" /></div>
            ))}
            <div style={{ textAlign: 'center' }}><ScoreBadge score={b.avg} /></div>
            <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text3)', fontVariantNumeric: 'tabular-nums' }}>{b.abv != null ? `${b.abv}%` : '—'}</div>
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
    <div style={{ maxWidth: 1060, margin: '0 auto', padding: '0 28px 100px' }}>

      {/* Hero */}
      <div style={{ paddingTop: 72, paddingBottom: 56 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 4, marginBottom: 20 }}>
          Café Tyrol
        </div>
        <h1 style={{ fontSize: 'clamp(38px, 6vw, 72px)', fontWeight: 900, letterSpacing: -3, lineHeight: 0.95, color: 'var(--text)', marginBottom: 20 }}>
          Beer Wiki
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text3)', maxWidth: 320, lineHeight: 1.7, fontWeight: 400 }}>
          {allBeers.length} beers. Four friends. Every opinion on record.
        </p>
      </div>

      <Divider />

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap', marginBottom: 64 }}>
        {[
          ['Beers', allBeers.length, null],
          ['Ratings', totalRatings, null],
          ['Avg Score', avgScore, null],
          ['Best Beer', topBeer?.avg?.toFixed(1), topBeer?.name],
        ].map(([label, value, sub]) => (
          <div key={label}>
            <div style={{ fontSize: 42, fontWeight: 900, letterSpacing: -2, color: 'var(--text)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', marginTop: 6, textTransform: 'uppercase', letterSpacing: 2 }}>{label}</div>
            {sub && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 3, maxWidth: 160 }}>{sub}</div>}
          </div>
        ))}
      </div>

      {/* Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 64 }}>
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

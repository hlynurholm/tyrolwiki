const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function onRequestPost({ env }) {
  const results = []
  const migrations = [
    'ALTER TABLE beers ADD COLUMN description TEXT',
    'ALTER TABLE beers ADD COLUMN flavor_tags TEXT',
    'ALTER TABLE vinbudin_beers ADD COLUMN description TEXT',
    'ALTER TABLE vinbudin_beers ADD COLUMN flavor_tags TEXT',
  ]
  for (const sql of migrations) {
    try {
      await env.DB.prepare(sql).run()
      results.push({ sql, status: 'ok' })
    } catch (e) {
      // "duplicate column name" = already exists, that's fine
      results.push({ sql, status: e.message.includes('duplicate') ? 'already exists' : `error: ${e.message}` })
    }
  }
  return Response.json({ migrations: results }, { headers: CORS })
}

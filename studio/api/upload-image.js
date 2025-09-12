// Minimal placeholder endpoint. Wire real HEIC→WebP conversion here later.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('Allow', 'POST')
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  res.statusCode = 501
  res.setHeader('Content-Type', 'application/json')
  res.end(
    JSON.stringify({
      error:
        'HEIC server conversion is temporarily disabled. Please upload JPG/PNG/WebP for now.',
    }),
  )
}
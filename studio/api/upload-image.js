const Busboy = require('busboy')
const sharp = require('sharp')
const { createClient } = require('@sanity/client')

const projectId = process.env.SANITY_PROJECT_ID
const dataset = process.env.SANITY_DATASET
const token = process.env.SANITY_API_TOKEN

const client = createClient({
  projectId,
  dataset,
  token, // server-side only
  apiVersion: '2023-10-01',
  useCdn: false,
})

function cors(req, res) {
  const origin = req.headers.origin || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

module.exports = async function handler(req, res) {
  cors(req, res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    if (!projectId || !dataset || !token) {
      return res.status(500).json({ error: 'Missing SANITY_* environment variables' })
    }

    const file = await new Promise((resolve, reject) => {
      const bb = Busboy({ headers: req.headers })
      const chunks = []
      let filename = 'upload'
      let mime = 'application/octet-stream'
      let gotFile = false

      bb.on('file', (_name, stream, info) => {
        gotFile = true
        filename = info.filename || filename
        mime = info.mimeType || mime
        stream.on('data', d => chunks.push(d))
        stream.on('limit', () => reject(new Error('File too large')))
        stream.on('end', () => {})
      })

      bb.on('error', reject)
      bb.on('finish', () => {
        if (!gotFile) return reject(new Error('No file field in form-data'))
        resolve({ buffer: Buffer.concat(chunks), filename, mime })
      })

      req.pipe(bb)
    })

    const isHeic = /image\/hei[cf]/i.test(file.mime) || /\.(heic|heif)$/i.test(file.filename)

    let outBuffer = file.buffer
    let outName = file.filename
    let outMime = file.mime

    if (isHeic) {
      try {
        outBuffer = await sharp(file.buffer, { unlimited: true })
          .toFormat('webp', { quality: 92 })
          .toBuffer()
        outName = file.filename.replace(/\.(heic|heif)$/i, '') + '.webp'
        outMime = 'image/webp'
      } catch {
        outBuffer = await sharp(file.buffer, { unlimited: true }).jpeg({ quality: 92 }).toBuffer()
        outName = file.filename.replace(/\.(heic|heif)$/i, '') + '.jpg'
        outMime = 'image/jpeg'
      }
    }

    const asset = await client.assets.upload('image', outBuffer, {
      filename: outName,
      contentType: outMime,
    })

    return res.status(200).json({ assetId: asset._id, url: asset.url })
  } catch (err) {
    console.error('[upload-image] error:', err)
    return res.status(500).json({ error: err?.message || 'Upload failed' })
  }
}
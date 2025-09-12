const Busboy = require('busboy')
const { createClient } = require('@sanity/client')

const projectId = process.env.SANITY_PROJECT_ID
const dataset = process.env.SANITY_DATASET
const token = process.env.SANITY_API_TOKEN

const cloudName = process.env.CLOUDINARY_CLOUD_NAME
const uploadPreset = process.env.CLOUDINARY_UNSIGNED_PRESET

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

async function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const bb = Busboy({ headers: req.headers })
    let chunks = []
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
}

module.exports = async function handler(req, res) {
  cors(req, res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    if (!projectId || !dataset || !token) {
      return res.status(500).json({ error: 'Missing SANITY_* environment variables' })
    }
    if (!cloudName || !uploadPreset) {
      return res.status(500).json({ error: 'Missing CLOUDINARY_* environment variables' })
    }

    const { buffer, filename } = await parseMultipart(req)

    // 1) Upload raw file to Cloudinary (unsigned). Cloudinary can ingest HEIC.
    const form = new FormData()
    form.append('upload_preset', uploadPreset)
    // Trick: Cloudinary accepts raw binary file in the "file" field
    form.append('file', new Blob([buffer]), filename)

    const upRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: form,
    })

    const upJson = await upRes.json()
    if (!upRes.ok) {
      return res.status(500).json({ error: upJson?.error?.message || 'Cloudinary upload failed' })
    }

    const publicId = upJson.public_id
    // 2) Request a transformed URL (WebP; Cloudinary handles HEIC->WebP/JPG perfectly)
    // Example: https://res.cloudinary.com/<cloud>/image/upload/f_webp,q_90/<public_id>.webp
    const transformedUrl = `https://res.cloudinary.com/${cloudName}/image/upload/f_webp,q_90/${publicId}.webp`

    // 3) Fetch the transformed bytes
    const imgRes = await fetch(transformedUrl)
    if (!imgRes.ok) {
      return res.status(500).json({ error: 'Failed to fetch transformed image' })
    }
    const arrBuf = await imgRes.arrayBuffer()
    const outBuffer = Buffer.from(arrBuf)

    // 4) Upload to Sanity as an image asset
    const outName = filename.replace(/\.(heic|heif)$/i, '') + '.webp'
    const asset = await client.assets.upload('image', outBuffer, {
      filename: outName,
      contentType: 'image/webp',
    })

    return res.status(200).json({ assetId: asset._id, url: asset.url })
  } catch (err) {
    console.error('[upload-image] error:', err)
    return res.status(500).json({ error: err?.message || 'Upload failed' })
  }
}
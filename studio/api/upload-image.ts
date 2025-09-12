import type { VercelRequest, VercelResponse } from '@vercel/node'
import Busboy from 'busboy'
import sharp from 'sharp'
import { createClient } from '@sanity/client'

const projectId = process.env.SANITY_PROJECT_ID
const dataset = process.env.SANITY_DATASET
const token = process.env.SANITY_API_TOKEN

const client = createClient({
  projectId: projectId!,
  dataset: dataset!,
  token: token!,            // server-side only
  apiVersion: '2023-10-01',
  useCdn: false,
})

function cors(req: VercelRequest, res: VercelResponse) {
  const origin = (req.headers.origin as string) || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(req, res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const file: { buffer: Buffer; filename: string; mime: string } = await new Promise((resolve, reject) => {
      const bb = Busboy({ headers: req.headers as Record<string, string> })
      const chunks: Buffer[] = []
      let filename = 'upload'
      let mime = 'application/octet-stream'
      let gotFile = false

      bb.on('file', (_name: string, stream: NodeJS.ReadableStream, info: { filename: string; mimeType: string; encoding: string }) => {
        gotFile = true
        filename = info.filename || filename
        mime = info.mimeType || mime
        stream.on('data', (d: Buffer) => chunks.push(d))
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

    if (!projectId || !dataset || !token) {
      return res.status(500).json({ error: 'Missing SANITY_* environment variables' })
    }

    const isHeic = /image\\/hei[cf]/i.test(file.mime) || /\\.hei[cf]$/i.test(file.filename)

    let outBuffer = file.buffer
    let outName = file.filename
    let outMime = file.mime

    if (isHeic) {
      try {
        outBuffer = await sharp(file.buffer, { unlimited: true }).toFormat('webp', { quality: 92 }).toBuffer()
        outName = file.filename.replace(/\\.(heic|heif)$/i, '') + '.webp'
        outMime = 'image/webp'
      } catch {
        outBuffer = await sharp(file.buffer, { unlimited: true }).jpeg({ quality: 92 }).toBuffer()
        outName = file.filename.replace(/\\.(heic|heif)$/i, '') + '.jpg'
        outMime = 'image/jpeg'
      }
    }

    const asset = await client.assets.upload('image', outBuffer, { filename: outName, contentType: outMime })
    return res.status(200).json({ assetId: asset._id, url: (asset as any).url })
  } catch (err: any) {
    console.error('[upload-image] error:', err)
    return res.status(500).json({ error: err?.message || 'Upload failed' })
  }
}
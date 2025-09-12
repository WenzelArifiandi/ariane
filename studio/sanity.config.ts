import React, { useCallback, useState } from 'react'
import { useClient, set, unset } from 'sanity'
// @ts-ignore - heic2any has no types
import heic2any from 'heic2any'

type Props = {
  value?: any
  onChange: (patch: any) => void
  schemaType: any
  readOnly?: boolean
}

export function HeicImageInput(props: Props) {
  const { value, onChange, readOnly } = props
  const client = useClient({ apiVersion: '2023-10-01' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uploadBlob = useCallback(
    async (blob: Blob, filename: string) => {
      const asset = await client.assets.upload('image', blob, { filename })
      onChange(
        set({
          _type: 'image',
          asset: { _type: 'reference', _ref: asset._id },
        }),
      )
    },
    [client, onChange],
  )

  const handleFile = useCallback(
    async (file: File) => {
      setError(null)
      setBusy(true)
      try {
        if (file.type === 'image/heic' || file.type === 'image/heif' || /\.heic$/i.test(file.name) || /\.heif$/i.test(file.name)) {
          // Convert HEIC/HEIF to WebP in-browser
          const webpBlob = (await heic2any({
            blob: file,
            toType: 'image/webp',
            quality: 0.92,
          })) as Blob
          const base = file.name.replace(/\.(heic|heif)$/i, '')
          await uploadBlob(webpBlob, `${base}.webp`)
        } else {
          // Upload original
          await uploadBlob(file, file.name)
        }
      } catch (e: any) {
        console.error(e)
        setError(e?.message || 'Failed to process image')
      } finally {
        setBusy(false)
      }
    },
    [uploadBlob],
  )

  const onInputChange = useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      const f = ev.target.files?.[0]
      if (f) handleFile(f)
      // reset for same-file re-selects
      ev.currentTarget.value = ''
    },
    [handleFile],
  )

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div
        style={{
          border: '1px dashed var(--card-border-color)',
          borderRadius: 8,
          padding: 16,
        }}
      >
        <input
          type="file"
          accept="image/*,.heic,.heif"
          onChange={onInputChange}
          disabled={readOnly || busy}
        />
        <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
          {busy ? 'Processing…' : 'Drop or choose an image. HEIC/HEIF will be auto‑converted to WebP.'}
        </div>
        {error && (
          <div style={{ color: 'var(--sanity-danger-text)', fontSize: 12, marginTop: 6 }}>
            {error}
          </div>
        )}
      </div>

      {value?.asset?._ref ? (
        <div style={{ fontSize: 12, opacity: 0.8 }}>
          Asset set: <code>{value.asset._ref}</code>
        </div>
      ) : null}
    </div>
  )
}

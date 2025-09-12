import React, { useCallback, useState } from 'react'
import { set } from 'sanity'

type Props = {
  value?: any
  onChange: (patch: any) => void
  schemaType: any
  readOnly?: boolean
}

export function HeicImageInput(props: Props) {
  const { value, onChange, readOnly } = props
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function uploadViaApi(file: File) {
    const form = new FormData()
    form.append('file', file, file.name)

    const res = await fetch('/api/upload-image', {
      method: 'POST',
      body: form,
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data?.error || `Upload failed with ${res.status}`)
    }
    const data = await res.json()
    return data as { assetId: string; url?: string }
  }

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    setBusy(true)
    try {
      const { assetId } = await uploadViaApi(file)
      onChange(
        set({
          _type: 'image',
          asset: { _type: 'reference', _ref: assetId },
        }),
      )
    } catch (e: any) {
      console.error(e)
      setError(e?.message || 'Failed to process image')
    } finally {
      setBusy(false)
    }
  }, [onChange])

  const onInputChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const f = ev.target.files?.[0]
    if (f) void handleFile(f)
    ev.currentTarget.value = ''
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ border: '1px dashed var(--card-border-color)', borderRadius: 8, padding: 16 }}>
        <input
          type="file"
          accept="image/*,.heic,.heif"
          onChange={onInputChange}
          disabled={readOnly || busy}
        />
        <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
          {busy ? 'Processing…' : 'Drop or choose an image. HEIC/HEIF will be converted on the server.'}
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
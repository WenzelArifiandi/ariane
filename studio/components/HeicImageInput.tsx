import React, { useCallback, useState } from 'react'
import { set } from 'sanity'
import { Card, Stack, Text, Label, Box } from '@sanity/ui'

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

    const res = await fetch('/api/upload-image', { method: 'POST', body: form })
    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      throw new Error(data?.error || `Upload failed with ${res.status}`)
    }
    return data as { assetId: string; url?: string }
  }

  const handleFile = useCallback(
    async (file: File) => {
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
    },
    [onChange],
  )

  const onInputChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const f = ev.target.files?.[0]
    if (f) void handleFile(f)
    ev.currentTarget.value = '' // allow re-select same file
  }

  return (
    <Card padding={3} radius={2} tone="default" border>
      <Stack space={3}>
        <Label>Upload image</Label>
        <input
          type="file"
          accept="image/*,.heic,.heif"
          onChange={onInputChange}
          disabled={readOnly || busy}
        />
        <Text size={1} muted>
          {busy
            ? 'Processing…'
            : 'Drop or choose an image. HEIC/HEIF will be converted on the server.'}
        </Text>
        {error && (
          <Text size={1} tone="critical">
            {error}
          </Text>
        )}
        {value?.asset?._ref && (
          <Box>
            <Text size={1} muted>
              Asset: <code>{value.asset._ref}</code>
            </Text>
          </Box>
        )}
      </Stack>
    </Card>
  )
}
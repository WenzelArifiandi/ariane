import type { ObjectInputProps } from 'sanity'
import { Stack, Text } from '@sanity/ui'

/**
 * Lightweight helper wrapper around Sanity's default Image input.
 * No custom upload logic; just renders the default input and a note.
 * (We can wire server HEIC->WebP later.)
 */
export function HeicImageInput(props: ObjectInputProps | any) {
  return (
    <Stack space={3}>
      {props.renderDefault?.(props)}
      <Text size={1} muted>
        Tip: HEIC/HEIF images aren’t supported by browsers. Prefer JPG/PNG/WebP.
        (Server conversion can be enabled later.)
      </Text>
    </Stack>
  )
}

export default HeicImageInput
import { createClient } from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID
const dataset = import.meta.env.PUBLIC_SANITY_DATASET
const apiVersion = import.meta.env.PUBLIC_SANITY_API_VERSION ?? '2023-10-01'

// Guard against missing env during dev/build
if (!projectId || !dataset) {
  throw new Error('[sanity] Missing PUBLIC_SANITY_PROJECT_ID or PUBLIC_SANITY_DATASET')
}

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,            // fast, public, cached reads
  perspective: 'published',
})

const builder = imageUrlBuilder(client)
// Type-safe image source without importing deep types
// (uses the parameter type of builder.image)
export type ImageSource = Parameters<typeof builder.image>[0]
export const urlFor = (src: ImageSource) => builder.image(src)

// Small helper for typed GROQ fetches
export async function fetchSanity<T>(query: string, params?: Record<string, unknown>) {
  return client.fetch<T>(query, params)
}
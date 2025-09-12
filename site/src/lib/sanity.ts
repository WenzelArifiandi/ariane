import { createClient } from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID
const dataset = import.meta.env.PUBLIC_SANITY_DATASET
const apiVersion = import.meta.env.PUBLIC_SANITY_API_VERSION

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
  perspective: 'published',
})

const builder = imageUrlBuilder(client)
export const urlFor = (src: any) => builder.image(src)
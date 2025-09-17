type SeoInput = {
  title?: string
  description?: string
  url?: string
  image?: string
}

export function seoMeta({
  title = 'Ariane',
  description = 'Design portfolio — built with Astro + Sanity + Vercel.',
  url = 'https://ariane.vercel.app',
  image = '/og-default.jpg',
}: SeoInput = {}) {
  const t = title ? `${title}` : 'Ariane'
  return /* html */ `
    <meta name="description" content="${escapeHtml(description)}" />
    <meta property="og:title" content="${escapeHtml(t)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${escapeHtml(url)}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(t)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
  `
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
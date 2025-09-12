<file name=site/src/lib/queries.ts>
export const projectBySlug = groq`
  *[_type == "project" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    hero,
    gallery[defined(asset)]{..., "alt": coalesce(alt, ^.^.title)},
    ...
  }
`
</file>

<file name=site/src/pages/work/index.astro>
{p.hero?.asset?._ref && <img
  src={urlFor(p.hero).width(800).height(600).fit('crop').auto('format').url()}
  alt={p.hero.alt} loading="lazy" class="aspect-[4/3] w-full object-cover rounded-lg" />}
</file>

<file name=site/src/pages/work/[slug].astro>
{project.hero?.asset?._ref && (
  <img
    src={urlFor(project.hero).width(1600).fit('max').auto('format').url()}
    alt={project.hero.alt}
    class="mt-8 rounded-xl"
    loading="eager"
  />
)}

{(project.gallery?.filter((g: any) => g?.asset?._ref) || []).length > 0 && (
  <section class="mt-10 grid gap-6 sm:grid-cols-2">
    {project.gallery.filter((img: any) => img?.asset?._ref).map((img: any) => (
      <figure>
        <img
          src={urlFor(img).width(1200).fit('max').auto('format').url()}
          alt={img.alt ?? project.title}
          loading="lazy"
          class="rounded-lg"
        />
        {img.caption && <figcaption class="mt-2 text-sm text-neutral-500">{img.caption}</figcaption>}
      </figure>
    ))}
  </section>
)}
</file>
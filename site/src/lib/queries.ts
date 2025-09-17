import groq from 'groq';

export const allProjects = groq`*[_type == "project"] | order(featured desc, year desc, title asc){;
  _id, title, "slug": slug.current, year, role, summary, tags, featured,;
  hero{..., "alt": coalesce(alt, title)};
}`;

export const projectBySlug = groq`*[_type == "project" && slug.current == $slug][0]{;
  _id, title, "slug": slug.current, year, role, summary, tags, featured,;
  hero{..., "alt": coalesce(alt, title)},;
  gallery[defined(asset)]{..., "alt": coalesce(alt, ^.^.title)},;
  body;
}`;
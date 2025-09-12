import { defineField, defineType } from 'sanity'
import { HeicImageInput } from '../components/HeicImageInput'

export default defineType({
  name: 'project',
  type: 'document',
  title: 'Project',
  fields: [
    defineField({ name: 'title', type: 'string', validation: r => r.required() }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: r => r.required(),
    }),
    defineField({ name: 'year', type: 'number' }),
    defineField({ name: 'role', type: 'string' }),
    defineField({ name: 'summary', type: 'text' }),
    defineField({ name: 'tags', type: 'array', of: [{ type: 'string' }] }),
    defineField({ name: 'featured', type: 'boolean' }),

    defineField({
  name: 'hero',
  type: 'image',
  options: { hotspot: true },
  fields: [{ name: 'alt', type: 'string' }],
  // ⬇️ validation: require asset on publish
  validation: (Rule) =>
    Rule.custom((val) => (val?.asset?._ref ? true : 'Hero image is required')),
}),

    defineField({
  name: 'gallery',
  title: 'Gallery',
  type: 'array',
  of: [
    {
      type: 'image',
      options: { hotspot: true },
      fields: [{ name: 'caption', type: 'string' }],
    },
  ],
  // ⬇️ validation: every item must have an asset
  validation: (Rule) =>
    Rule.custom((items) =>
      (items || []).every((i) => i?.asset?._ref)
        ? true
        : 'All gallery images must be uploaded (no empty items).'
    ),
}),

    defineField({
      name: 'body',
      title: 'Case Study',
      type: 'array',
      of: [
        { type: 'block' },
        {
          type: 'image',
          options: { hotspot: true },
          fields: [{ name: 'caption', type: 'string' }],
        },
      ],
    }),
  ],
})
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
      components: { input: HeicImageInput },
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
          components: { input: HeicImageInput },
        },
      ],
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
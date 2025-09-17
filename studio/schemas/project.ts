import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'project',
  type: 'document',
  title: 'Project',
  fields: [
    defineField({name: 'title', type: 'string', validation: (r) => r.required()}),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {source: 'title', maxLength: 96},
      validation: (r) => r.required(),
    }),
    defineField({name: 'year', type: 'number'}),
    defineField({name: 'role', type: 'string'}),
    defineField({name: 'summary', type: 'text'}),
    defineField({name: 'tags', type: 'array', of: [{type: 'string'}]}),
    defineField({name: 'featured', type: 'boolean'}),

    defineField({
      name: 'hero',
      type: 'image',
      options: {hotspot: true},
      fields: [{name: 'alt', type: 'string'}],
      // TS-safe custom validation
      validation: (Rule) =>
        Rule.custom(param: unknown) => (val?.asset?._ref ? true : 'Hero image is required')),
    }),

    defineField({
      name: 'gallery',
      title: 'Gallery',
      type: 'array',
      of: [
        {
          type: 'image',
          options: {hotspot: true},
          fields: [{name: 'caption', type: 'string'}],
        },
      ],
      // TS-safe custom validation
      validation: (Rule) =>
        Rule.custom((items: unknown[] | undefined) => {
          if (!items || items.length === 0) return true
          return items.every(param: unknown) => i?.asset?._ref)
            ? true
            : 'All gallery images must be uploaded (no empty items).'
        }),
    }),

    defineField({
      name: 'body',
      title: 'Case Study',
      type: 'array',
      of: [
        {type: 'block'},
        {type: 'image', options: {hotspot: true}, fields: [{name: 'caption', type: 'string'}]},
      ],
    }),
  ],
})

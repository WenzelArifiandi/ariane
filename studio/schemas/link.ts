import { defineField, defineType } from 'sanity'
export default defineType({
  name: 'link',
  type: 'document',
  title: 'Link',
  fields: [
    defineField({ name: 'label', type: 'string', validation: r => r.required() }),
    defineField({ name: 'url', type: 'url', validation: r => r.required() }),
    defineField({ name: 'category', type: 'string' }),
    defineField({ name: 'pin', type: 'boolean' })
  ]
})
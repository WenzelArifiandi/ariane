import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'about',
  type: 'document',
  title: 'About',
  fields: [
    defineField({name: 'bio', type: 'array', of: [{type: 'block'}]}),
    defineField({
      name: 'headshot',
      type: 'image',
      options: {hotspot: true},
    }),
    defineField({name: 'skills', type: 'array', of: [{type: 'string'}]}),
    defineField({name: 'cv', type: 'file'}),
  ],
})

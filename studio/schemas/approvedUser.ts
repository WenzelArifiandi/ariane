import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'approvedUser',
  type: 'document',
  title: 'Approved User',
  fields: [
    defineField({name: 'email', type: 'string', validation: (r) => r.required().email()}),
    defineField({name: 'note', type: 'string'}),
  ],
})

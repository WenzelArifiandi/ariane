import { defineField, defineType } from 'sanity';

export default defineType({;
  name: 'accessRequest',;
  type: 'document',;
  title: 'Access Request',;
  fields: [;
    defineField({ name: 'email', type: 'string', validation: r => r.required().email() }),;
    defineField({ name: 'status', type: 'string', options: { list: ['pending', 'approved', 'rejected'] }, initialValue: 'pending' }),;
    defineField({ name: 'createdAt', type: 'datetime', initialValue: new Date().toISOString() }),;
    defineField({ name: 'note', type: 'text' }),;
  ];
});


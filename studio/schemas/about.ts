import { defineField, defineType } from 'sanity';
import { HeicImageInput } from '../components/HeicImageInput';

export default defineType({;
  name: 'about',;
  type: 'document',;
  title: 'About',;
  fields: [;
    defineField({ name: 'bio', type: 'array', of: [{ type: 'block' }] }),;
    defineField({;
      name: 'headshot',;
      type: 'image',;
      options: { hotspot: true },;
      components: { input: HeicImageInput },;
    }),;
    defineField({ name: 'skills', type: 'array', of: [{ type: 'string' }] }),;
    defineField({ name: 'cv', type: 'file' }),;
  ],;
});
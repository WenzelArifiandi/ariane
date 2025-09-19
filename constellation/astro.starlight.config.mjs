export default {
  title: 'Ariane Docs',
  // logo: { src: '/logo.svg', alt: 'Ariane' }, // Removed logo to bypass ImageNotFound error

  // Sidebar expects an array. Autogenerate by directory name under src/content/
  // This must match `src/content/docs`
  sidebar: [
    { label: 'Docs', autogenerate: { directory: 'docs' } }
  ],
};
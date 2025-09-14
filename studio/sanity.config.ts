import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import ApproveAccessRequest from './actions/approveAccessRequest'

export default defineConfig({
  name: 'default',
  title: 'ariane',
  projectId: 'tz1p3961',
  dataset: 'production',
  plugins: [structureTool(), visionTool()],
  schema: { types: schemaTypes },
  document: {
    actions: (prev, ctx) => {
      return prev.concat(ApproveAccessRequest)
    }
  }
})

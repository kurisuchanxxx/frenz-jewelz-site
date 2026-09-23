import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {itITLocale} from '@sanity/locale-it-it'
import {schemaTypes} from './schemaTypes'
import {structure, SINGLETON_TYPES} from './structure'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID!
const dataset = process.env.SANITY_STUDIO_DATASET || 'production'

// Tipi creati solo dal sito (webhook Stripe, form su misura): niente "Crea nuovo" in Studio.
const SYSTEM_TYPES = new Set(['order', 'customRequest'])

export default defineConfig({
  name: 'default',
  title: 'Frenz Jewelz',
  projectId,
  dataset,
  plugins: [structureTool({structure}), visionTool(), itITLocale()],
  schema: {
    types: schemaTypes,
    templates: (templates) =>
      templates.filter(
        ({schemaType}) => !SINGLETON_TYPES.has(schemaType) && !SYSTEM_TYPES.has(schemaType),
      ),
  },
  document: {
    // Singleton: niente duplica / elimina.
    actions: (actions, {schemaType}) =>
      SINGLETON_TYPES.has(schemaType)
        ? actions.filter(({action}) => action && ['publish', 'discardChanges', 'restore'].includes(action))
        : actions,
    newDocumentOptions: (items) =>
      items.filter(
        ({templateId}) => !SINGLETON_TYPES.has(templateId) && !SYSTEM_TYPES.has(templateId),
      ),
  },
})

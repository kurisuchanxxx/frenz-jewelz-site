import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID,
    dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  },
  // URL dello Studio: https://frenzjewelz.sanity.studio (chiesto al primo `sanity deploy` se occupato)
  studioHost: 'frenzjewelz',
})

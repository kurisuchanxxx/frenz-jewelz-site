import {defineArrayMember, defineField, defineType} from 'sanity'
import {CogIcon} from '@sanity/icons/Cog'

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Impostazioni sito',
  type: 'document',
  icon: CogIcon,
  groups: [
    {name: 'home', title: 'Home', default: true},
    {name: 'shop', title: 'Shop e spedizioni'},
    {name: 'contacts', title: 'Contatti e social'},
  ],
  fields: [
    defineField({name: 'heroImage', title: 'Foto hero', type: 'imageWithAlt', group: 'home'}),
    defineField({name: 'heroHeadline', title: 'Headline', type: 'string', group: 'home'}),
    defineField({name: 'heroSubline', title: 'Sottotitolo', type: 'text', rows: 2, group: 'home'}),
    defineField({
      name: 'lookbookImages',
      title: 'Lookbook',
      type: 'array',
      group: 'home',
      description: 'Foto indossate della griglia in home. Meglio multipli di 3.',
      of: [defineArrayMember({type: 'imageWithAlt'})],
      options: {layout: 'grid'},
    }),
    defineField({
      name: 'announcementBar',
      title: 'Barra annunci',
      type: 'string',
      group: 'shop',
      description: 'Testo breve in cima al sito (es. "Spedizione gratuita sopra i 100 €"). Vuoto = nascosta.',
    }),
    defineField({
      name: 'shippingOptions',
      title: 'Opzioni di spedizione',
      type: 'array',
      group: 'shop',
      description: 'Mostrate al checkout Stripe. Massimo 5.',
      of: [defineArrayMember({type: 'shippingOption'})],
      validation: (rule) => rule.required().min(1).max(5),
    }),
    defineField({
      name: 'freeShippingThreshold',
      title: 'Soglia spedizione gratuita (centesimi)',
      type: 'number',
      group: 'shop',
      description: 'Opzionale: sopra questo totale la spedizione è gratuita. 10000 = 100,00 €.',
      validation: (rule) => rule.integer().min(0),
    }),
    defineField({name: 'contactEmail', title: 'Email contatti', type: 'email', group: 'contacts'}),
    defineField({name: 'instagramUrl', title: 'Instagram', type: 'url', group: 'contacts'}),
    defineField({name: 'facebookUrl', title: 'Facebook', type: 'url', group: 'contacts'}),
  ],
  preview: {prepare: () => ({title: 'Impostazioni sito'})},
})

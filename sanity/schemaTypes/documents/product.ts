import {defineArrayMember, defineField, defineType} from 'sanity'
import {DiamondIcon} from '@sanity/icons/Diamond'

export const PRODUCTION_TYPES = [
  {title: 'Pezzo unico', value: 'pezzoUnico'},
  {title: 'Piccola serie', value: 'piccolaSerie'},
  {title: 'Su ordinazione', value: 'suOrdinazione'},
]

const formatEuro = (cents?: number) =>
  typeof cents === 'number' ? `${(cents / 100).toFixed(2).replace('.', ',')} €` : 'senza prezzo'

export const product = defineType({
  name: 'product',
  title: 'Prodotto',
  type: 'document',
  icon: DiamondIcon,
  groups: [
    {name: 'main', title: 'Principale', default: true},
    {name: 'media', title: 'Foto'},
    {name: 'inventory', title: 'Prezzo e disponibilità'},
    {name: 'content', title: 'Descrizione'},
    {name: 'seo', title: 'SEO'},
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Nome',
      type: 'string',
      group: 'main',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug (URL)',
      type: 'slug',
      group: 'main',
      description: 'Parte finale dell’indirizzo: /shop/slug. Non cambiarlo dopo la pubblicazione.',
      options: {source: 'title', maxLength: 96},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Categoria',
      type: 'reference',
      group: 'main',
      to: [{type: 'category'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'collab',
      title: 'Collab',
      type: 'reference',
      group: 'main',
      to: [{type: 'collaboration'}],
      description: 'Solo se il pezzo nasce da una collaborazione con un artista.',
    }),
    defineField({
      name: 'featured',
      title: 'In evidenza in home',
      type: 'boolean',
      group: 'main',
      initialValue: false,
    }),
    defineField({
      name: 'sortOrder',
      title: 'Ordine',
      type: 'number',
      group: 'main',
      description: 'Numero più basso = mostrato prima nello shop.',
      initialValue: 100,
      validation: (rule) => rule.integer(),
    }),

    // Foto
    defineField({
      name: 'images',
      title: 'Foto prodotto',
      type: 'array',
      group: 'media',
      description: 'La prima foto è la copertina nello shop. Usa sempre lo stesso sfondo e ritaglio.',
      of: [defineArrayMember({type: 'imageWithAlt'})],
      options: {layout: 'grid'},
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'lifestyleImages',
      title: 'Foto indossate',
      type: 'array',
      group: 'media',
      of: [defineArrayMember({type: 'imageWithAlt'})],
      options: {layout: 'grid'},
    }),

    // Prezzo e disponibilità
    defineField({
      name: 'price',
      title: 'Prezzo (centesimi)',
      type: 'number',
      group: 'inventory',
      description: 'In centesimi di euro, IVA inclusa: 6000 = 60,00 €.',
      validation: (rule) => rule.required().integer().min(100),
    }),
    defineField({
      name: 'compareAtPrice',
      title: 'Prezzo barrato (centesimi)',
      type: 'number',
      group: 'inventory',
      description: 'Opzionale: prezzo precedente mostrato barrato. Deve essere più alto del prezzo.',
      validation: (rule) =>
        rule.integer().custom((value, {document}) => {
          const price = document?.price as number | undefined
          return typeof value === 'number' && typeof price === 'number' && value <= price
            ? 'Deve essere più alto del prezzo attuale.'
            : true
        }),
    }),
    defineField({
      name: 'productionType',
      title: 'Tipo di produzione',
      type: 'string',
      group: 'inventory',
      options: {list: PRODUCTION_TYPES, layout: 'radio'},
      initialValue: 'piccolaSerie',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'stock',
      title: 'Pezzi disponibili',
      type: 'number',
      group: 'inventory',
      description: 'Scala da solo a ogni ordine. Pezzo unico: 1 (0 quando venduto).',
      initialValue: 1,
      hidden: ({document}) => document?.productionType === 'suOrdinazione',
      validation: (rule) =>
        rule.integer().min(0).custom((value, {document}) => {
          if (document?.productionType === 'suOrdinazione') return true
          if (typeof value !== 'number') return 'Indica quanti pezzi hai.'
          if (document?.productionType === 'pezzoUnico' && value > 1)
            return 'Un pezzo unico può avere al massimo 1 pezzo.'
          return true
        }),
    }),
    defineField({
      name: 'leadTimeDays',
      title: 'Tempi di realizzazione (giorni)',
      type: 'number',
      group: 'inventory',
      hidden: ({document}) => document?.productionType !== 'suOrdinazione',
      validation: (rule) => rule.integer().min(1),
    }),
    defineField({
      name: 'isAvailable',
      title: 'In vendita',
      type: 'boolean',
      group: 'inventory',
      description:
        'Spegni per nascondere il bottone di acquisto. Se i pezzi arrivano a 0 il prodotto risulta comunque esaurito.',
      initialValue: true,
    }),
    defineField({
      name: 'isPersonalizable',
      title: 'Personalizzabile',
      type: 'boolean',
      group: 'inventory',
      description: 'Mostra il link alla pagina Su misura.',
      initialValue: false,
    }),

    // Descrizione
    defineField({
      name: 'shortDescription',
      title: 'Descrizione breve',
      type: 'text',
      group: 'content',
      rows: 3,
      validation: (rule) => rule.max(200),
    }),
    defineField({
      name: 'description',
      title: 'Descrizione',
      type: 'blockContent',
      group: 'content',
    }),
    defineField({
      name: 'material',
      title: 'Materiale',
      type: 'string',
      group: 'content',
      initialValue: 'Argento 925',
    }),
    defineField({
      name: 'details',
      title: 'Dettagli',
      type: 'productDetails',
      group: 'content',
    }),

    defineField({name: 'seo', title: 'SEO', type: 'seo', group: 'seo'}),
  ],
  orderings: [
    {title: 'Ordine shop', name: 'sortOrderAsc', by: [{field: 'sortOrder', direction: 'asc'}]},
    {title: 'Prezzo crescente', name: 'priceAsc', by: [{field: 'price', direction: 'asc'}]},
  ],
  preview: {
    select: {
      title: 'title',
      media: 'images.0',
      price: 'price',
      stock: 'stock',
      productionType: 'productionType',
      isAvailable: 'isAvailable',
    },
    prepare: ({title, media, price, stock, productionType, isAvailable}) => {
      const soldOut = productionType !== 'suOrdinazione' && (stock ?? 0) <= 0
      const status = !isAvailable ? 'non in vendita' : soldOut ? 'esaurito' : productionType === 'suOrdinazione' ? 'su ordinazione' : `${stock} pz`
      return {title, media, subtitle: `${formatEuro(price)} · ${status}`}
    },
  },
})

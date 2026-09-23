import {defineField, defineType} from 'sanity'
import {PackageIcon} from '@sanity/icons/Package'

export const shippingOption = defineType({
  name: 'shippingOption',
  title: 'Opzione di spedizione',
  type: 'object',
  icon: PackageIcon,
  fields: [
    defineField({
      name: 'label',
      title: 'Nome',
      type: 'string',
      description: 'Come appare al checkout (es. "Corriere espresso Italia").',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'price',
      title: 'Prezzo (centesimi)',
      type: 'number',
      description: 'In centesimi di euro: 690 = 6,90 €. 0 = gratuita.',
      validation: (rule) => rule.required().integer().min(0),
    }),
    defineField({
      name: 'minDays',
      title: 'Giorni lavorativi (min)',
      type: 'number',
      validation: (rule) => rule.required().integer().min(1),
    }),
    defineField({
      name: 'maxDays',
      title: 'Giorni lavorativi (max)',
      type: 'number',
      validation: (rule) =>
        rule
          .required()
          .integer()
          .custom((max, {parent}) => {
            const min = (parent as {minDays?: number} | undefined)?.minDays
            return typeof max === 'number' && typeof min === 'number' && max < min
              ? 'Deve essere maggiore o uguale al minimo.'
              : true
          }),
    }),
  ],
  preview: {
    select: {label: 'label', price: 'price', minDays: 'minDays', maxDays: 'maxDays'},
    prepare: ({label, price, minDays, maxDays}) => ({
      title: label,
      subtitle: `${typeof price === 'number' ? (price / 100).toFixed(2).replace('.', ',') + ' €' : '-'} · ${minDays ?? '?'}-${maxDays ?? '?'} giorni`,
    }),
  },
})

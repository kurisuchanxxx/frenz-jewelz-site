import {defineArrayMember, defineField, defineType} from 'sanity'
import {EnvelopeIcon} from '@sanity/icons/Envelope'

export const REQUEST_STATUSES = [
  {title: 'Nuova', value: 'nuova'},
  {title: 'In contatto', value: 'inContatto'},
  {title: 'Preventivo inviato', value: 'preventivoInviato'},
  {title: 'Confermata', value: 'confermata'},
  {title: 'Chiusa', value: 'chiusa'},
]

export const PIECE_TYPES = [
  {title: 'Collana / ciondolo', value: 'collana'},
  {title: 'Anello', value: 'anello'},
  {title: 'Bracciale', value: 'bracciale'},
  {title: 'Altro', value: 'altro'},
]

export const BUDGET_RANGES = [
  {title: 'Fino a 100 €', value: 'fino100'},
  {title: '100-200 €', value: '100-200'},
  {title: '200-400 €', value: '200-400'},
  {title: 'Oltre 400 €', value: 'oltre400'},
  {title: 'Non so', value: 'nonSo'},
]

/** Creata dal form /su-misura. In Studio si aggiorna lo stato man mano. */
export const customRequest = defineType({
  name: 'customRequest',
  title: 'Richiesta su misura',
  type: 'document',
  icon: EnvelopeIcon,
  fields: [
    defineField({
      name: 'status',
      title: 'Stato',
      type: 'string',
      options: {list: REQUEST_STATUSES, layout: 'radio'},
      initialValue: 'nuova',
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'name', title: 'Nome', type: 'string', readOnly: true}),
    defineField({name: 'email', title: 'Email', type: 'string', readOnly: true}),
    defineField({name: 'phone', title: 'Telefono', type: 'string', readOnly: true}),
    defineField({
      name: 'pieceType',
      title: 'Tipo di pezzo',
      type: 'string',
      options: {list: PIECE_TYPES},
      readOnly: true,
    }),
    defineField({
      name: 'budgetRange',
      title: 'Budget',
      type: 'string',
      options: {list: BUDGET_RANGES},
      readOnly: true,
    }),
    defineField({name: 'message', title: 'Messaggio', type: 'text', rows: 6, readOnly: true}),
    defineField({
      name: 'references',
      title: 'Riferimenti',
      type: 'array',
      readOnly: true,
      of: [
        defineArrayMember({type: 'image'}),
        defineArrayMember({
          name: 'referenceLink',
          title: 'Link',
          type: 'object',
          fields: [defineField({name: 'url', title: 'URL', type: 'url'})],
          preview: {select: {title: 'url'}},
        }),
      ],
    }),
    defineField({name: 'createdAt', title: 'Ricevuta il', type: 'datetime', readOnly: true}),
  ],
  orderings: [{title: 'Più recenti', name: 'createdAtDesc', by: [{field: 'createdAt', direction: 'desc'}]}],
  preview: {
    select: {name: 'name', pieceType: 'pieceType', status: 'status', createdAt: 'createdAt'},
    prepare: ({name, pieceType, status, createdAt}) => ({
      title: name ?? 'Richiesta',
      subtitle: [
        REQUEST_STATUSES.find((s) => s.value === status)?.title,
        PIECE_TYPES.find((p) => p.value === pieceType)?.title,
        createdAt ? new Date(createdAt).toLocaleDateString('it-IT') : null,
      ]
        .filter(Boolean)
        .join(' · '),
    }),
  },
})

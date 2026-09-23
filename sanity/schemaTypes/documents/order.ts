import {defineArrayMember, defineField, defineType} from 'sanity'
import {BasketIcon} from '@sanity/icons/Basket'

export const ORDER_STATUSES = [
  {title: 'Pagato', value: 'pagato'},
  {title: 'Da verificare (stock esaurito)', value: 'daVerificare'},
  {title: 'Spedito', value: 'spedito'},
  {title: 'Completato', value: 'completato'},
  {title: 'Rimborsato', value: 'rimborsato'},
]

const euro = (cents?: number) =>
  typeof cents === 'number' ? `${(cents / 100).toFixed(2).replace('.', ',')} €` : ''

/**
 * Creato solo dal webhook Stripe. In Studio si modificano solo stato, tracking e note:
 * tutto il resto è in sola lettura per non disallinearlo da Stripe.
 */
export const order = defineType({
  name: 'order',
  title: 'Ordine',
  type: 'document',
  icon: BasketIcon,
  groups: [
    {name: 'manage', title: 'Gestione', default: true},
    {name: 'details', title: 'Dettagli ordine'},
    {name: 'stripe', title: 'Stripe'},
  ],
  fields: [
    defineField({
      name: 'status',
      title: 'Stato',
      type: 'string',
      group: 'manage',
      options: {list: ORDER_STATUSES, layout: 'radio'},
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'trackingNumber', title: 'Numero di tracking', type: 'string', group: 'manage'}),
    defineField({name: 'notes', title: 'Note interne', type: 'text', rows: 3, group: 'manage'}),

    defineField({name: 'orderNumber', title: 'Numero ordine', type: 'string', group: 'details', readOnly: true}),
    defineField({name: 'createdAt', title: 'Data', type: 'datetime', group: 'details', readOnly: true}),
    defineField({
      name: 'items',
      title: 'Articoli',
      type: 'array',
      group: 'details',
      readOnly: true,
      of: [
        defineArrayMember({
          name: 'orderItem',
          title: 'Articolo',
          type: 'object',
          fields: [
            defineField({name: 'productRef', title: 'Prodotto', type: 'reference', to: [{type: 'product'}], weak: true}),
            defineField({name: 'title', title: 'Nome', type: 'string'}),
            defineField({name: 'quantity', title: 'Quantità', type: 'number'}),
            defineField({name: 'unitPrice', title: 'Prezzo unitario (centesimi)', type: 'number'}),
          ],
          preview: {
            select: {title: 'title', quantity: 'quantity', unitPrice: 'unitPrice'},
            prepare: ({title, quantity, unitPrice}) => ({
              title: `${quantity ?? 1} × ${title}`,
              subtitle: euro(unitPrice),
            }),
          },
        }),
      ],
    }),
    defineField({name: 'shippingCost', title: 'Spedizione (centesimi)', type: 'number', group: 'details', readOnly: true}),
    defineField({name: 'total', title: 'Totale (centesimi)', type: 'number', group: 'details', readOnly: true}),
    defineField({name: 'customerName', title: 'Cliente', type: 'string', group: 'details', readOnly: true}),
    defineField({name: 'customerEmail', title: 'Email', type: 'string', group: 'details', readOnly: true}),
    defineField({name: 'customerPhone', title: 'Telefono', type: 'string', group: 'details', readOnly: true}),
    defineField({
      name: 'shippingAddress',
      title: 'Indirizzo di spedizione',
      type: 'object',
      group: 'details',
      readOnly: true,
      fields: [
        defineField({name: 'name', title: 'Destinatario', type: 'string'}),
        defineField({name: 'line1', title: 'Indirizzo', type: 'string'}),
        defineField({name: 'line2', title: 'Indirizzo (riga 2)', type: 'string'}),
        defineField({name: 'postalCode', title: 'CAP', type: 'string'}),
        defineField({name: 'city', title: 'Città', type: 'string'}),
        defineField({name: 'state', title: 'Provincia', type: 'string'}),
        defineField({name: 'country', title: 'Paese', type: 'string'}),
      ],
    }),

    defineField({name: 'stripeSessionId', title: 'Checkout Session ID', type: 'string', group: 'stripe', readOnly: true}),
    defineField({name: 'stripePaymentIntentId', title: 'Payment Intent ID', type: 'string', group: 'stripe', readOnly: true}),
  ],
  orderings: [{title: 'Più recenti', name: 'createdAtDesc', by: [{field: 'createdAt', direction: 'desc'}]}],
  preview: {
    select: {orderNumber: 'orderNumber', customerName: 'customerName', total: 'total', status: 'status'},
    prepare: ({orderNumber, customerName, total, status}) => ({
      title: `${orderNumber ?? 'Ordine'} · ${customerName ?? ''}`,
      subtitle: `${euro(total)} · ${ORDER_STATUSES.find((s) => s.value === status)?.title ?? status ?? ''}`,
    }),
  },
})

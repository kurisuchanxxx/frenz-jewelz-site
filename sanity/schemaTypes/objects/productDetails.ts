import {defineField, defineType} from 'sanity'

export const productDetails = defineType({
  name: 'productDetails',
  title: 'Dettagli',
  type: 'object',
  fields: [
    defineField({name: 'dimensions', title: 'Dimensioni', type: 'string', description: 'Es. 3 x 2 cm'}),
    defineField({name: 'chainLength', title: 'Lunghezza catena', type: 'string', description: 'Es. 50 cm'}),
    defineField({name: 'weight', title: 'Peso', type: 'string', description: 'Es. 12 g'}),
    defineField({name: 'finish', title: 'Finitura', type: 'string', description: 'Es. lucida, satinata, ossidata'}),
  ],
})

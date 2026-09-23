import {defineField, defineType} from 'sanity'
import {ImageIcon} from '@sanity/icons/Image'

/** Immagine con hotspot e testo alternativo obbligatorio. */
export const imageWithAlt = defineType({
  name: 'imageWithAlt',
  title: 'Immagine',
  type: 'image',
  icon: ImageIcon,
  options: {hotspot: true},
  fields: [
    defineField({
      name: 'alt',
      title: 'Testo alternativo',
      type: 'string',
      description: 'Descrivi la foto per chi non la vede (es. "Collana 2PAC in argento su fondo nero").',
      validation: (rule) => rule.required(),
    }),
  ],
})

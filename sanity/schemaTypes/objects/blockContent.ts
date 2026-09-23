import {defineArrayMember, defineField, defineType} from 'sanity'

/** Testo ricco (Portable Text) usato da prodotti, pagine e collab. */
export const blockContent = defineType({
  name: 'blockContent',
  title: 'Testo',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [
        {title: 'Normale', value: 'normal'},
        {title: 'Titolo 2', value: 'h2'},
        {title: 'Titolo 3', value: 'h3'},
        {title: 'Citazione', value: 'blockquote'},
      ],
      lists: [
        {title: 'Elenco puntato', value: 'bullet'},
        {title: 'Elenco numerato', value: 'number'},
      ],
      marks: {
        decorators: [
          {title: 'Grassetto', value: 'strong'},
          {title: 'Corsivo', value: 'em'},
        ],
        annotations: [
          defineArrayMember({
            name: 'link',
            title: 'Link',
            type: 'object',
            fields: [
              defineField({
                name: 'href',
                title: 'URL',
                type: 'url',
                description: 'Link esterni con https://, interni con /percorso (es. /spedizioni-resi).',
                validation: (rule) =>
                  rule.required().uri({allowRelative: true, scheme: ['http', 'https', 'mailto', 'tel']}),
              }),
            ],
          }),
        ],
      },
    }),
    defineArrayMember({
      type: 'image',
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          title: 'Testo alternativo',
          type: 'string',
          validation: (rule) => rule.required(),
        }),
      ],
    }),
  ],
})

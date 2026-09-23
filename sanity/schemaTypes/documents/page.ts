import {defineArrayMember, defineField, defineType} from 'sanity'
import {DocumentTextIcon} from '@sanity/icons/DocumentText'

/** Pagine di testo: About, legali, spedizioni, guida. Lo slug deve combaciare con la route del sito. */
export const page = defineType({
  name: 'page',
  title: 'Pagina',
  type: 'document',
  icon: DocumentTextIcon,
  fields: [
    defineField({name: 'title', title: 'Titolo', type: 'string', validation: (rule) => rule.required()}),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description:
        'Deve corrispondere alla pagina del sito: about, spedizioni-resi, guida, termini, privacy, cookie.',
      options: {source: 'title', maxLength: 64},
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'body', title: 'Testo', type: 'blockContent'}),
    defineField({
      name: 'images',
      title: 'Foto',
      type: 'array',
      description: 'Foto mostrate sotto il testo, una sotto l’altra (es. pagina About).',
      of: [defineArrayMember({type: 'imageWithAlt'})],
      options: {layout: 'grid'},
    }),
    defineField({name: 'seo', title: 'SEO', type: 'seo'}),
  ],
  preview: {select: {title: 'title', subtitle: 'slug.current'}},
})

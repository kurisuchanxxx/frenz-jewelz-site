import {defineArrayMember, defineField, defineType} from 'sanity'
import {UsersIcon} from '@sanity/icons/Users'

export const collaboration = defineType({
  name: 'collaboration',
  title: 'Collab',
  type: 'document',
  icon: UsersIcon,
  fields: [
    defineField({
      name: 'artistName',
      title: 'Artista',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'artistName', maxLength: 64},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'portrait',
      title: 'Foto',
      type: 'imageWithAlt',
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'description', title: 'Descrizione', type: 'blockContent'}),
    defineField({
      name: 'pieces',
      title: 'Pezzi della collab',
      type: 'array',
      of: [defineArrayMember({type: 'reference', to: [{type: 'product'}]})],
    }),
    defineField({name: 'instagramUrl', title: 'Instagram', type: 'url'}),
    defineField({name: 'sortOrder', title: 'Ordine', type: 'number', initialValue: 10}),
  ],
  orderings: [{title: 'Ordine', name: 'sortOrderAsc', by: [{field: 'sortOrder', direction: 'asc'}]}],
  preview: {select: {title: 'artistName', media: 'portrait'}},
})

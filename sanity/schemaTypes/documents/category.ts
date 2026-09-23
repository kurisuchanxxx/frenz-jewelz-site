import {defineField, defineType} from 'sanity'
import {TagIcon} from '@sanity/icons/Tag'

export const category = defineType({
  name: 'category',
  title: 'Categoria',
  type: 'document',
  icon: TagIcon,
  fields: [
    defineField({name: 'title', title: 'Nome', type: 'string', validation: (rule) => rule.required()}),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'title', maxLength: 64},
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'sortOrder', title: 'Ordine', type: 'number', initialValue: 10}),
  ],
  orderings: [{title: 'Ordine', name: 'sortOrderAsc', by: [{field: 'sortOrder', direction: 'asc'}]}],
})

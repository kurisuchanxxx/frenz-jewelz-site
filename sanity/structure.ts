import type {StructureResolver} from 'sanity/structure'
import {BasketIcon} from '@sanity/icons/Basket'
import {CogIcon} from '@sanity/icons/Cog'
import {EnvelopeIcon} from '@sanity/icons/Envelope'
import {ORDER_STATUSES} from './schemaTypes/documents/order'
import {REQUEST_STATUSES} from './schemaTypes/documents/customRequest'

export const SINGLETON_TYPES = new Set(['siteSettings'])

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Frenz Jewelz')
    .items([
      S.listItem()
        .title('Impostazioni sito')
        .id('siteSettings')
        .icon(CogIcon)
        .child(S.document().schemaType('siteSettings').documentId('siteSettings').title('Impostazioni sito')),
      S.divider(),

      S.documentTypeListItem('product').title('Prodotti'),
      S.documentTypeListItem('category').title('Categorie'),
      S.documentTypeListItem('collaboration').title('Collab'),
      S.divider(),

      S.listItem()
        .title('Ordini')
        .id('orders')
        .icon(BasketIcon)
        .child(
          S.list()
            .title('Ordini')
            .items([
              S.listItem()
                .title('Da gestire')
                .id('orders-open')
                .child(
                  S.documentList()
                    .title('Da gestire')
                    .schemaType('order')
                    .filter('_type == "order" && status in ["pagato", "daVerificare"]')
                    .defaultOrdering([{field: 'createdAt', direction: 'desc'}]),
                ),
              S.divider(),
              ...ORDER_STATUSES.map(({title, value}) =>
                S.listItem()
                  .title(title)
                  .id(`orders-${value}`)
                  .child(
                    S.documentList()
                      .title(title)
                      .schemaType('order')
                      .filter('_type == "order" && status == $status')
                      .params({status: value})
                      .defaultOrdering([{field: 'createdAt', direction: 'desc'}]),
                  ),
              ),
              S.divider(),
              S.documentTypeListItem('order').title('Tutti gli ordini'),
            ]),
        ),
      S.listItem()
        .title('Richieste su misura')
        .id('customRequests')
        .icon(EnvelopeIcon)
        .child(
          S.list()
            .title('Richieste su misura')
            .items([
              ...REQUEST_STATUSES.map(({title, value}) =>
                S.listItem()
                  .title(title)
                  .id(`requests-${value}`)
                  .child(
                    S.documentList()
                      .title(title)
                      .schemaType('customRequest')
                      .filter('_type == "customRequest" && status == $status')
                      .params({status: value})
                      .defaultOrdering([{field: 'createdAt', direction: 'desc'}]),
                  ),
              ),
              S.divider(),
              S.documentTypeListItem('customRequest').title('Tutte le richieste'),
            ]),
        ),
      S.divider(),

      S.documentTypeListItem('page').title('Pagine'),
    ])

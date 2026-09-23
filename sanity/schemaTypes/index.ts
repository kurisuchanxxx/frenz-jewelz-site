import {blockContent} from './objects/blockContent'
import {imageWithAlt} from './objects/imageWithAlt'
import {productDetails} from './objects/productDetails'
import {seo} from './objects/seo'
import {shippingOption} from './objects/shippingOption'
import {category} from './documents/category'
import {collaboration} from './documents/collaboration'
import {customRequest} from './documents/customRequest'
import {order} from './documents/order'
import {page} from './documents/page'
import {product} from './documents/product'
import {siteSettings} from './documents/siteSettings'

export const schemaTypes = [
  // oggetti
  blockContent,
  imageWithAlt,
  productDetails,
  seo,
  shippingOption,
  // documenti
  product,
  category,
  collaboration,
  page,
  siteSettings,
  order,
  customRequest,
]

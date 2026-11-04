import {defineMiddleware} from 'astro:middleware'

/** Un solo indirizzo per Google e per i link condivisi: www.frenzjewelz.it -> frenzjewelz.it. */
export const onRequest = defineMiddleware((context, next) => {
  const url = context.url
  if (url.hostname === 'www.frenzjewelz.it') {
    return Response.redirect(`https://frenzjewelz.it${url.pathname}${url.search}`, 301)
  }
  return next()
})

## Progetto

Frenz Jewelz, e-commerce di gioielli (Ctrl Studio per FRENZ). Leggi README.md per stack e scelte.

- Astro 7 `output: 'server'` su **Cloudflare Workers** (l'adapter v14 non supporta Pages). Env da `astro:env/server`, mai `Astro.locals.runtime`.
- Sanity Studio in `/sanity`, pacchetto npm separato. Icone: `import {XIcon} from '@sanity/icons/X'` (v5, un percorso per icona).
- Dataset privato: leggere sempre con il client di `src/lib/sanity.ts`.
- Prezzi in centesimi interi. Disponibilità solo da `src/lib/availability.ts`. Il checkout ricalcola tutto lato server.
- Testi del sito e dello Studio in italiano.
- Verifica: `npm run check`, `npm run build`, e in `/sanity` `npx tsc --noEmit` + `npx sanity schema validate`.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

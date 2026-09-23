const eur = new Intl.NumberFormat('it-IT', {style: 'currency', currency: 'EUR'})

/** Prezzi sempre in centesimi interi, formattati solo in output. */
export const formatPrice = (cents: number) => eur.format(cents / 100)

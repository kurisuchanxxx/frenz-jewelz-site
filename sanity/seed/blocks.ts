/** Converte il testo semplice delle bozze in Portable Text (h2, paragrafi, elenchi). */
export function textToBlocks(text: string) {
  const blocks: Record<string, unknown>[] = []
  let n = 0
  const block = (style: string, content: string, extra: Record<string, unknown> = {}) => {
    n++
    blocks.push({
      _type: 'block',
      _key: `b${n}`,
      style,
      markDefs: [],
      children: [{_type: 'span', _key: `b${n}s`, text: content, marks: []}],
      ...extra,
    })
  }
  for (const line of text.split('\n')) {
    const t = line.trim()
    if (!t) continue
    if (t.startsWith('## ')) block('h2', t.slice(3))
    else if (t.startsWith('- ')) block('normal', t.slice(2), {listItem: 'bullet', level: 1})
    else block('normal', t)
  }
  return blocks
}


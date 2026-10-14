import type { Register } from 'claude-code'
import { MathSpacer } from './fix'

export const register: Register = on => {
  on('turn.step', async function* ($, e, next) {
    const spacers = new Map<number, MathSpacer>()
    let open: number | undefined // text block with held-back characters

    const flush = () => {
      if (open === undefined) return undefined
      const index = open
      open = undefined
      const text = spacers.get(index)!.flush()
      return text ? { kind: 'text' as const, index, text } : undefined
    }

    for await (const chunk of next(e)) {
      if (chunk.kind === 'text') {
        if (open !== undefined && open !== chunk.index) {
          const rest = flush()
          if (rest) yield rest
        }
        let spacer = spacers.get(chunk.index)
        if (!spacer) spacers.set(chunk.index, (spacer = new MathSpacer()))
        yield { ...chunk, text: spacer.push(chunk.text) }
        open = chunk.index
      } else {
        const rest = flush()
        if (rest) yield rest
        yield chunk
      }
    }
    const rest = flush()
    if (rest) yield rest
  })
}

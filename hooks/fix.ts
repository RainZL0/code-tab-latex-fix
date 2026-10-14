// Streams reply text through and rewrites math so the Code tab renders it:
// - a space before an inline `\(` whose previous character is not line start,
//   space, tab, `(` or `[`
// - a lone letter or number as plain text (`\(n\)` -> `n`, `\(3\)` -> `3`)
// - braces around other inline content with no math sign (`\(x_i\)` -> `\({x_i}\)`)
// - `\|` -> `\Vert ` inside inline math
// - inline math over 200 characters, and `\[...\]` that is not alone on one
//   line, become a `$$` block
// Code spans and fenced code blocks are left alone. Rewriting is idempotent.

const OK_BEFORE = new Set(['\n', ' ', '\t', '(', '['])
const SIGN = /[\\^{}=<>|!+]/
const PLAIN = /^([A-Za-z]|-?\d+(\.\d+)?)$/ // reads better as plain text than as math
const MAX_INLINE = 200 // longest \(...\) the Code tab renders
const MAX_BUFFER = 4000 // an opener unclosed after this many characters is not math

type Mode = 'text' | 'inline' | 'display'

export class MathSpacer {
  private prev = '\n'
  private atLineStart = true
  private held = ''
  private inlineTicks = 0 // length of the open inline code span, 0 when none
  private fenceTicks = 0 // length of the open ``` fence, 0 when none
  private mode: Mode = 'text'
  private math = '' // content after an open \( or \[
  private space = false // inline: a space goes before \(
  private lineStart = false // display: \[ was first on its line

  push(text: string): string {
    let s = this.held + text
    this.held = ''
    let out = ''
    let i = 0
    while (i < s.length) {
      const c = s.charAt(i)

      if (this.mode !== 'text') {
        if (c === '\\') {
          if (i + 1 === s.length) {
            this.held = '\\'
            break
          }
          const d = s.charAt(i + 1)
          if (d === (this.mode === 'inline' ? ')' : ']')) {
            out += this.emit(this.close())
            i += 2
            continue
          }
          this.math += c + d
          i += 2
        } else {
          this.math += c
          i++
        }
        if (this.math.length > MAX_BUFFER || this.math.endsWith('\n\n')) {
          // not math after all: write the opener as it was and rescan the rest
          const opener = this.mode === 'inline' ? '\\(' : '\\['
          s = this.math + s.slice(i)
          i = 0
          this.math = ''
          this.mode = 'text'
          out += this.emit(opener)
        }
        continue
      }

      if (c === '`') {
        let j = i
        while (j < s.length && s[j] === '`') j++
        if (j === s.length) {
          // the run may go on in the next piece
          this.held = s.slice(i)
          break
        }
        this.ticks(j - i)
        out += this.emit(s.slice(i, j))
        i = j
        continue
      }
      if (c === '\\' && this.inlineTicks === 0 && this.fenceTicks === 0) {
        if (i + 1 === s.length) {
          this.held = '\\'
          break
        }
        const d = s.charAt(i + 1)
        if (d === '(' || d === '[') {
          this.mode = d === '(' ? 'inline' : 'display'
          this.space = !OK_BEFORE.has(this.prev)
          this.lineStart = this.atLineStart
          this.math = ''
        } else {
          out += this.emit(c + d)
        }
        i += 2
        continue
      }
      // a blank line ends any unclosed inline code span
      if (c === '\n' && this.prev === '\n') this.inlineTicks = 0
      out += this.emit(c)
      i++
    }
    return out
  }

  flush(): string {
    let rest = this.held
    if (this.mode !== 'text') rest = (this.mode === 'inline' ? '\\(' : '\\[') + this.math + rest
    this.held = ''
    this.math = ''
    this.mode = 'text'
    return rest
  }

  private close(): string {
    const mode = this.mode
    this.mode = 'text'
    if (mode === 'display') {
      if (this.lineStart && !this.math.includes('\n')) return '\\[' + this.math + '\\]'
      return this.block(this.math)
    }
    const plain = this.math.trim().replace(/^\{(.*)\}$/, '$1')
    if (PLAIN.test(plain)) return plain
    let c = this.math.replace(/\\([\s\S])/g, (m, ch) => (ch === '|' ? '\\Vert ' : m))
    if (!SIGN.test(c) && !/^[A-Za-z]_\d$/.test(c)) c = `{${c}}`
    if (c.length > MAX_INLINE) return this.block(c)
    return (this.space ? ' ' : '') + '\\(' + c + '\\)'
  }

  private block(content: string): string {
    return (this.prev === '\n' ? '' : '\n') + '$$\n' + content.trim() + '\n$$\n'
  }

  private emit(text: string): string {
    for (const ch of text) {
      if (ch === '\n') this.atLineStart = true
      else if (ch !== ' ') this.atLineStart = false
      this.prev = ch
    }
    return text
  }

  private ticks(n: number) {
    if (this.fenceTicks > 0) {
      if (this.atLineStart && n >= this.fenceTicks) this.fenceTicks = 0
    } else if (this.inlineTicks > 0) {
      if (n === this.inlineTicks) this.inlineTicks = 0
    } else if (this.atLineStart && n >= 3) {
      this.fenceTicks = n
    } else {
      this.inlineTicks = n
    }
  }
}

// A reply streams in pieces cut at arbitrary places. Wherever the cuts fall,
// rewriting piece by piece must give exactly what rewriting it whole gives.

import { test, expect } from 'claude-code/testing'
import { MathSpacer } from './fix'

const run = (pieces: string[]) => {
  const s = new MathSpacer()
  return pieces.map(p => s.push(p)).join('') + s.flush()
}

const SAMPLES = [
  '极限：\\(x^2\\)，\\(a+b\\)。递归版本。\\(n=1\\) 和 Summation\\(^\\star\\)',
  '跨越 \\(n\\) 个，共 \\(1000\\) 次，取 \\({k}\\) 和 \\(-1.5\\)',
  '取 \\(B[k,j]\\)、\\(x_i\\)、\\(x_1\\)、\\((a,b)\\)',
  '范数：\\(\\|x\\|_2 = 1\\)，转义 \\(a \\\\| b\\)',
  '矩阵：\\(\\begin{pmatrix}1&2\\\\3&4\\end{pmatrix}\\)',
  '前**\\(x^2\\)**后，前 **\\(y^2\\)** 后，**粗体**\\(z^2\\)，前***\\(w\\)***\n- **\\(x^2\\)**：说明\n| **\\(x^2\\)** |',
  '2*\\(x^2\\) 乘，a * b * c',
  '公式：\\[a+b\\]。\n\\[c+d\\]\n\\[\ne+f\n\\]\n参见 \\[1\\]',
  '长：\\(' + 'a+'.repeat(110) + 'b\\)',
  '价格 \\(未闭合\n\n下一段：\\(n=1\\)',
  '写 `：\\(` 或 ``a`b`` 和\n```\na：\\(b\n**c\n```\n后：\\(n=1\\)',
  '路径：\\\\(x) 和 \\` 和 \\*',
  '$$\nx^2\n$$\n末尾 \\(a+',
  '**a\n\n前**\\(x\\)** 和 `code` **\\(y\\)**',
]

// small seeded generator, so a failure can be reproduced
const random = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

test('one cut anywhere gives the same result', () => {
  for (const s of SAMPLES) {
    const whole = run([s])
    for (let k = 0; k <= s.length; k++) {
      const got = run([s.slice(0, k), s.slice(k)])
      if (got !== whole) expect({ sample: s, cut: k, got }).toEqual({ sample: s, cut: k, got: whole })
    }
  }
})

test('one character per piece gives the same result', () => {
  for (const s of SAMPLES) expect(run([...s])).toBe(run([s]))
})

test('many random cuts give the same result', () => {
  const next = random(20261015)
  for (const s of SAMPLES) {
    const whole = run([s])
    for (let round = 0; round < 500; round++) {
      const cuts = Array.from({ length: 1 + Math.floor(next() * 8) }, () => Math.floor(next() * (s.length + 1)))
      cuts.sort((a, b) => a - b)
      const bounds = [0, ...cuts, s.length]
      const pieces = bounds.slice(1).map((end, i) => s.slice(bounds[i], end))
      const got = run(pieces)
      if (got !== whole) expect({ sample: s, pieces, got }).toEqual({ sample: s, pieces, got: whole })
    }
  }
})

test('rewriting the result again changes nothing', () => {
  for (const s of SAMPLES) {
    const once = run([s])
    expect(run([once])).toBe(once)
  }
})

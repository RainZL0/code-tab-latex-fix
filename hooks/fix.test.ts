import { test, expect } from 'claude-code/testing'
import { MathSpacer } from './fix'

const run = (...pieces: string[]) => {
  const s = new MathSpacer()
  return pieces.map(p => s.push(p)).join('') + s.flush()
}

test('adds a space after full-width punctuation and CJK', () => {
  expect(run('极限：\\(x^2\\)，\\(a+b\\)')).toBe('极限： \\(x^2\\)， \\(a+b\\)')
  expect(run('递归版本。\\(n=1\\)')).toBe('递归版本。 \\(n=1\\)')
  expect(run('Summation\\(^\\star\\)')).toBe('Summation \\(^\\star\\)')
})

test('leaves accepted cases alone', () => {
  const ok = '\\(a+b\\) 和 \\(c=1\\)\n\\(x^2\\) (\\(y^2\\)) [\\(z^2\\)] \\(x_1\\)'
  expect(run(ok)).toBe(ok)
})

test('writes a lone letter or number as plain text', () => {
  expect(run('跨越 \\(n\\) 个')).toBe('跨越 n 个')
  expect(run('取：\\({k}\\)，共 \\(3\\) 次，\\(-1.5\\) 和 \\( x \\)')).toBe('取：k，共 3 次，-1.5 和 x')
  expect(run('\\(n^2\\) 和 \\(n=3\\) 和 \\(\\pi\\)')).toBe('\\(n^2\\) 和 \\(n=3\\) 和 \\(\\pi\\)')
})

test('wraps other content with no math sign in braces', () => {
  expect(run('取 \\(B[k,j]\\)')).toBe('取 \\({B[k,j]}\\)')
  expect(run('第 \\(x_i\\) 项')).toBe('第 \\({x_i}\\) 项')
  expect(run('区间 \\((a,b)\\)')).toBe('区间 \\({(a,b)}\\)')
})

test('replaces \\| with \\Vert', () => {
  expect(run('范数 \\(\\|x\\|_2 = 1\\)')).toBe('范数 \\(\\Vert x\\Vert _2 = 1\\)')
  expect(run('转义 \\(a \\\\| b\\)')).toBe('转义 \\(a \\\\ | b\\)')
})

test('spaces a row break before a digit', () => {
  const m = '矩阵 \\(\\begin{pmatrix}1&2\\\\3&4\\end{pmatrix}\\)'
  expect(run(m)).toBe('矩阵 \\(\\begin{pmatrix}1&2\\\\ 3&4\\end{pmatrix}\\)')
  expect(run(run(m))).toBe(run(m))
  const ok = '\\(\\begin{cases}a\\\\b\\end{cases}\\)'
  expect(run(ok)).toBe(ok)
})

test('works across piece boundaries', () => {
  expect(run('值：', '\\', '(n=1\\)')).toBe('值： \\(n=1\\)')
  expect(run('值：\\', '(n=1\\)')).toBe('值： \\(n=1\\)')
  expect(run('值：\\(', 'B[k', ',j]\\', ')后')).toBe('值： \\({B[k,j]}\\)后')
})

test('turns display math that is not alone on a line into a $$ block', () => {
  expect(run('公式：\\[a+b\\]。')).toBe('公式：\n$$\na+b\n$$\n。')
  expect(run('\\[\na+b\n\\]\n')).toBe('$$\na+b\n$$\n\n')
  const alone = '前\n\\[a+b\\]\n后'
  expect(run(alone)).toBe(alone)
})

test('turns inline math over 200 characters into a $$ block', () => {
  const long = 'a+'.repeat(110) + 'b'
  expect(run('长：\\(' + long + '\\)')).toBe('长：\n$$\n' + long + '\n$$\n')
})

test('gives up on an unclosed opener', () => {
  const open = '价格 \\(未闭合\n\n下一段：\\(n=1\\)'
  expect(run(open)).toBe('价格 \\(未闭合\n\n下一段： \\(n=1\\)')
  expect(run('末尾 \\(a+')).toBe('末尾 \\(a+')
})

test('skips inline code and fences', () => {
  const code = '写 `：\\(` 或\n```\na：\\(b\n```\n'
  expect(run(code)).toBe(code)
  expect(run('`', '`', '`\na：\\(b\n``', '`\n后：\\(n=1\\)')).toBe('```\na：\\(b\n```\n后： \\(n=1\\)')
})

test('escaped backslash is not a delimiter', () => {
  expect(run('路径：\\\\(x)')).toBe('路径：\\\\(x)')
})

test('rewriting twice changes nothing more', () => {
  const once = run('极限：\\(n\\)，\\(\\|x\\|\\)，公式：\\[a+b\\]。')
  expect(run(once)).toBe(once)
})

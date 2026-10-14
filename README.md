# code-tab-latex-fix

A Claude Code mod that makes LaTeX math in replies render in the **Code tab of the Claude desktop app**, instead of showing up as raw text.

## The problem

The Code tab only draws an inline formula when it passes a strict check. Many ordinary formulas fail it and are shown as raw text, often with the backslashes gone and `_` turned into italics. For `\(...\)` the check requires:

- the character before `\(` is the start of a line, a space, a tab, `(` or `[`, so `极限：\(x^2\)` or `Summation\(^\star\)` fails;
- the content contains one of `\ ^ = + < > { } | !` (or looks like `x_1`), so `\(n\)`, `\(x_i\)` and `\(B[k,j]\)` fail;
- the content has no `\|`, so `\(\|x\|_2\)` fails;
- the content is at most 200 characters.

`\[...\]` is drawn only when it is alone on its own line. Single-dollar `$...$` has its own guess at "is this math" and rejects valid formulas such as `$(c_1,c_2)$` (see [anthropics/claude-code#95866](https://github.com/anthropics/claude-code/issues/95866)).

Telling the model these rules in `CLAUDE.md` helps but does not hold: it still drops the space after full-width punctuation, writes lone letters as math, and so on.

## What the mod does

It rewrites the reply text as it streams, before it is shown and before it is saved to the transcript. Inside inline `\(...\)`:

| Model wrote | Shown as |
| --- | --- |
| `值：\(x^2\)` | `值： \(x^2\)` (space added) |
| `\(n\)`, `\(1000\)`, `\(-1.5\)` | `n`, `1000`, `-1.5` (plain text) |
| `\(x_i\)`, `\(B[k,j]\)` | `\({x_i}\)`, `\({B[k,j]}\)` (braces added) |
| `\(\|x\|_2 = 1\)` | `\(\Vert x\Vert _2 = 1\)` |
| inline math over 200 characters | a `$$` block |
| `\(\begin{pmatrix}1&2\\3&4\end{pmatrix}\)` | `\(\begin{pmatrix}1&2\\ 3&4\end{pmatrix}\)` (a `\` before a digit is rejected) |
| `前**\(x^2\)**后` | `前 **\(x^2\)**后` (space before the bold run, not inside it) |
| `**粗体**\(x^2\)` | `**粗体** \(x^2\)` |
| `text \[a+b\] text` | a `$$` block on its own lines |

Inline code and fenced code blocks are never touched. `\[...\]` with no math sign, such as `\[1\]`, is left as written, since markdown also uses `\[` for a plain bracket. A `\(` with no `\)` before a blank line is left as written. Running the rewrite twice gives the same text.

The mod adds nothing to the model's context: its code runs locally and adds no tools or prompt text.

## Install

In a terminal session of Claude Code (the `/plugin` command is not available in the desktop app's Code tab), run:

```
/plugin install code-tab-latex-fix --marketplace RainZL0/code-tab-latex-fix
```

Answer `y` to add the marketplace, then pick the **user** scope. Code tab sessions started after that load the mod too.

Then tell the model to write math with `\(...\)`, which this mod expects. Add this to `~/.claude/CLAUDE.md`:

```markdown
- Math: every formula in LaTeX, never as plain text like `2^t` or `Θ(n³)`.
  - Inline: `\(...\)`, never `$`.
  - Display: a line with only `$$` before and after the formula.
```

### From a local clone instead

Clone the repository and name its folder in the `env` block of `~/.claude/settings.json`. The mod is then read straight from the folder:

```json
{
  "env": {
    "CLAUDE_CODE_PLUGIN_DIRS": "C:\\path\\to\\code-tab-latex-fix"
  }
}
```

To update later, run `claude plugin update code-tab-latex-fix@code-tab-latex-fix` and restart.

## Safety

- Only the reply text you read is rewritten. File writes, commands and other tool calls never pass through it, so LaTeX the model writes into files is untouched. Thinking is not touched either.
- If the model writes no `\(` or `\[`, the mod changes nothing.
- The changes are harmless LaTeX (a space, braces, `\Vert`), so if a later app version accepts more, they only become unneeded.
- If the rewrite ever throws, the rest of the reply passes through unchanged, so a reply is never cut short.
- Replies arrive in pieces cut anywhere. The tests check that every single cut, one character per piece, and thousands of random multi-cut splits all give exactly the result of rewriting the whole text at once.

## Known limitations

- The rules were read from the app's own code and checked against its parser with Claude Code 2.1.295 in the Windows desktop app. A later app update may change them.
- Text in prose that is not math but looks like `\(...\)` (a regex written outside code, say) is treated as math. The Code tab would treat it as math too.
- Bold made with `__` is not tracked (only `*`), since `_` is common inside names.
- In the terminal, math is not rendered anyway; the rewrite is harmless there.
- Display math written as `$$` on its own lines is left as is.

## Reporting a problem

Open an issue with the reply's exact text and a screenshot of what the Code tab showed. Copying from the Code tab drops backslashes; the session's transcript file under `~/.claude/projects/` keeps the text exactly as shown (after the rewrite).

## Development

```
claude plugin validate .
claude plugin test .
```

The rewrite is in `hooks/fix.ts` (a small streaming state machine), the hook on `turn.step` in `hooks/register.ts`, and the tests in `hooks/fix.test.ts` (cases) and `hooks/split.test.ts` (streaming cuts).

## License

MIT

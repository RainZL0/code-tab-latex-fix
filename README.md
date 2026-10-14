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
| `text \[a+b\] text` | a `$$` block on its own lines |

Inline code and fenced code blocks are never touched. A `\(` with no `\)` before a blank line is left as written. Running the rewrite twice gives the same text.

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

## Notes

- Tested with Claude Code 2.1.295 in the Windows desktop app. The rules above were read from the app's own code; a later app update may change them.
- In the terminal, math is not rendered anyway; the rewrite is harmless there.
- Display math written as `$$` on its own lines is left as is.

## Development

```
claude plugin validate .
claude plugin test .
```

The rewrite is in `hooks/fix.ts` (a small streaming state machine), the hook on `turn.step` in `hooks/register.ts`, and the tests in `hooks/fix.test.ts`.

## License

MIT

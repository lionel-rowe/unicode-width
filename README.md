# unicode-width

TypeScript port of the [unicode-width Rust crate](https://github.com/unicode-rs/unicode-width/).

`stripAnsi` is ported from [chalk/ansi-regex](https://github.com/chalk/ansi-regex).

## Usage

```js
import { stringWidth, unicodeWidth, stripAnsi } from "$MODULE_PATH/mod.ts"

// Get the expected physical width of a string in TTY-like environments.
// Combines the functionality of `unicodeWidth` and `stripAnsi`.
stringWidth("hello world") // => 11
stringWidth("\x1b[36mCYAN\x1b[0m") // => 4
stringWidth("天地玄黃宇宙洪荒") // => 16
stringWidth("ｆｕｌｌｗｉｄｔｈ　ｔｅｘｔ") // => 28

// Get the unicode width of a string according to Unicode Standard Annex #11 rules
unicodeWidth("\x1b[36mCYAN\x1b[0m") // => 11
unicodeWidth("天地玄黃宇宙洪荒") // => 16

// The second argument to `unicodeWidth` determines whether the environment is CJK,
// which affects width calculation for certain characters.
// Default is `false`
unicodeWidth("₁₂₃₄") // => 4
unicodeWidth("₁₂₃₄", true) // => 8

// Strip ANSI escape codes from a string
stripAnsi("\x1b[36mCYAN\x1b[0m") // => "CYAN"
stripAnsi("\x1B]8;;https://github.com\x07click\x1B]8;;\x07") // => "click"
```

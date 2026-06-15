# PostCSS Logical Properties Polyfill

Ultimate [PostCSS](https://github.com/postcss/postcss) plugin that polyfills the [Bi-directional CSS proposal from W3C](https://drafts.csswg.org/css-logical/) to support direction-sensitive rules, a.k.a Left-To-Right (LTR) and Right-To-Left (RTL), as well as vertical writing modes in all possible variations across all browsers.

It also knows how to polyfill `transition` and `@keyframes` if they reference logical properties. See [transformers.ts](src/transformers.ts) for the full list of supported properties.

## Install

Npm:

```
npm install -D postcss-logical-properties-polyfill
```

Yarn:

```
yarn add -D postcss-logical-properties-polyfill
```

## Usage

See [PostCSS docs](https://github.com/postcss/postcss-load-config#usage) for examples how to enable the plugin for your environment. Use `postcss-logical-properties-polyfill` instead of `postcss-plugin` in the examples.

The plugin supports several options. A complete list of options is listed below.

```js
const pluginOptions = {
    modes: ['rtl', 'ltr'],
    // or
    modes: [
        ['horizontal-tb', 'rtl'],
        ['horizontal-tb', 'ltr'],
        ['vertical-rl', 'rtl'],
        ['vertical-rl', 'ltr'],
        ['vertical-lr', 'rtl'],
        ['vertical-lr', 'ltr'],
        ['sideways-rl', 'rtl'],
        ['sideways-rl', 'ltr'],
        ['sideways-lr', 'rtl'],
        ['sideways-lr', 'ltr'],
    ],
    preserve: true, // If set to false, polyfilled properties will be removed
    buildSelector(selector, writingMode, direction) {
        let prefix = `html[dir="${direction}"]`;
        if (writingMode !== 'horizontal-tb') {
            prefix += ` .writing-mode-${writingMode}`;
        }

        return `${prefix} ${selector}`;
    },
    buildKeyframeName(name, writingMode, direction) {
        let suffix = '';
        if (writingMode !== 'horizontal-tb') {
            suffix += `--writing-mode-${writingMode}`;
        }

        suffix += `--${direction}`;

        return `${name}${suffix}`;
    },
}
```

> **Note:** `animation-name` is rewritten only for keyframes defined in the same PostCSS pass. If your `@keyframes` and `animation-name` live in separate files, run [`postcss-import`](https://github.com/postcss/postcss-import) before this plugin to inline all imports first.

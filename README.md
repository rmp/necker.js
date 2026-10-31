# necker

A dependency-free `<scout-scarf>` web component (and plain JS function) that renders scout scarf / neckerchief pictograms as SVG — flat, rolled, or both.

## Install

```sh
npm install necker
```

Or straight from a CDN:

```html
<script src="https://cdn.jsdelivr.net/npm/necker"></script>
```

## Usage

### Web component

```html
<script src="node_modules/necker/necker.js"></script>

<scout-scarf main-color="#1e4fa3" outer-band="#f2c200" inner-band="#c8102e"
             outer-band-width="wide" logo="logo.svg" style="width:400px"></scout-scarf>
```

With a bundler, import the package once to register the element:

```js
import 'necker';
```

### Programmatic

```js
const ScoutScarf = require('necker');

const svg = ScoutScarf.toSVG({
  mainColor: '#1e4fa3',
  outerBand: '#f2c200',
  innerBand: '#c8102e',
  outerBandWidth: 'wide',
  view: 'flat'
});
```

`toSVG` returns an SVG string and works in Node as well as the browser. In a browser the element also exposes `el.toSVG()`, which renders using that element's attributes.

## Attributes / options

| Attribute          | Option           | Default         | Description |
|--------------------|------------------|-----------------|-------------|
| `main-color`       | `mainColor`      | `#2a5db0`       | Fill colour of the scarf body |
| `outer-band`       | `outerBand`      | `#f2c200`       | Outer edge band colour; `none` shows the main colour |
| `inner-band`       | `innerBand`      | `none`          | Inner band colour; when `none` the outer band fills the whole border |
| `outer-band-width` | `outerBandWidth` | `narrow`        | `narrow` (24), `wide` (48) or a number in drawing units |
| `inner-band-width` | `innerBandWidth` | `narrow`        | `narrow` (13), `wide` (26) or a number in drawing units |
| `logo`             | `logo`           | —               | URL or `data:` URI of a centre logo |
| `logo-scale`       | `logoScale`      | `1`             | Logo size multiplier |
| `view`             | `view`           | `both`          | `both`, `flat` or `rolled` |
| `stroke`           | `stroke`         | `#000000`       | Outline colour |
| `stroke-width`     | `strokeWidth`    | `4`             | Outline width |
| `label`            | `label`          | `Scout scarf`   | Accessible label |

## Demo

Open [index.html](https://rmp.github.io/necker.js/) from the [repository](https://github.com/rmp/necker.js) for a playground and colour gallery.

## Development

```sh
npm test
```

## License

MIT © Roger Pettett

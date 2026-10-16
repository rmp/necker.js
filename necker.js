/*!
 * necker.js — standalone scout scarf pictogram generator + <scout-scarf> web component
 * No dependencies. Renders SVG showing a flat (unrolled) scarf and a rolled scarf.
 *
 * Usage (HTML):
 *   <script src="necker.js"></script>
 *   <scout-scarf main-color="#1e4fa3" outer-band="#f2c200" inner-band="#c8102e"
 *                logo="logo.svg" style="width:400px"></scout-scarf>
 *
 * Attributes:
 *   main-color        Fill colour of the scarf body             (default #2a5db0)
 *   outer-band        Colour of the outer edge band             (default #f2c200; "none" = show main colour)
 *   inner-band        Colour of the inner band (optional)       (default none; outer band then fills the whole border)
 *   logo              Optional URL / data: URI of a centre logo (SVG, PNG, ...)
 *   logo-scale        Logo size multiplier                      (default 1)
 *   view              "both" | "flat" | "rolled"                (default both)
 *   stroke            Outline colour                            (default #000)
 *   stroke-width      Outline width                             (default 4)
 *   outer-band-width  Outer band width: "narrow" | "wide" | drawing units  (default narrow = 24, wide = 48)
 *   inner-band-width  Inner band width: "narrow" | "wide" | drawing units  (default narrow = 13, wide = 26)
 *   label             Accessible label                          (default "Scout scarf")
 *
 * Programmatic:
 *   ScoutScarf.toSVG({ mainColor, outerBand, innerBand, logo, view, ... })  -> SVG string
 *   document.querySelector('scout-scarf').toSVG()                           -> SVG string for the element
 */
(function (root) {
  'use strict';

  // ---------- geometry constants (drawing units) ----------
  var CX = 913;                               // vertical axis of symmetry
  var FLAT = { x0: 88, y0: 65, apexY: 875 };  // flat triangle
  var FLAT_HALF = CX - FLAT.x0;
  var FLAT_M = (FLAT.apexY - FLAT.y0) / FLAT_HALF;

  var ROLL_END = 90;                          // x of the roll's left end
  var ROLL_HALF = CX - ROLL_END;
  var ROLL_SHIFT = 108;                       // horizontal run of the diagonal cuts/stripes
  var TRI_HALF = 433;                         // half-width of the small central triangle
  var TRI_M = 0.99;                           // slope of its edges
  var ROLL_BAND_SCALE = 1.2;                  // bands look slightly wider on the roll
  var TRI_BAND_SCALE = 1.08;
  var BAND_WIDTHS = {                         // named band widths (drawing units)
    outer: { narrow: 24, wide: 48 },
    inner: { narrow: 13, wide: 26 }
  };

  var DEFAULTS = {
    mainColor: '#2a5db0',
    outerBand: '#f2c200',
    innerBand: 'none',
    logo: '',
    logoScale: 1,
    view: 'both',
    stroke: '#000000',
    strokeWidth: 4,
    outerBandWidth: 'narrow',
    innerBandWidth: 'narrow',
    label: 'Scout scarf'
  };

  var VIEWBOXES = {
    both: '43 30 1740 1330',
    flat: '43 30 1740 880',
    rolled: '43 800 1740 560'
  };

  // ---------- helpers ----------
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function r(n) { return Math.round(n * 10) / 10; }
  function num(v, d) { var n = parseFloat(v); return isFinite(n) ? n : d; }
  function bandWidth(v, named) {
    var key = String(v).trim().toLowerCase();
    return Math.max(0, named.hasOwnProperty(key) ? named[key] : num(v, named.narrow));
  }
  function isNone(c) { return !c || String(c).toLowerCase() === 'none'; }
  function mirror(pts) { return pts.map(function (p) { return [2 * CX - p[0], p[1]]; }); }
  function polygon(pts, fill, o) {
    return '<polygon points="' + pts.map(function (p) { return r(p[0]) + ',' + r(p[1]); }).join(' ') +
      '" fill="' + esc(fill) + '"/>';
  }
  function sample(f, xa, xb) {
    var n = Math.max(2, Math.ceil(Math.abs(xb - xa) / 40)), out = [];
    for (var i = 0; i <= n; i++) { var x = xa + (xb - xa) * i / n; out.push([x, f(x)]); }
    return out;
  }

  // roll curves
  function rollTop(x) { var s = (x - CX) / ROLL_HALF; return 912 - 72 * s * s; }
  function rollBottom(x) { var s = (x - CX) / ROLL_HALF; return rollTop(x) + 62 + 14 * (1 - s * s); }

  function logoMarkup(o, cx, cy, size) {
    if (!o.logo) return '';
    var s = size * num(o.logoScale, 1);
    return '<image href="' + esc(o.logo) + '" x="' + r(cx - s / 2) + '" y="' + r(cy - s / 2) +
      '" width="' + r(s) + '" height="' + r(s) + '" preserveAspectRatio="xMidYMid meet"/>';
  }

  // ---------- main renderer ----------
  function toSVG(options) {
    var o = Object.assign({}, DEFAULTS, options || {});
    var view = VIEWBOXES[o.view] ? o.view : 'both';

    var oW = bandWidth(o.outerBandWidth, BAND_WIDTHS.outer);
    var iW = bandWidth(o.innerBandWidth, BAND_WIDTHS.inner);
    if (isNone(o.innerBand)) { oW += iW; iW = 0; }
    var layers = [];
    if (oW > 0) layers.push({ b1: 0, b2: oW, fill: isNone(o.outerBand) ? 'none' : o.outerBand });
    if (iW > 0) layers.push({ b1: oW, b2: oW + iW, fill: o.innerBand });

    var sw = num(o.strokeWidth, 4);
    var out = [];

    // ===== flat scarf =====
    var flat = [];
    flat.push(polygon([[FLAT.x0, FLAT.y0], [2 * CX - FLAT.x0, FLAT.y0], [CX, FLAT.apexY]], o.mainColor));
    layers.forEach(function (L) {
      var left = [
        [FLAT.x0 + L.b1, FLAT.y0], [FLAT.x0 + L.b2, FLAT.y0],
        [CX, FLAT.apexY - FLAT_M * L.b2], [CX, FLAT.apexY - FLAT_M * L.b1]
      ];
      flat.push(polygon(left, L.fill), polygon(mirror(left), L.fill));
    });
    flat.push(logoMarkup(o, CX, 360, 330));

    // ===== rolled scarf =====
    var roll = [];
    var xl = ROLL_END, xr = 2 * CX - ROLL_END;
    var ribbon = sample(rollTop, xl, xr).concat(sample(rollBottom, xr - ROLL_SHIFT, xl + ROLL_SHIFT));
    roll.push(polygon(ribbon, o.mainColor));

    [ROLL_END, 285].forEach(function (x0) {
      layers.forEach(function (L) {
        var a = x0 + L.b1 * ROLL_BAND_SCALE, b = x0 + L.b2 * ROLL_BAND_SCALE;
        var left = sample(rollTop, a, b).concat(sample(rollBottom, b + ROLL_SHIFT, a + ROLL_SHIFT));
        roll.push(polygon(left, L.fill), polygon(mirror(left), L.fill));
      });
    });

    // central triangle (in front of the roll)
    var txl = CX - TRI_HALF, txr = CX + TRI_HALF;
    var tyl = rollTop(txl), tApex = tyl + TRI_M * TRI_HALF;
    var tri = sample(rollTop, txl, txr).concat([[CX, tApex]]);
    roll.push(polygon(tri, o.mainColor));
    layers.forEach(function (L) {
      var b1 = L.b1 * TRI_BAND_SCALE, b2 = L.b2 * TRI_BAND_SCALE;
      var left = sample(rollTop, txl + b1, txl + b2).concat([
        [CX, rollTop(txl + b2) + TRI_M * (TRI_HALF - b2)],
        [CX, rollTop(txl + b1) + TRI_M * (TRI_HALF - b1)]
      ]);
      roll.push(polygon(left, L.fill), polygon(mirror(left), L.fill));
    });
    roll.push(logoMarkup(o, CX, 1030, 190));

    if (view !== 'rolled') out.push('<g class="scarf-flat">' + flat.join('') + '</g>');
    if (view !== 'flat') out.push('<g class="scarf-rolled">' + roll.join('') + '</g>');

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + VIEWBOXES[view] +
      '" role="img" aria-label="' + esc(o.label) + '">' +
      '<g stroke="' + esc(o.stroke) + '" stroke-width="' + sw + '" stroke-linejoin="miter" stroke-linecap="round">' +
      out.join('') + '</g></svg>';
  }

  var api = { toSVG: toSVG, defaults: DEFAULTS };

  // ---------- web component ----------
  if (typeof HTMLElement !== 'undefined' && typeof customElements !== 'undefined') {
    var ATTRS = {
      'main-color': 'mainColor', 'outer-band': 'outerBand', 'inner-band': 'innerBand',
      'logo': 'logo', 'logo-scale': 'logoScale', 'view': 'view', 'stroke': 'stroke',
      'stroke-width': 'strokeWidth', 'outer-band-width': 'outerBandWidth',
      'inner-band-width': 'innerBandWidth', 'label': 'label'
    };

    var ScoutScarfElement = class extends HTMLElement {
      static get observedAttributes() { return Object.keys(ATTRS); }
      constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML =
          '<style>:host{display:inline-block;width:320px;max-width:100%}' +
          'svg{display:block;width:100%;height:auto}</style><div></div>';
        this._box = this.shadowRoot.querySelector('div');
      }
      connectedCallback() { this._render(); }
      attributeChangedCallback() { if (this.isConnected) this._render(); }
      _options() {
        var opts = {};
        for (var attr in ATTRS) if (this.hasAttribute(attr)) opts[ATTRS[attr]] = this.getAttribute(attr);
        return opts;
      }
      toSVG() { return toSVG(this._options()); }
      _render() { this._box.innerHTML = this.toSVG(); }
    };
    if (!customElements.get('scout-scarf')) customElements.define('scout-scarf', ScoutScarfElement);
    api.Element = ScoutScarfElement;
  }

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ScoutScarf = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

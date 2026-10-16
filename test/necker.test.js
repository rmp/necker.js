'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const ScoutScarf = require('../necker.js');

const FLAT_X0 = 88; // left corner of the flat scarf (drawing units)

// ---------- helpers ----------
function group(svg, cls) {
  const m = svg.match(new RegExp('<g class="' + cls + '">(.*?)</g>'));
  return m ? m[1] : null;
}
function polygons(markup) {
  return [...markup.matchAll(/<polygon points="([^"]+)" fill="([^"]*)"\/>/g)].map(m => ({
    points: m[1].split(' ').map(p => p.split(',').map(Number)),
    fill: m[2]
  }));
}
// Band edges on the flat scarf's top edge, measured from the left corner.
// Layer i's left polygon is at index 1 + 2i (index 0 is the scarf body).
function flatBands(opts) {
  const polys = polygons(group(ScoutScarf.toSVG(opts), 'scarf-flat'));
  const bands = [];
  for (let i = 1; i < polys.length; i += 2) {
    const [[a], [b]] = polys[i].points;
    bands.push({ from: a - FLAT_X0, to: b - FLAT_X0, fill: polys[i].fill });
  }
  return bands;
}

// ---------- band widths ----------
test('narrow is the default and matches the legacy numeric widths', () => {
  const opts = { innerBand: '#c00' };
  assert.equal(ScoutScarf.toSVG(opts), ScoutScarf.toSVG({ ...opts, outerBandWidth: 24, innerBandWidth: 13 }));
  assert.equal(ScoutScarf.toSVG(opts), ScoutScarf.toSVG({ ...opts, outerBandWidth: 'narrow', innerBandWidth: 'narrow' }));
});

test('narrow/wide produce the expected band geometry', () => {
  const cases = [
    ['narrow', 'narrow', 24, 13],
    ['wide', 'narrow', 48, 13],
    ['narrow', 'wide', 24, 26],
    ['wide', 'wide', 48, 26]
  ];
  for (const [o, i, ow, iw] of cases) {
    assert.deepEqual(flatBands({ outerBand: '#ff0', innerBand: '#f00', outerBandWidth: o, innerBandWidth: i }), [
      { from: 0, to: ow, fill: '#ff0' },
      { from: ow, to: ow + iw, fill: '#f00' }
    ], `${o}/${i}`);
  }
});

test('width keywords are case- and whitespace-insensitive', () => {
  const ref = ScoutScarf.toSVG({ innerBand: '#f00', outerBandWidth: 'wide', innerBandWidth: 'wide' });
  assert.equal(ScoutScarf.toSVG({ innerBand: '#f00', outerBandWidth: 'WIDE', innerBandWidth: ' Wide ' }), ref);
});

test('numeric widths still work, including numeric strings from attributes', () => {
  assert.deepEqual(flatBands({ innerBand: '#f00', outerBandWidth: '10', innerBandWidth: 30 }).map(b => [b.from, b.to]),
    [[0, 10], [10, 40]]);
});

test('unknown width values fall back to narrow; negatives clamp to zero', () => {
  assert.equal(ScoutScarf.toSVG({ outerBandWidth: 'huge' }), ScoutScarf.toSVG());
  assert.deepEqual(flatBands({ innerBand: '#f00', outerBandWidth: -5, innerBandWidth: 'wide' }).map(b => [b.from, b.to]),
    [[0, 26]]);
});

// ---------- band colours ----------
test('without an inner band the outer band fills the whole border', () => {
  assert.deepEqual(flatBands({ outerBand: '#ff0' }), [{ from: 0, to: 37, fill: '#ff0' }]);
  assert.deepEqual(flatBands({ outerBand: '#ff0', outerBandWidth: 'wide', innerBandWidth: 'wide' }),
    [{ from: 0, to: 74, fill: '#ff0' }]);
});

test('outer-band="none" leaves the outer band unfilled but keeps the inner band in place', () => {
  assert.deepEqual(flatBands({ outerBand: 'none', innerBand: '#f00' }), [
    { from: 0, to: 24, fill: 'none' },
    { from: 24, to: 37, fill: '#f00' }
  ]);
});

test('bands are mirrored symmetrically about the centre line', () => {
  const polys = polygons(group(ScoutScarf.toSVG({ innerBand: '#f00', outerBandWidth: 'wide' }), 'scarf-flat'));
  for (let i = 1; i < polys.length; i += 2) {
    const left = polys[i].points, right = polys[i + 1].points;
    left.forEach(([x, y], k) => {
      assert.ok(Math.abs(x + right[k][0] - 2 * 913) < 0.2, 'x mirrored');
      assert.equal(y, right[k][1]);
    });
  }
});

test('every band appears on the flat scarf, both roll ends and the rolled triangle', () => {
  const svg = ScoutScarf.toSVG({ outerBand: '#ff0', innerBand: '#f00' });
  const count = (markup, fill) => polygons(markup).filter(p => p.fill === fill).length;
  for (const fill of ['#ff0', '#f00']) {
    assert.equal(count(group(svg, 'scarf-flat'), fill), 2);
    assert.equal(count(group(svg, 'scarf-rolled'), fill), 6);
  }
});

// ---------- views, logo, escaping ----------
test('view selects which scarf is drawn and the matching viewBox', () => {
  const both = ScoutScarf.toSVG();
  assert.ok(group(both, 'scarf-flat') && group(both, 'scarf-rolled'));
  const flat = ScoutScarf.toSVG({ view: 'flat' });
  assert.ok(group(flat, 'scarf-flat') && !group(flat, 'scarf-rolled'));
  assert.match(flat, /viewBox="43 30 1740 880"/);
  const rolled = ScoutScarf.toSVG({ view: 'rolled' });
  assert.ok(!group(rolled, 'scarf-flat') && group(rolled, 'scarf-rolled'));
  assert.equal(ScoutScarf.toSVG({ view: 'sideways' }), both);
});

test('logo is drawn once per view and scaled by logoScale', () => {
  const svg = ScoutScarf.toSVG({ logo: 'logo.svg' });
  assert.equal((svg.match(/<image /g) || []).length, 2);
  assert.doesNotMatch(ScoutScarf.toSVG(), /<image /);
  const width = s => Number(s.match(/<image [^>]*width="([\d.]+)"/)[1]);
  assert.equal(width(ScoutScarf.toSVG({ logo: 'x', logoScale: 2 })), 2 * width(svg));
});

test('user-supplied strings are escaped', () => {
  const svg = ScoutScarf.toSVG({ label: '"><script>', logo: 'a"b&c', mainColor: 'red"onload="x' });
  assert.doesNotMatch(svg, /<script>/);
  assert.match(svg, /aria-label="&quot;&gt;&lt;script&gt;"/);
  assert.match(svg, /href="a&quot;b&amp;c"/);
  assert.doesNotMatch(svg, /onload="/);
});

test('output is deterministic and does not mutate defaults', () => {
  const before = { ...ScoutScarf.defaults };
  assert.equal(ScoutScarf.toSVG({ outerBandWidth: 'wide' }), ScoutScarf.toSVG({ outerBandWidth: 'wide' }));
  assert.deepEqual(ScoutScarf.defaults, before);
});

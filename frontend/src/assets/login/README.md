# Login background map

`world-dots.svg` is a decorative dot sampling of Natural Earth's 1:110m land polygons.

- Source: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson
- Dataset license: public domain, https://www.naturalearthdata.com/about/terms-of-use/
- Projection: equirectangular, 1,000 × 400 units, longitude −180° to 180°, latitude 82° to −62°.
- Sampling: a 9-unit grid, 1,462 dots; rounded 2.4-unit strokes combine the points into one 17 KB SVG path.

The geographic data is reduced once during asset preparation. The application performs no map computation, fetches no external images, and displays no country borders. Paint washes and greeting bubbles are static SVG/CSS in `AuthBackdrop.tsx`.

// Step 1: Import the packages:
// - @eox/layout
// - @eox/map
// - @eox/layercontrol
// - @eox/jsonform   (renders the config form)
// and the scene lookup helper:
//   import { fetchGeoZarrUrl } from "../shared/utils.js";

// After importing, add (uncomment) the <eox-layout>, <eox-map>, and
// <eox-layercontrol> elements in index.html for the components to render.

// ----------------------------------------------------------------------------
// PART A — true colour (RGB)
// ----------------------------------------------------------------------------
// Step 2: Build the TiTiler tile URL.
// TiTiler renders GeoZarr server-side and returns PNG tiles. In eox-map, this is a
// plain Tile + XYZ layer — no GeoZarr source needed. The URL pattern is:
//   ${base}/collections/${collection}/items/${item}/tiles/WebMercatorQuad/{z}/{x}/{y}.png
// with query params:
//   variables=/measurements/reflectance:b04
//   variables=/measurements/reflectance:b03
//   variables=/measurements/reflectance:b02
//   rescale=0,0.5
//   color_formula=gamma rgb 1.3, sigmoidal rgb 8 0.1, saturation 1.2
//
// base URL
// const base = "https://api.explorer.eopf.copernicus.eu/raster";
//
// The collection and item ids are both embedded in the GeoZarr URL
// (.../{collection}/{item}.zarr/...), so derive them with a small helper that calls
// fetchGeoZarrUrl([12.25, 45.35, 12.45, 45.55]) from ../shared/utils.js:
//   async function getCollectionAndItem(bbox) {
//     const url = await fetchGeoZarrUrl(bbox);
//     const [, collection, item] = url.match(/\/([^/]+)\/([^/]+)\.zarr\b/) ?? [];
//     return { collection, item };
//   }

// Step 3: Build the layers. Uncomment the OSM base below, then add the TiTiler layer
// as a Tile/XYZ source pointing at the tile URL above.
/** @type {import("@eox/map").EoxLayer[]} */
const layers = [
  // {
  //   type: "Tile",
  //   properties: { id: "osm", title: "OpenStreetMap" },
  //   source: {
  //     type: "XYZ",
  //     url: "https://tiles.maps.eox.at/wmts/1.0.0/osm_3857/default/g/{z}/{y}/{x}.jpg",
  //   },
  // },
  // Add the TiTiler RGB Tile/XYZ layer here (and its layerConfig, Step 4).
];

// Assign the layers, center, and zoom to the map (Venice). Uncomment:
// const map = document.querySelector("#my-map");
// Object.assign(map, {
//   center: [12.33, 45.44],
//   zoom: 11,
//   layers,
// });

// Step 4: Add a `layerConfig` to the TiTiler layer so the layer control can
// re-render the scene with new parameters.
// This is the same mechanism as exercise 02. In exercise 02, `type: "style"` drove
// client-side WebGL variables. Here, use `type: "tileUrl"`: schema fields map to
// source URL query parameters, and changing them rewrites the tile request for a
// server-side re-render. Use string enum dropdowns with options.enum_titles:
//   rescale       -> ["0,0.1","0,0.2","0,0.5","0,0.8"]  (brightness)
//   color_formula -> a few presets (Natural / Flat / Vivid) 
//   "gamma rgb 1.0",
//   "gamma rgb 1.5, saturation 1.4",
// Set layerControlToolsExpand: true.

// ----------------------------------------------------------------------------
// PART B — band math + colour maps
// ----------------------------------------------------------------------------
// Step 5: Add a second Tile + XYZ layer (visible: false) that computes a
// spectral index server-side. Instead of `variables`, its URL uses:
//   expression=(/measurements/reflectance:b08-/measurements/reflectance:b04)/(/measurements/reflectance:b08+/measurements/reflectance:b04)  (NDVI)
//   colormap_name=ylgn
//   rescale=-0.3,0.8
//
// All three indices are normalized differences (A-B)/(A+B), bounded to [-1, 1]:
//   NDVI (vegetation): (B08-B04)/(B08+B04)   (NIR - Red)   / (NIR + Red)
//   NDWI (water):      (B03-B08)/(B03+B08)   (Green - NIR) / (Green + NIR)
//   NBR  (burn):       (B08-B12)/(B08+B12)   (NIR - SWIR2) / (NIR + SWIR2)
//
// Add a layerConfig with three dropdowns: `expression` (NDVI / NDWI / NBR — the
// band-math string is the enum value), `colormap_name` (ylgn / viridis / blues / …),
// and `rescale` (the index value range). Toggle the layer on in the layer control.

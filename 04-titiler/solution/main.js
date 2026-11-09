import "@eox/layout";
import "@eox/map";
import "@eox/layercontrol";
import "@eox/jsonform";
import { fetchGeoZarrUrl } from "../../shared/utils.js";

const base = "https://api.explorer.eopf.copernicus.eu/raster";

/**
 * Resolve the TiTiler collection and item ids for a bbox. The GeoZarr URL embeds
 * both: .../{collection}/{item}.zarr/...
 * @param {[number, number, number, number]} bbox - [west, south, east, north] in degrees.
 * @returns {Promise<{ collection: string, item: string }>}
 */
async function getCollectionAndItem(bbox) {
  const url = await fetchGeoZarrUrl(bbox);
  const [, collection, item] = url.match(/\/([^/]+)\/([^/]+)\.zarr\b/) ?? [];
  return { collection, item };
}

// Venice scene.
const { collection, item } = await getCollectionAndItem([
  12.25, 45.35, 12.45, 45.55,
]);

const tiles = `${base}/collections/${collection}/items/${item}/tiles/WebMercatorQuad/{z}/{x}/{y}.png`;

// ---- Part A: true-colour RGB tuned with rescale + color_formula ----
const defaultColorFormula =
  "gamma rgb 1.3, sigmoidal rgb 8 0.1, saturation 1.2";
const rgbUrl = `${tiles}?${new URLSearchParams({
  assets: "reflectance|bands=b04,b03,b02",
  rescale: "0,0.5",
  color_formula: defaultColorFormula,
})}`;

const rescaleOptions = {
  type: "string",
  enum: ["0,0.1", "0,0.2", "0,0.5", "0,0.8"],
  options: {
    enum_titles: [
      "Brightest (0 - 0.1)",
      "Bright (0 - 0.2)",
      "Balanced (0 - 0.5)",
      "Darker (0 - 0.8)",
    ],
  },
  default: "0,0.5",
};

// ---- Part B: spectral index via `expression` ----
// The expression lives inside `assets` and references bands by name. The
// single-band result is coloured with `colormap_name`.
const ndvi = "reflectance|expression=(b08-b04)/(b08+b04)";
const ndwi = "reflectance|expression=(b03-b08)/(b03+b08)";
const nbr = "reflectance|expression=(b08-b12)/(b08+b12)";

// URLSearchParams encodes `+` as %2B; a raw `+` would decode to a space.
const indexUrl = `${tiles}?${new URLSearchParams({
  assets: ndvi,
  rescale: "-0.3,0.8",
  colormap_name: "ylgn",
})}`;

/** @type {import("@eox/map").EoxLayer[]} */
const layers = [
  {
    type: "Tile",
    properties: { id: "osm", title: "OpenStreetMap" },
    source: {
      type: "XYZ",
      url: "https://tiles.maps.eox.at/wmts/1.0.0/osm_3857/default/g/{z}/{y}/{x}.jpg",
    },
  },
  {
    type: "Tile",
    properties: {
      id: "rgb",
      title: "True Colour (TiTiler)",
      layerControlExpand: true,
      layerControlToolsExpand: true,
      // type: "tileUrl" (unlike exercise 02's "style", which drove WebGL variables)
      // maps schema fields to source URL query parameters. Changing a field rewrites
      // the tile request and TiTiler re-renders server-side.
      layerConfig: {
        type: "tileUrl",
        schema: {
          type: "object",
          title: "Server-side rendering",
          properties: {
            rescale: { title: "Brightness (rescale)", ...rescaleOptions },
            color_formula: {
              title: "Colour formula",
              type: "string",
              enum: [
                defaultColorFormula,
                "gamma rgb 1.0",
                "gamma rgb 1.5, saturation 1.4",
              ],
              options: { enum_titles: ["Natural", "Flat", "Vivid"] },
              default: defaultColorFormula,
            },
          },
        },
      },
    },
    source: { type: "XYZ", url: rgbUrl },
  },
  {
    type: "Tile",
    properties: {
      id: "index",
      title: "Vegetation index (TiTiler)",
      visible: false, // hidden by default; toggle on for Part B
      layerControlToolsExpand: true,
      layerConfig: {
        type: "tileUrl",
        schema: {
          type: "object",
          title: "Band math + colour map",
          properties: {
            assets: {
              title: "Index",
              type: "string",
              enum: [ndvi, ndwi, nbr],
              options: {
                enum_titles: [
                  "NDVI (vegetation)",
                  "NDWI (water)",
                  "NBR (burn)",
                ],
              },
              default: ndvi,
            },
            colormap_name: {
              title: "Colour map",
              type: "string",
              enum: ["ylgn", "viridis", "blues", "rdpu", "spectral"],
              options: {
                enum_titles: [
                  "Yellow - Green",
                  "Viridis",
                  "Blues",
                  "Red - Purple",
                  "Spectral",
                ],
              },
              default: "ylgn",
            },
            rescale: {
              title: "Value range",
              type: "string",
              enum: ["-0.3,0.8", "-1,1"],
              options: {
                enum_titles: [
                  "Vegetation (−0.3 to 0.8)",
                  "Full index (−1 to 1)",
                ],
              },
              default: "-0.3,0.8",
            },
          },
        },
      },
    },
    source: { type: "XYZ", url: indexUrl },
  },
];

const map = document.querySelector("#my-map");
Object.assign(map, { center: [12.33, 45.44], zoom: 11, layers });

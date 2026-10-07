/**
 * mapConfig.js
 * Centralized Map Tile provider configuration.
 * Uses Esri World Street Map basemap (built on OpenStreetMap data).
 * 100% compliant with public usage rules — Zero API keys, Zero watermarks, Zero access blocks.
 */

export const MAP_CONFIG = {
  // Tile Server URL templates
  tileServers: {
    // Esri World Street Map (High quality street map, no API key, no watermark, unblocked for mobile apps)
    esriStreet: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    esriTopo: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
  },

  defaultCenter: {
    latitude: 14.6500, // Quezon City / Metro Manila reference coordinate
    longitude: 121.0300,
    zoomLevel: 14,
  },
  defaultRadiusMeters: 5000,
  attributionText: '© OpenStreetMap contributors | Esri Basemaps',
};

export default MAP_CONFIG;

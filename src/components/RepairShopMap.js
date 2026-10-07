import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MAP_CONFIG from '../config/mapConfig';
import { useTheme } from '../theme/ThemeContext';

const BRAND = '#F63B05';
const TILE_SIZE = 256;

// Mercator Projection Math
const lat2tileExact = (lat, zoom) => {
  const rad = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * Math.pow(2, zoom);
};

const lon2tileExact = (lon, zoom) => {
  return ((lon + 180) / 360) * Math.pow(2, zoom);
};

const tileExact2lon = (xExact, zoom) => {
  return (xExact / Math.pow(2, zoom)) * 360 - 180;
};

const tileExact2lat = (yExact, zoom) => {
  const n = Math.PI - (2 * Math.PI * yExact) / Math.pow(2, zoom);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
};

const getTouchDistance = (touches) => {
  if (!touches || touches.length < 2) return 0;
  const dx = touches[0].pageX - touches[1].pageX;
  const dy = touches[0].pageY - touches[1].pageY;
  return Math.sqrt(dx * dx + dy * dy);
};

// Returns unblocked, zero-watermark Esri World Street Map tiles (OSM data)
const getTileUrl = (x, y, z) => {
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${z}/${y}/${x}`;
};

/**
 * RepairShopMap Component
 * Tap-to-Pin Interactive Map Engine with mobile-accurate container touch resolution.
 * Camera position and selected location pin are independent.
 * Tapping places 📍 pin at exact tapped coordinates without forcing camera jump.
 */
const RepairShopMap = ({
  shops = [],
  userLocation = { latitude: 14.6500, longitude: 121.0300, name: 'Selected Location' },
  deviceGpsLocation = null,
  selectedShopId = null,
  onSelectShop = () => {},
  onSetLocationPin = () => {},
  onRecenterGps = () => {},
  isExpanded = false,
  onToggleExpand = () => {},
}) => {
  // ---------------------------------------------------------------------------
  // 1. HOOK DECLARATIONS
  // ---------------------------------------------------------------------------

  const { theme } = useTheme();

  // Active selected location coordinates
  const selLat = Number(userLocation?.latitude) || 14.6500;
  const selLng = Number(userLocation?.longitude) || 121.0300;

  // Hardware GPS coordinates
  const gpsLat = deviceGpsLocation ? Number(deviceGpsLocation.latitude) : selLat;
  const gpsLng = deviceGpsLocation ? Number(deviceGpsLocation.longitude) : selLng;
  const hasGpsFix = Boolean(deviceGpsLocation);

  const containerRef = useRef(null);
  const containerPagePosRef = useRef({ x: 0, y: 0 });

  const [zoom, setZoom] = useState(14);
  const [containerDimensions, setContainerDimensions] = useState({ width: 340, height: 250 });

  // Camera map view center (independent of selected location pin)
  const [mapCenter, setMapCenter] = useState({
    latitude: selLat,
    longitude: selLng,
  });

  const initialCenterSetRef = useRef(false);

  // Mutable refs for gesture tracking
  const mapCenterRef = useRef(mapCenter);
  mapCenterRef.current = mapCenter;

  const startCenterRef = useRef(mapCenter);

  const currentZoomRef = useRef(zoom);
  currentZoomRef.current = zoom;

  const lastTapTimeRef = useRef(0);
  const initialPinchDistRef = useRef(0);
  const touchStartCountRef = useRef(0);

  // PanResponder instance for map canvas touch pan & mobile tap-to-pin interaction
  const panResponderRef = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3;
      },
      onPanResponderGrant: (evt) => {
        startCenterRef.current = mapCenterRef.current;
        const touches = evt.nativeEvent.touches || [];
        touchStartCountRef.current = touches.length;

        if (touches.length === 1) {
          // Measure container page position on grant for accurate touch calculations
          if (containerRef.current && containerRef.current.measureInWindow) {
            containerRef.current.measureInWindow((x, y) => {
              if (x > 0 || y > 0) {
                containerPagePosRef.current = { x, y };
              }
            });
          }

          // Double tap to zoom in
          const now = Date.now();
          if (now - lastTapTimeRef.current < 300) {
            if (currentZoomRef.current < 18) {
              setZoom(prev => Math.min(prev + 1, 18));
            }
            lastTapTimeRef.current = 0;
          } else {
            lastTapTimeRef.current = now;
          }
        } else if (touches.length === 2) {
          initialPinchDistRef.current = getTouchDistance(touches);
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches || [];

        if (touches.length === 2) {
          // Pinch Zoom
          const dist = getTouchDistance(touches);
          const initialDist = initialPinchDistRef.current;

          if (initialDist > 15 && dist > 15) {
            const ratio = dist / initialDist;
            if (ratio > 1.25) {
              if (currentZoomRef.current < 18) {
                setZoom(prev => Math.min(prev + 1, 18));
                initialPinchDistRef.current = dist;
              }
            } else if (ratio < 0.75) {
              if (currentZoomRef.current > 10) {
                setZoom(prev => Math.max(prev - 1, 10));
                initialPinchDistRef.current = dist;
              }
            }
          }
        } else {
          // Single-Finger Drag Panning (Camera moves, Pin stays anchored to map tiles)
          const z = currentZoomRef.current;
          const startLat = startCenterRef.current.latitude;
          const startLng = startCenterRef.current.longitude;

          const startExactX = lon2tileExact(startLng, z);
          const startExactY = lat2tileExact(startLat, z);

          const newExactX = startExactX - (gestureState.dx / TILE_SIZE);
          const newExactY = startExactY - (gestureState.dy / TILE_SIZE);

          const newLng = tileExact2lon(newExactX, z);
          const newLat = tileExact2lat(newExactY, z);

          setMapCenter({
            latitude: newLat,
            longitude: newLng,
          });
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        const dx = Math.abs(gestureState.dx);
        const dy = Math.abs(gestureState.dy);

        // TAP EVENT: User tapped on map canvas -> Immediately place 📍 Selected Pin at exact tapped coordinates!
        if (dx <= 4 && dy <= 4 && touchStartCountRef.current === 1) {
          let touchX = evt.nativeEvent.locationX;
          let touchY = evt.nativeEvent.locationY;

          // Cross-platform mobile touch resolution using pageX/pageY minus container offset
          if (evt.nativeEvent.pageX !== undefined && containerPagePosRef.current.x > 0) {
            const containerRelativeX = evt.nativeEvent.pageX - containerPagePosRef.current.x;
            const containerRelativeY = evt.nativeEvent.pageY - containerPagePosRef.current.y;
            if (containerRelativeX >= 0 && containerRelativeY >= 0) {
              touchX = containerRelativeX;
              touchY = containerRelativeY;
            }
          }

          const z = currentZoomRef.current;
          const containerW = containerDimensions.width || 340;
          const containerH = isExpanded ? 380 : 250;

          const cExactX = lon2tileExact(mapCenterRef.current.longitude, z);
          const cExactY = lat2tileExact(mapCenterRef.current.latitude, z);

          const touchExactX = cExactX + (touchX - containerW / 2) / TILE_SIZE;
          const touchExactY = cExactY + (touchY - containerH / 2) / TILE_SIZE;

          const tappedLng = tileExact2lon(touchExactX, z);
          const tappedLat = tileExact2lat(touchExactY, z);

          // Notify parent: 📍 Pin IMMEDIATELY appears at tapped coordinates!
          if (onSetLocationPin) {
            onSetLocationPin({
              latitude: tappedLat,
              longitude: tappedLng,
            });
          }
        }
        touchStartCountRef.current = 0;
      },
    }),
  );

  // Initialize camera mapCenter ONCE on initial load to prevent camera jumps when pin updates
  useEffect(() => {
    if (!initialCenterSetRef.current && selLat && selLng) {
      setMapCenter({
        latitude: selLat,
        longitude: selLng,
      });
      initialCenterSetRef.current = true;
    }
  }, [selLat, selLng]);

  // Handle layout & initial container position measurement
  const handleLayout = (e) => {
    const { width, height } = e.nativeEvent.layout;
    setContainerDimensions({ width, height });
    if (containerRef.current && containerRef.current.measureInWindow) {
      containerRef.current.measureInWindow((x, y) => {
        if (x > 0 || y > 0) {
          containerPagePosRef.current = { x, y };
        }
      });
    }
  };

  // Calculations for map rendering
  const containerWidth = containerDimensions.width || 340;
  const containerHeight = isExpanded ? 380 : 250;

  const centerExactX = lon2tileExact(mapCenter.longitude, zoom);
  const centerExactY = lat2tileExact(mapCenter.latitude, zoom);

  const centerTileX = Math.floor(centerExactX);
  const centerTileY = Math.floor(centerExactY);

  // Memoize tile grid layout
  const tiles = useMemo(() => {
    const grid = [];
    const maxTile = Math.pow(2, zoom) - 1;

    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        const tx = centerTileX + dx;
        const ty = centerTileY + dy;

        if (tx < 0 || tx > maxTile || ty < 0 || ty > maxTile) continue;

        const leftPixel = (containerWidth / 2) + (tx - centerExactX) * TILE_SIZE;
        const topPixel = (containerHeight / 2) + (ty - centerExactY) * TILE_SIZE;

        grid.push({
          key: `${zoom}-${tx}-${ty}`,
          url: getTileUrl(tx, ty, zoom),
          left: leftPixel,
          top: topPixel,
        });
      }
    }
    return grid;
  }, [centerTileX, centerTileY, centerExactX, centerExactY, zoom, containerWidth, containerHeight]);

  // Project Selected Pin 📍 location relative to camera mapCenter
  const selExactX = lon2tileExact(selLng, zoom);
  const selExactY = lat2tileExact(selLat, zoom);
  const selLeftPixel = (containerWidth / 2) + (selExactX - centerExactX) * TILE_SIZE;
  const selTopPixel = (containerHeight / 2) + (selExactY - centerExactY) * TILE_SIZE;

  // Project Hardware GPS ◎ position relative to camera mapCenter
  const gpsExactX = lon2tileExact(gpsLng, zoom);
  const gpsExactY = lat2tileExact(gpsLat, zoom);
  const gpsLeftPixel = (containerWidth / 2) + (gpsExactX - centerExactX) * TILE_SIZE;
  const gpsTopPixel = (containerHeight / 2) + (gpsExactY - centerExactY) * TILE_SIZE;

  // Memoize projected shop markers
  const projectedShops = useMemo(() => {
    return shops.map((shop, idx) => {
      const shopLat = Number(shop.latitude) || selLat;
      const shopLng = Number(shop.longitude) || selLng;

      const shopExactX = lon2tileExact(shopLng, zoom);
      const shopExactY = lat2tileExact(shopLat, zoom);

      const left = (containerWidth / 2) + (shopExactX - centerExactX) * TILE_SIZE;
      const top = (containerHeight / 2) + (shopExactY - centerExactY) * TILE_SIZE;

      return {
        ...shop,
        left,
        top,
      };
    });
  }, [shops, selLat, selLng, centerExactX, centerExactY, zoom, containerWidth, containerHeight]);

  // ---------------------------------------------------------------------------
  // 2. EVENT HANDLERS
  // ---------------------------------------------------------------------------

  const handleZoomIn = () => {
    if (zoom < 18) setZoom(prev => prev + 1);
  };

  const handleZoomOut = () => {
    if (zoom > 10) setZoom(prev => prev - 1);
  };

  const handleRecenterCameraToPin = () => {
    setMapCenter({
      latitude: selLat,
      longitude: selLng,
    });
  };

  const handleUseGps = () => {
    if (onRecenterGps) {
      onRecenterGps();
    } else if (onSetLocationPin) {
      onSetLocationPin({
        latitude: gpsLat,
        longitude: gpsLng,
      });
    }
    setMapCenter({
      latitude: gpsLat,
      longitude: gpsLng,
    });
  };

  const isCameraPannedAwayFromPin = Math.abs(mapCenter.latitude - selLat) > 0.0008 || Math.abs(mapCenter.longitude - selLng) > 0.0008;

  // ---------------------------------------------------------------------------
  // 3. RENDER JSX
  // ---------------------------------------------------------------------------

  return (
    <View style={styles.outerContainer}>
      {/* 1. CLEAN MAP VIEWPORT CANVAS */}
      <View
        ref={containerRef}
        style={[
          styles.mapViewport,
          {
            backgroundColor: '#E5E7EB',
            borderColor: theme.border || '#292929',
            height: containerHeight,
          },
        ]}
        onLayout={handleLayout}
        {...panResponderRef.current.panHandlers}
      >
        {/* MAP CANVAS TILE LAYER */}
        <View style={styles.mapCanvas} pointerEvents="box-none">
          {tiles.map((tile) => (
            <Image
              key={tile.key}
              source={{ uri: tile.url }}
              style={[
                styles.tileImage,
                {
                  left: tile.left,
                  top: tile.top,
                  width: TILE_SIZE,
                  height: TILE_SIZE,
                },
              ]}
              resizeMode="cover"
            />
          ))}

          {/* DEVICE HARDWARE GPS INDICATOR ◎ */}
          {hasGpsFix && gpsLeftPixel > -50 && gpsLeftPixel < containerWidth + 50 && gpsTopPixel > -50 && gpsTopPixel < containerHeight + 50 && (
            <View style={[styles.userLocationMarker, { left: gpsLeftPixel - 14, top: gpsTopPixel - 14 }]}>
              <View style={styles.userPulseRingOuter} />
              <View style={styles.userPulseRingInner} />
              <View style={styles.userDotCenter}>
                <Icon name="navigation" size={10} color="#FFFFFF" />
              </View>
            </View>
          )}

          {/* REPAIR SHOP PINS 🔧 (Clean pins for unselected, rich callout for selected) */}
          {projectedShops.map((shop, index) => {
            const isSelected = selectedShopId === shop.id;

            if (shop.left < -60 || shop.left > containerWidth + 60 || shop.top < -60 || shop.top > containerHeight + 60) {
              return null;
            }

            return (
              <TouchableOpacity
                key={shop.id || index}
                activeOpacity={0.85}
                style={[
                  styles.shopPinWrapper,
                  {
                    left: shop.left - 100,
                    top: shop.top - 26,
                    width: 200,
                    alignItems: 'center',
                  },
                  isSelected ? styles.shopPinWrapperSelected : styles.shopPinWrapperNormal,
                ]}
                onPress={() => onSelectShop(shop)}
              >
                {isSelected && (
                  <View style={styles.pinCalloutSelected}>
                    <Text style={styles.pinShopNameSelected} numberOfLines={1}>
                      {shop.name}
                    </Text>
                    {shop.distance_formatted && (
                      <View style={styles.pinDistBadgeSelected}>
                        <Text style={styles.pinDistTextSelected}>{shop.distance_formatted}</Text>
                      </View>
                    )}
                  </View>
                )}

                <View
                  style={[
                    styles.pinIconContainer,
                    isSelected ? styles.pinIconContainerSelected : styles.pinIconContainerNormal,
                  ]}
                >
                  <Icon name="build" size={isSelected ? 12 : 10} color="#FFFFFF" />
                </View>
                <View
                  style={[
                    styles.pinPointerTriangle,
                    { borderTopColor: isSelected ? BRAND : '#1E293B' },
                  ]}
                />
              </TouchableOpacity>
            );
          })}

          {/* SELECTED LOCATION PIN 📍 */}
          {selLeftPixel > -60 && selLeftPixel < containerWidth + 60 && selTopPixel > -60 && selTopPixel < containerHeight + 60 && (
            <View
              style={[
                styles.selectedPinMarkerWrapper,
                {
                  left: selLeftPixel - 100,
                  top: selTopPixel - 62,
                  width: 200,
                  alignItems: 'center',
                },
              ]}
              pointerEvents="none"
            >
              <View style={styles.selectedPinCalloutPill}>
                <Text style={styles.selectedPinCalloutText} numberOfLines={1}>
                  {userLocation?.name || 'Selected Location'}
                </Text>
              </View>

              <View style={styles.selectedPinIconCircle}>
                <Icon name="place" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.selectedPinTipTriangle} />
            </View>
          )}
        </View>

        {/* MINIMAL IN-MAP FLOATING HUD CONTROLS */}
        {/* TOP-RIGHT: SLEEK FULLSCREEN TOGGLE BUTTON */}
        <View style={styles.hudTopRight} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.minimalIconBtn}
            activeOpacity={0.8}
            onPress={onToggleExpand}
            accessibilityLabel={isExpanded ? 'Collapse Map' : 'Expand Map'}
          >
            <Icon
              name={isExpanded ? 'fullscreen-exit' : 'fullscreen'}
              size={18}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>

        {/* BOTTOM-RIGHT: SLEEK MINIMAL CONTROLS (ZOOM & GPS) */}
        <View style={styles.hudBottomRight} pointerEvents="box-none">
          {/* RE-CENTER TO PIN BUTTON (ONLY IF CAMERA PANNED FAR AWAY) */}
          {isCameraPannedAwayFromPin && (
            <TouchableOpacity
              style={[styles.minimalIconBtn, { backgroundColor: BRAND }]}
              activeOpacity={0.85}
              onPress={handleRecenterCameraToPin}
              accessibilityLabel="Show Pin Location"
            >
              <Icon name="place" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          {/* MY LOCATION GPS ICON BUTTON */}
          <TouchableOpacity
            style={styles.minimalIconBtn}
            activeOpacity={0.85}
            onPress={handleUseGps}
            accessibilityLabel="Use My Current GPS Location"
          >
            <Icon name="my-location" size={16} color="#38BDF8" />
          </TouchableOpacity>

          {/* COMPACT ZOOM PILL */}
          <View style={styles.zoomPill}>
            <TouchableOpacity style={styles.zoomPillBtn} activeOpacity={0.7} onPress={handleZoomIn}>
              <Icon name="add" size={16} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.zoomPillDivider} />
            <TouchableOpacity style={styles.zoomPillBtn} activeOpacity={0.7} onPress={handleZoomOut}>
              <Icon name="remove" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 2. SELECTED SEARCH LOCATION ACTION CARD (OUTSIDE / AT BOTTOM OF MAP CONTAINER) */}
      <View
        style={[
          styles.externalLocationCard,
          {
            backgroundColor: theme.surface || '#111111',
            borderColor: theme.border || '#292929',
          },
        ]}
      >
        <View style={styles.locationCardLeft}>
          <View style={styles.locationHeaderRow}>
            <View style={[styles.statusDot, { backgroundColor: BRAND }]} />
            <Text style={[styles.locationCardLabel, { color: theme.textSecondary || '#94A3B8' }]}>
              {userLocation?.isSaved ? 'Saved Search Location' : 'Selected Search Location'}
            </Text>
          </View>
          <Text style={[styles.locationCardName, { color: theme.text || '#FFFFFF' }]} numberOfLines={1}>
            {userLocation?.name || 'Socorro, Oriental Mindoro'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.useThisLocationBtn}
          activeOpacity={0.88}
          onPress={() => onSetLocationPin({ latitude: selLat, longitude: selLng })}
        >
          <Icon name="check-circle" size={16} color="#FFFFFF" />
          <Text style={styles.useThisLocationText}>Use This Location</Text>
        </TouchableOpacity>
      </View>

      {/* SUBTLE CAPTION UNDER MAP */}
      <Text style={[styles.mapHelpText, { color: theme.textSecondary || '#666666' }]}>
        Tap anywhere on the map to pin a new location.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    width: '100%',
    marginVertical: 10,
  },
  mapViewport: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  mapCanvas: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#E5E7EB',
  },
  tileImage: {
    position: 'absolute',
  },

  /* Device Hardware GPS Indicator ◎ */
  userLocationMarker: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
    width: 28,
    height: 28,
  },
  userPulseRingOuter: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(56, 189, 248, 0.22)',
    borderWidth: 1.5,
    borderColor: 'rgba(2, 132, 199, 0.5)',
  },
  userPulseRingInner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.35)',
  },
  userDotCenter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#0284C7',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },

  /* Selected Location Pin 📍 */
  selectedPinMarkerWrapper: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 40,
  },
  selectedPinCalloutPill: {
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: BRAND,
    marginBottom: 3,
    elevation: 6,
    maxWidth: 180,
  },
  selectedPinCalloutText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 10,
    color: '#FFFFFF',
  },
  selectedPinIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: BRAND,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  selectedPinTipTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: BRAND,
    marginTop: -1,
  },

  /* Shop Pins 🔧 */
  shopPinWrapper: {
    position: 'absolute',
    alignItems: 'center',
  },
  shopPinWrapperNormal: {
    zIndex: 5,
  },
  shopPinWrapperSelected: {
    zIndex: 50,
  },
  pinCalloutSelected: {
    position: 'absolute',
    bottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: BRAND,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    elevation: 6,
    maxWidth: 160,
  },
  pinShopNameSelected: {
    fontFamily: 'Outfit-Bold',
    fontSize: 11,
    color: '#FFFFFF',
    flexShrink: 1,
  },
  pinDistBadgeSelected: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  pinDistTextSelected: {
    fontFamily: 'Inter-Bold',
    fontSize: 8,
    color: '#FFEDD5',
  },
  pinIconContainer: {
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  pinIconContainerNormal: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1E293B',
    borderColor: BRAND,
  },
  pinIconContainerSelected: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: BRAND,
    borderColor: '#FFFFFF',
  },
  pinPointerTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },

  /* Minimal Map Controls HUD */
  hudTopRight: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 30,
  },
  hudBottomRight: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    alignItems: 'center',
    gap: 6,
    zIndex: 30,
  },
  minimalIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  zoomPill: {
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    elevation: 3,
    overflow: 'hidden',
  },
  zoomPillBtn: {
    width: 34,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomPillDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },

  /* External Location Card (Outside Map, Below Viewport) */
  externalLocationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  locationCardLeft: {
    flex: 1,
    minWidth: 0,
  },
  locationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  locationCardLabel: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  locationCardName: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13,
    marginTop: 2,
  },
  useThisLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BRAND,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 10,
    elevation: 3,
  },
  useThisLocationText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 11.5,
    color: '#FFFFFF',
  },
  mapHelpText: {
    fontFamily: 'Inter-Medium',
    fontSize: 10.5,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 4,
  },
});

export default RepairShopMap;

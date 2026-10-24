import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
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
  userLocation = null,
  deviceGpsLocation = null,
  selectedShopId = null,
  onSelectShop = () => {},
  onSetLocationPin = () => {},
  onRecenterGps = () => {},
  isExpanded = false,
  onToggleExpand = () => {},
  onOpenLocationSearch = null,
}) => {
  // ---------------------------------------------------------------------------
  // 1. HOOK DECLARATIONS (unchanged)
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // 1. HOOK DECLARATIONS
  // ---------------------------------------------------------------------------

  const { theme } = useTheme();

  // Active selected location coordinates
  const hasSelectedCoordinateValues = userLocation?.latitude !== null && userLocation?.latitude !== undefined && userLocation?.latitude !== ''
    && userLocation?.longitude !== null && userLocation?.longitude !== undefined && userLocation?.longitude !== '';
  const parsedSelLat = Number(userLocation?.latitude);
  const parsedSelLng = Number(userLocation?.longitude);
  const hasSelectedCoordinates = hasSelectedCoordinateValues && Number.isFinite(parsedSelLat) && Number.isFinite(parsedSelLng)
    && parsedSelLat >= -90 && parsedSelLat <= 90 && parsedSelLng >= -180 && parsedSelLng <= 180;
  const selLat = hasSelectedCoordinates ? parsedSelLat : 0;
  const selLng = hasSelectedCoordinates ? parsedSelLng : 0;

  const containerRef = useRef(null);
  const containerPagePosRef = useRef({ x: 0, y: 0 });

  const [zoom, setZoom] = useState(14);
  const [showShopPicker, setShowShopPicker] = useState(false);
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
          const containerH = isExpanded ? (containerDimensions.height || Dimensions.get('window').height - 100) : 250;

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
        } else if ((dx > 4 || dy > 4) && onSetLocationPin) {
          // A moved map selects its new center as the single user location mark.
          onSetLocationPin({
            latitude: mapCenterRef.current.latitude,
            longitude: mapCenterRef.current.longitude,
          });
        }
        touchStartCountRef.current = 0;
      },
    }),
  );

  // Synchronize camera mapCenter whenever selected location coordinates change
  const prevCoordsRef = useRef({ lat: selLat, lng: selLng });
  useEffect(() => {
    if (hasSelectedCoordinates) {
      if (
        !initialCenterSetRef.current ||
        prevCoordsRef.current.lat !== selLat ||
        prevCoordsRef.current.lng !== selLng
      ) {
        prevCoordsRef.current = { lat: selLat, lng: selLng };
        initialCenterSetRef.current = true;
        setMapCenter({
          latitude: selLat,
          longitude: selLng,
        });
      }
    }
  }, [hasSelectedCoordinates, selLat, selLng]);

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
  const containerHeight = isExpanded
    ? (containerDimensions.height || Dimensions.get('window').height - 100)
    : 250;

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

  // Memoize projected shop markers
  const projectedShops = useMemo(() => {
    return shops.flatMap((shop, idx) => {
      if (shop.latitude === null || shop.latitude === undefined || shop.latitude === ''
        || shop.longitude === null || shop.longitude === undefined || shop.longitude === '') {
        return [];
      }
      const shopLat = Number(shop.latitude);
      const shopLng = Number(shop.longitude);
      if (!Number.isFinite(shopLat) || shopLat < -90 || shopLat > 90
        || !Number.isFinite(shopLng) || shopLng < -180 || shopLng > 180) {
        return [];
      }

      const shopExactX = lon2tileExact(shopLng, zoom);
      const shopExactY = lat2tileExact(shopLat, zoom);

      const left = (containerWidth / 2) + (shopExactX - centerExactX) * TILE_SIZE;
      const top = (containerHeight / 2) + (shopExactY - centerExactY) * TILE_SIZE;

      return [{
        ...shop,
        left,
        top,
      }];
    });
  }, [shops, centerExactX, centerExactY, zoom, containerWidth, containerHeight]);

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

  const handleUseGps = async () => {
    const freshFix = onRecenterGps ? await onRecenterGps() : null;
    if (!freshFix || freshFix.isManual || freshFix.hasPermission !== true) return;
    if (freshFix.latitude === null || freshFix.latitude === undefined || freshFix.latitude === ''
      || freshFix.longitude === null || freshFix.longitude === undefined || freshFix.longitude === '') return;
    const latitude = Number(freshFix?.latitude);
    const longitude = Number(freshFix?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    setMapCenter({ latitude, longitude });
  };

  const isCameraPannedAwayFromPin = Math.abs(mapCenter.latitude - selLat) > 0.0008 || Math.abs(mapCenter.longitude - selLng) > 0.0008;
  // ---------------------------------------------------------------------------
  // 3. RENDER JSX
  // ---------------------------------------------------------------------------

  const mapContent = (
    <View style={[styles.outerContainer, isExpanded && styles.expandedOuterContainer]}>
      {/* 1. CLEAN MAP VIEWPORT CANVAS */}
      <View
        ref={containerRef}
        style={[
          styles.mapViewport,
          {
            backgroundColor: '#E5E7EB',
            borderColor: theme.border || '#292929',
            height: isExpanded ? undefined : 250,
            flex: isExpanded ? 1 : undefined,
            borderRadius: isExpanded ? 0 : 16,
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

          {/* REPAIR SHOP PINS 🔧 */}
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
                  { left: shop.left - 22, top: shop.top - 28, width: 44, height: 48 },
                  isSelected ? styles.shopPinWrapperSelected : styles.shopPinWrapperNormal,
                ]}
                onPress={() => onSelectShop(shop)}
              >
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
          {hasSelectedCoordinates && selLeftPixel > -60 && selLeftPixel < containerWidth + 60 && selTopPixel > -60 && selTopPixel < containerHeight + 60 && (
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
                  You
                </Text>
              </View>

              <View style={styles.selectedPinIconCircle} />
              <View style={styles.selectedPinTipTriangle} />
            </View>
          )}
        </View>

        {isExpanded && showShopPicker && (
          <View style={styles.shopPickerSheet}>
            <View style={styles.shopPickerHeader}>
              <Text style={styles.shopPickerTitle}>Nearby repair shops</Text>
              <TouchableOpacity
                onPress={() => setShowShopPicker(false)}
                accessibilityLabel="Close shop list"
                hitSlop={8}
              >
                <Icon name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {shops.map((shop, index) => {
                const selected = selectedShopId === shop.id;
                return (
                  <TouchableOpacity
                    key={shop.id || index}
                    style={[styles.shopPickerRow, selected && styles.shopPickerRowSelected]}
                    onPress={() => {
                      setShowShopPicker(false);
                      onSelectShop(shop);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.shopPickerName} numberOfLines={1}>{shop.name || 'Repair shop'}</Text>
                      {shop.distance_formatted ? <Text style={styles.shopPickerMeta}>{shop.distance_formatted}</Text> : null}
                    </View>
                    <Icon name={selected ? 'radio-button-checked' : 'chevron-right'} size={19} color={selected ? BRAND : '#94A3B8'} />
                  </TouchableOpacity>
                );
              })}
              {shops.length === 0 && <Text style={styles.shopPickerEmpty}>No listed shops for this location yet.</Text>}
            </ScrollView>
          </View>
        )}

        {/* MINIMAL IN-MAP FLOATING HUD CONTROLS */}
        {/* TOP-RIGHT: SLEEK FULLSCREEN TOGGLE BUTTON */}
        <View style={styles.hudTopRight} pointerEvents="box-none">
          {onOpenLocationSearch && (
            <TouchableOpacity
              style={styles.minimalIconBtn}
              activeOpacity={0.8}
              onPress={onOpenLocationSearch}
              accessibilityLabel="Search or choose a map location"
            >
              <Icon name="search" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          )}
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

        {isExpanded && (
          <View style={styles.hudBottomLeft} pointerEvents="box-none">
            <TouchableOpacity
              style={[styles.minimalIconBtn, styles.shopListButton]}
              activeOpacity={0.85}
              onPress={() => setShowShopPicker(value => !value)}
              accessibilityLabel={`Show nearby repair shops, ${shops.length} results`}
            >
              <Icon name="format-list-bulleted" size={18} color="#FFFFFF" />
              <Text style={styles.shopListButtonText}>{shops.length}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.mapLegend} pointerEvents="none">
          <View style={styles.mapLegendItem}>
            <View style={styles.mapLegendUserDot} />
            <Text style={styles.mapLegendText}>You</Text>
          </View>
          <View style={styles.mapLegendItem}>
            <View style={styles.mapLegendShopDot} />
            <Text style={styles.mapLegendText}>Repair shops</Text>
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
            {userLocation?.name || 'Choose a location'}
          </Text>
        </View>

        {isCameraPannedAwayFromPin ? (
          <TouchableOpacity
            style={styles.useThisLocationBtn}
            activeOpacity={0.88}
            onPress={handleRecenterCameraToPin}
          >
            <Icon name="center-focus-strong" size={16} color="#FFFFFF" />
            <Text style={styles.useThisLocationText}>Center Pin</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.syncedBadge}>
            <Icon name="check" size={14} color="#32D583" />
            <Text style={styles.syncedBadgeText}>In View</Text>
          </View>
        )}
      </View>

      {/* SUBTLE CAPTION UNDER MAP */}
      <Text style={[styles.mapHelpText, { color: theme.textSecondary || '#666666' }]}>
        Tap anywhere on the map to pin a new location.
      </Text>
    </View>
  );

  if (!isExpanded) return mapContent;

  return (
    <Modal
      visible
      animationType="fade"
      statusBarTranslucent={false}
      onRequestClose={onToggleExpand}
    >
      <SafeAreaView
        edges={['top', 'bottom']}
        style={[styles.expandedModal, { backgroundColor: theme.background || '#0A0A0A' }]}
      >
        {mapContent}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    width: '100%',
    marginVertical: 10,
  },
  expandedModal: {
    flex: 1,
  },
  expandedOuterContainer: {
    flex: 1,
    marginVertical: 0,
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
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#0284C7',
    borderWidth: 2,
    borderColor: '#FFFFFF',
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
    borderTopColor: '#0284C7',
    marginTop: -1,
  },

  /* Shop Pins 🔧 */
  shopPinWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  shopPinWrapperNormal: {
    zIndex: 5,
  },
  shopPinWrapperSelected: {
    zIndex: 50,
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
    flexDirection: 'row',
    gap: 6,
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
  hudBottomLeft: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    zIndex: 30,
  },
  mapLegend: {
    position: 'absolute',
    left: 12,
    right: 80,
    bottom: 10,
    minHeight: 32,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    zIndex: 28,
  },
  mapLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  mapLegendUserDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0284C7',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  mapLegendShopDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BRAND,
  },
  mapLegendText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  shopListButton: {
    width: 'auto',
    minWidth: 58,
    paddingHorizontal: 10,
    flexDirection: 'row',
    gap: 6,
  },
  shopListButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  shopPickerSheet: {
    position: 'absolute',
    left: 12,
    right: 72,
    bottom: 12,
    maxHeight: '55%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(15, 23, 42, 0.97)',
    zIndex: 26,
    overflow: 'hidden',
  },
  shopPickerHeader: {
    minHeight: 44,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  shopPickerTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  shopPickerRow: {
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  shopPickerRowSelected: {
    backgroundColor: 'rgba(246, 59, 5, 0.18)',
  },
  shopPickerName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  shopPickerMeta: {
    marginTop: 2,
    color: '#CBD5E1',
    fontSize: 11,
  },
  shopPickerEmpty: {
    padding: 14,
    color: '#CBD5E1',
    fontSize: 13,
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
  syncedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(50, 213, 131, 0.12)',
    gap: 4,
  },
  syncedBadgeText: {
    fontFamily: 'Inter-Medium',
    fontSize: 11.5,
    color: '#32D583',
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

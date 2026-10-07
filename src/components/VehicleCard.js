import { useRef } from 'react';
import {
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    PanGestureHandler,
    State,
} from 'react-native-gesture-handler';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const ORANGE = '#F63B05';
const GREEN = '#32D583';
const MUTED = '#858585';

const MAX_TRANSLATE = 125;
const TRIGGER_DISTANCE = 82;

const getSafeText = (value, fallback = 'Unknown') => {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return fallback;
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number'
  ) {
    return String(value);
  }

  if (typeof value === 'object') {
    const candidates = [
      value.year,
      value.name,
      value.label,
      value.title,
      value.value,
      value.model,
      value.type,
      value.code,
      value.id,
    ];

    const found = candidates.find(
      item =>
        item !== null &&
        item !== undefined &&
        item !== '' &&
        typeof item !== 'object',
    );

    if (
      found !== null &&
      found !== undefined
    ) {
      return String(found);
    }
  }

  return fallback;
};

const getVehicleType = vehicle => {
  const value =
    vehicle?.vehicle_type ??
    vehicle?.vehicleType ??
    vehicle?.type;

  return getSafeText(value, 'Unknown');
};

const getVehicleYear = vehicle => {
  const value =
    vehicle?.vehicle_year ??
    vehicle?.vehicleYear ??
    vehicle?.custom_year ??
    vehicle?.year;

  return getSafeText(value, 'Unknown');
};

const getVehicleBrand = vehicle => {
  const value =
    vehicle?.custom_brand ??
    vehicle?.vehicle_brand ??
    vehicle?.vehicleBrand ??
    vehicle?.brand;

  return getSafeText(value, 'Unknown');
};

const getVehicleModel = vehicle => {
  const value =
    vehicle?.custom_model ??
    vehicle?.vehicle_model ??
    vehicle?.vehicleModel ??
    vehicle?.model;

  return getSafeText(value, 'Unknown');
};

const getVehicleName = vehicle => {
  if (vehicle?.name) {
    return getSafeText(
      vehicle.name,
      'Your Vehicle',
    );
  }

  const brand = getVehicleBrand(vehicle);
  const model = getVehicleModel(vehicle);

  if (
    brand !== 'Unknown' &&
    model !== 'Unknown'
  ) {
    return `${brand} ${model}`;
  }

  if (model !== 'Unknown') {
    return model;
  }

  if (brand !== 'Unknown') {
    return brand;
  }

  return 'Your Vehicle';
};

const getVehicleIconName = vehicle => {
  const type =
    getVehicleType(vehicle).toLowerCase();

  if (
    type.includes('motor') ||
    type.includes('moto') ||
    type.includes('scooter')
  ) {
    return 'motorcycle';
  }

  if (
    type.includes('bicycle') ||
    type.includes('bike') ||
    type.includes('cycle')
  ) {
    return 'directions-bike';
  }

  if (type.includes('bus')) {
    return 'directions-bus';
  }

  if (
    type.includes('truck') ||
    type.includes('van') ||
    type.includes('pickup')
  ) {
    return 'local-shipping';
  }

  return 'directions-car';
};

const vehicleBrandModel = (
  vehicle,
  type,
) => {
  const brand = getVehicleBrand(vehicle);
  const model = getVehicleModel(vehicle);

  if (
    brand !== 'Unknown' &&
    model !== 'Unknown'
  ) {
    return `${brand} ${model}`;
  }

  if (model !== 'Unknown') {
    return model;
  }

  if (brand !== 'Unknown') {
    return brand;
  }

  return type;
};

const VehicleCard = ({
  vehicle,
  theme,

  onPress,
  onSetActive,
  onArchive,
  onRestore,

  isPremium = false,
  isLoading = false,
}) => {
  const translateX = useRef(
    new Animated.Value(0),
  ).current;

  const isArchived = Boolean(
    vehicle?.isArchived ??
      vehicle?.archived_at ??
      vehicle?.archived,
  );

  const isActive = Boolean(
    vehicle?.isActive ??
      vehicle?.is_active ??
      vehicle?.active,
  );

  const vehicleName =
    getVehicleName(vehicle);

  const vehicleYear =
    getVehicleYear(vehicle);

  const vehicleType =
    getVehicleType(vehicle);

  const vehicleIcon =
    getVehicleIconName(vehicle);

  /*
   * ============================================
   * STICKY CARD PHYSICS
   * ============================================
   */

  const cardTranslateX =
    translateX.interpolate({
      inputRange: [
        -MAX_TRANSLATE,
        -80,
        0,
        80,
        MAX_TRANSLATE,
      ],
      outputRange: [
        -MAX_TRANSLATE,
        -74,
        0,
        74,
        MAX_TRANSLATE,
      ],
      extrapolate: 'clamp',
    });

  const cardRotate =
    translateX.interpolate({
      inputRange: [
        -MAX_TRANSLATE,
        0,
        MAX_TRANSLATE,
      ],
      outputRange: [
        '-1.2deg',
        '0deg',
        '1.2deg',
      ],
      extrapolate: 'clamp',
    });

  const cardScale =
    translateX.interpolate({
      inputRange: [
        -MAX_TRANSLATE,
        -60,
        0,
        60,
        MAX_TRANSLATE,
      ],
      outputRange: [
        0.985,
        0.995,
        1,
        0.995,
        0.985,
      ],
      extrapolate: 'clamp',
    });

  /*
   * ============================================
   * ACTION REVEALS
   * ============================================
   *
   * LEFT SWIPE
   * → SET ACTIVE
   *
   * RIGHT SWIPE
   * → ARCHIVE / RESTORE
   */

  const activeReveal =
    translateX.interpolate({
      inputRange: [
        -MAX_TRANSLATE,
        -TRIGGER_DISTANCE,
        -20,
        0,
      ],
      outputRange: [
        1,
        0.82,
        0.25,
        0,
      ],
      extrapolate: 'clamp',
    });

  const archiveReveal =
    translateX.interpolate({
      inputRange: [
        0,
        20,
        TRIGGER_DISTANCE,
        MAX_TRANSLATE,
      ],
      outputRange: [
        0,
        0.25,
        0.82,
        1,
      ],
      extrapolate: 'clamp',
    });

  const activeActionScale =
    translateX.interpolate({
      inputRange: [
        -MAX_TRANSLATE,
        -TRIGGER_DISTANCE,
        0,
      ],
      outputRange: [
        1,
        0.92,
        0.7,
      ],
      extrapolate: 'clamp',
    });

  const archiveActionScale =
    translateX.interpolate({
      inputRange: [
        0,
        TRIGGER_DISTANCE,
        MAX_TRANSLATE,
      ],
      outputRange: [
        0.7,
        0.92,
        1,
      ],
      extrapolate: 'clamp',
    });

  /*
   * ============================================
   * GESTURE
   * ============================================
   */

  const handleGestureEvent =
    Animated.event(
      [
        {
          nativeEvent: {
            translationX: translateX,
          },
        },
      ],
      {
        useNativeDriver: true,
      },
    );

  const resetCard = () => {
    Animated.spring(translateX, {
      toValue: 0,
      tension: 75,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handleStateChange = event => {
    const {
      state,
      translationX,
    } = event.nativeEvent;

    if (state !== State.END) {
      return;
    }

    /*
     * ==========================================
     * SWIPE LEFT
     * SET ACTIVE
     * ==========================================
     */

    if (
      translationX < -TRIGGER_DISTANCE
    ) {
      if (
        !isArchived &&
        !isActive &&
        isPremium &&
        onSetActive
      ) {
        Animated.spring(translateX, {
          toValue: -MAX_TRANSLATE,
          tension: 80,
          friction: 12,
          useNativeDriver: true,
        }).start(() => {
          onSetActive(vehicle);
          resetCard();
        });

        return;
      }

      resetCard();
      return;
    }

    /*
     * ==========================================
     * SWIPE RIGHT
     * ARCHIVE / RESTORE
     * ==========================================
     */

    if (
      translationX > TRIGGER_DISTANCE
    ) {
      /*
       * Archived vehicle
       * → Restore
       */

      if (
        isArchived &&
        onRestore
      ) {
        Animated.spring(translateX, {
          toValue: MAX_TRANSLATE,
          tension: 80,
          friction: 12,
          useNativeDriver: true,
        }).start(() => {
          onRestore(vehicle);
          resetCard();
        });

        return;
      }

      /*
       * Normal vehicle
       * → Archive
       */

      if (
        !isArchived &&
        !isActive &&
        isPremium &&
        onArchive
      ) {
        Animated.spring(translateX, {
          toValue: MAX_TRANSLATE,
          tension: 80,
          friction: 12,
          useNativeDriver: true,
        }).start(() => {
          onArchive(vehicle);
          resetCard();
        });

        return;
      }

      resetCard();
      return;
    }

    resetCard();
  };

  return (
    <View style={styles.wrapper}>

      {/* ==========================================
          LEFT ACTION
          RIGHT SWIPE → ARCHIVE / RESTORE
         ========================================== */}

      <View
        pointerEvents="none"
        style={[
          styles.actionLayer,
          styles.leftActionLayer,
        ]}
      >
        <Animated.View
          style={[
            styles.actionContent,
            {
              opacity:
                archiveReveal,

              transform: [
                {
                  translateX:
                    archiveReveal.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-12, 0],
                    }),
                },
                {
                  scale:
                    archiveActionScale,
                },
              ],
            },
          ]}
        >
          <View
            style={[
              styles.actionIcon,
              {
                backgroundColor:
                  theme?.surface ??
                  '#151515',

                borderColor:
                  theme?.border ??
                  '#292929',
              },
            ]}
          >
            <MaterialIcons
              name={
                isArchived
                  ? 'unarchive'
                  : 'archive'
              }
              size={22}
              color={
                theme?.textSecondary ??
                MUTED
              }
            />
          </View>

          <Text
            style={[
              styles.actionTitle,
              {
                color:
                  theme?.text ??
                  '#FFFFFF',
              },
            ]}
          >
            {isArchived
              ? 'Restore'
              : 'Archive'}
          </Text>

          <Text
            style={[
              styles.actionSubtitle,
              {
                color:
                  theme?.textSecondary ??
                  MUTED,
              },
            ]}
          >
            Swipe right
          </Text>
        </Animated.View>
      </View>

      {/* ==========================================
          RIGHT ACTION
          LEFT SWIPE → SET ACTIVE
         ========================================== */}

      {!isArchived && (
        <View
          pointerEvents="none"
          style={[
            styles.actionLayer,
            styles.rightActionLayer,
          ]}
        >
          <Animated.View
            style={[
              styles.actionContent,
              {
                opacity:
                  activeReveal,

                transform: [
                  {
                    translateX:
                      activeReveal.interpolate({
                        inputRange: [0, 1],
                        outputRange: [12, 0],
                      }),
                  },
                  {
                    scale:
                      activeActionScale,
                  },
                ],
              },
            ]}
          >
            <View
              style={[
                styles.actionIcon,
                styles.activeActionIcon,
                {
                  backgroundColor:
                    theme?.accentSoft ??
                    '#25150F',

                  borderColor:
                    theme?.accent ??
                    ORANGE,
                },
              ]}
            >
              <MaterialIcons
                name="check-circle"
                size={22}
                color={
                  theme?.accent ??
                  ORANGE
                }
              />
            </View>

            <Text
              style={[
                styles.actionTitle,
                {
                  color:
                    theme?.accent ??
                    ORANGE,
                },
              ]}
            >
              Set Active
            </Text>

            <Text
              style={[
                styles.actionSubtitle,
                {
                  color:
                    theme?.textSecondary ??
                    MUTED,
                },
              ]}
            >
              Swipe left
            </Text>
          </Animated.View>
        </View>
      )}

      {/* ==========================================
          VEHICLE CARD
         ========================================== */}

      <PanGestureHandler
        onGestureEvent={
          handleGestureEvent
        }
        onHandlerStateChange={
          handleStateChange
        }
        activeOffsetX={[
          -8,
          8,
        ]}
      >
        <Animated.View
          style={[
            styles.cardShadow,
            {
              transform: [
                {
                  translateX:
                    cardTranslateX,
                },
                {
                  rotate: cardRotate,
                },
                {
                  scale: cardScale,
                },
              ],
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.92}
            onPress={() =>
              onPress?.(vehicle)
            }
            style={[
              styles.vehicleCard,
              {
                backgroundColor:
                  theme?.surface ??
                  '#151515',

                borderColor:
                  theme?.border ??
                  '#292929',
              },

              isArchived && {
                backgroundColor:
                  theme?.surfaceAlt ??
                  '#111111',

                borderColor:
                  theme?.border ??
                  '#303030',
              },

              isActive &&
                !isArchived && {
                  backgroundColor:
                    theme?.accentSoft ??
                    '#FEF2ED',

                  borderColor:
                    theme?.accent ??
                    ORANGE,
                },
            ]}
          >

            {/* =====================================
                ACTIVE EDGE
               ===================================== */}

            {isActive &&
              !isArchived && (
                <View
                  style={[
                    styles.activeEdge,
                    {
                      backgroundColor:
                        theme?.accent ??
                        ORANGE,
                    },
                  ]}
                />
              )}

            {/* =====================================
                HEADER
               ===================================== */}

            <View
              style={styles.cardHeader}
            >
              <View
                style={[
                  styles.vehicleIconWrapper,
                  {
                    backgroundColor:
                      theme?.surfaceAlt ??
                      '#1C1C1C',
                  },

                  isActive &&
                    !isArchived && {
                      backgroundColor:
                        theme?.accentSoft ??
                        '#27160F',
                    },
                ]}
              >
                <MaterialIcons
                  name={vehicleIcon}
                  size={28}
                  color={
                    theme?.accent ??
                    ORANGE
                  }
                />
              </View>

              <View
                style={styles.vehicleInfo}
              >
                <View
                  style={styles.nameRow}
                >
                  <Text
                    style={[
                      styles.vehicleName,
                      {
                        color:
                          theme?.text ??
                          '#FFFFFF',
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {vehicleName}
                  </Text>

                  {/* ACTIVE */}

                  {isActive &&
                    !isArchived && (
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor:
                              theme?.statusBadgeBackground ??
                              '#183020',
                          },
                        ]}
                      >
                        <View
                          style={
                            styles.activeDot
                          }
                        />

                        <Text
                          style={[
                            styles.statusText,
                            {
                              color:
                                theme?.success ??
                                GREEN,
                            },
                          ]}
                        >
                          ACTIVE
                        </Text>
                      </View>
                    )}

                  {/* ARCHIVED */}

                  {isArchived && (
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            theme?.surfaceAlt ??
                            '#202020',
                        },
                      ]}
                    >
                      <MaterialIcons
                        name="archive"
                        size={10}
                        color={
                          theme?.textSecondary ??
                          MUTED
                        }
                      />

                      <Text
                        style={[
                          styles.statusText,
                          {
                            color:
                              theme?.textSecondary ??
                              MUTED,
                          },
                        ]}
                      >
                        ARCHIVED
                      </Text>
                    </View>
                  )}
                </View>

                <Text
                  style={[
                    styles.vehicleSubtitle,
                    {
                      color:
                        theme?.textSecondary ??
                        MUTED,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {vehicleBrandModel(
                    vehicle,
                    vehicleType,
                  )}
                </Text>
              </View>

              <View
                style={[
                  styles.chevronWrapper,
                  {
                    backgroundColor:
                      theme?.surfaceAlt ??
                      '#1C1C1C',
                  },
                ]}
              >
                <MaterialIcons
                  name="chevron-right"
                  size={20}
                  color={
                    theme?.textSecondary ??
                    MUTED
                  }
                />
              </View>
            </View>

            {/* =====================================
                VEHICLE DETAILS
                NO ICONS
               ===================================== */}

            <View
              style={styles.detailsRow}
            >
              <Text
                style={[
                  styles.detailLabel,
                  {
                    color:
                      theme?.textSecondary ??
                      MUTED,
                  },
                ]}
              >
                {vehicleYear}
              </Text>

              <View
                style={[
                  styles.detailDivider,
                  {
                    backgroundColor:
                      theme?.border ??
                      '#555555',
                  },
                ]}
              />

              <Text
                style={[
                  styles.detailLabel,
                  {
                    color:
                      theme?.textSecondary ??
                      MUTED,
                  },
                ]}
              >
                {vehicleType}
              </Text>
            </View>

            {/* =====================================
                FOOTER
               ===================================== */}

            <View
              style={[
                styles.cardFooter,
                {
                  borderTopColor:
                    theme?.border ??
                    '#292929',
                },
              ]}
            >
              <View
                style={styles.protectedInfo}
              >
                <View
                  style={[
                    styles.securityIcon,
                    {
                      backgroundColor:
                        theme?.statusBadgeBackground ??
                        '#183020',
                    },
                  ]}
                >
                  <MaterialIcons
                    name="shield"
                    size={12}
                    color={
                      theme?.success ??
                      GREEN
                    }
                  />
                </View>

                <Text
                  style={[
                    styles.protectedText,
                    {
                      color:
                        theme?.textSecondary ??
                        MUTED,
                    },
                  ]}
                >
                  Vehicle profile protected
                </Text>
              </View>

              {/* ACTIVE FOOTER */}

              {isActive &&
                !isArchived && (
                  <View
                    style={
                      styles.footerStatus
                    }
                  >
                    <View
                      style={[
                        styles.footerDot,
                        {
                          backgroundColor:
                            theme?.success ??
                            GREEN,
                        },
                      ]}
                    />

                    <Text
                      style={[
                        styles.footerStatusText,
                        {
                          color:
                            theme?.success ??
                            GREEN,
                        },
                      ]}
                    >
                      In use
                    </Text>
                  </View>
                )}

              {/* ARCHIVED FOOTER */}

              {isArchived && (
                <View
                  style={
                    styles.footerStatus
                  }
                >
                  <MaterialIcons
                    name="archive"
                    size={13}
                    color={
                      theme?.textSecondary ??
                      MUTED
                    }
                  />

                  <Text
                    style={[
                      styles.footerStatusText,
                      {
                        color:
                          theme?.textSecondary ??
                          MUTED,
                      },
                    ]}
                  >
                    Archived
                  </Text>
                </View>
              )}

              {/* SWIPE HINT */}

              {!isArchived &&
                !isActive &&
                isPremium && (
                  <View
                    style={styles.swipeHint}
                  >
                    <MaterialIcons
                      name="swap-horiz"
                      size={15}
                      color={
                        theme?.textSecondary ??
                        MUTED
                      }
                    />

                    <Text
                      style={[
                        styles.swipeHintText,
                        {
                          color:
                            theme?.textSecondary ??
                            MUTED,
                        },
                      ]}
                    >
                      Swipe to manage
                    </Text>
                  </View>
                )}
            </View>

            {/* =====================================
                LOADING
               ===================================== */}

            {isLoading && (
              <View
                style={[
                  styles.loadingOverlay,
                  {
                    backgroundColor:
                      theme?.background ??
                      '#0A0A0A',
                  },
                ]}
              >
                <View
                  style={
                    styles.loadingContent
                  }
                >
                  <View
                    style={[
                      styles.loadingSpinner,
                      {
                        borderColor:
                          theme?.border ??
                          '#292929',

                        borderTopColor:
                          theme?.accent ??
                          ORANGE,
                      },
                    ]}
                  />

                  <Text
                    style={[
                      styles.loadingText,
                      {
                        color:
                          theme?.accent ??
                          ORANGE,
                      },
                    ]}
                  >
                    Updating vehicle...
                  </Text>
                </View>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

const styles = StyleSheet.create({
  /*
   * ============================================
   * WRAPPER
   * ============================================
   */

  wrapper: {
    position: 'relative',
    marginBottom: 14,
  },

  /*
   * ============================================
   * ACTION LAYERS
   * ============================================
   */

  actionLayer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '58%',
    justifyContent: 'center',
  },

  leftActionLayer: {
    left: 0,
    alignItems: 'flex-start',
    paddingLeft: 22,
  },

  rightActionLayer: {
    right: 0,
    alignItems: 'flex-end',
    paddingRight: 22,
  },

  actionContent: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 75,
  },

  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,

    borderWidth: 1,

    alignItems: 'center',
    justifyContent: 'center',
  },

  activeActionIcon: {
    shadowOpacity: 0,
  },

  actionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    marginTop: 6,
  },

  actionSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 8,
    marginTop: 2,
  },

  /*
   * ============================================
   * CARD SHADOW
   * ============================================
   */

  cardShadow: {
    borderRadius: 20,
  },

  /*
   * ============================================
   * VEHICLE CARD
   * ============================================
   */

  vehicleCard: {
    position: 'relative',
    overflow: 'hidden',

    borderWidth: 1,
    borderRadius: 20,

    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 13,

    minHeight: 154,
  },

  activeEdge: {
    position: 'absolute',

    left: 0,
    top: 17,
    bottom: 17,

    width: 3,

    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },

  /*
   * ============================================
   * HEADER
   * ============================================
   */

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  vehicleIconWrapper: {
    width: 54,
    height: 54,

    borderRadius: 16,

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 13,
  },

  vehicleInfo: {
    flex: 1,
    minWidth: 0,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',

    flexShrink: 1,

    gap: 7,
  },

  vehicleName: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 17,
    lineHeight: 21,

    flexShrink: 1,
  },

  vehicleSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,

    marginTop: 4,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',

    minHeight: 19,

    paddingHorizontal: 7,
    paddingVertical: 3,

    borderRadius: 7,
  },

  activeDot: {
    width: 5,
    height: 5,

    borderRadius: 5,

    backgroundColor: GREEN,

    marginRight: 4,
  },

  statusText: {
    fontFamily: 'Inter-SemiBold',

    fontSize: 7,

    letterSpacing: 0.55,
  },

  chevronWrapper: {
    width: 30,
    height: 30,

    borderRadius: 10,

    alignItems: 'center',
    justifyContent: 'center',

    marginLeft: 8,
  },

  /*
   * ============================================
   * DETAILS
   * ============================================
   */

  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',

    marginTop: 15,
  },

  detailLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 9,
  },

  detailDivider: {
    width: 3,
    height: 3,

    borderRadius: 3,

    marginHorizontal: 8,
  },

  /*
   * ============================================
   * FOOTER
   * ============================================
   */

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',

    borderTopWidth: 1,

    marginTop: 13,
    paddingTop: 11,
  },

  protectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',

    flex: 1,
    minWidth: 0,
  },

  securityIcon: {
    width: 23,
    height: 23,

    borderRadius: 8,

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 6,
  },

  protectedText: {
    fontFamily: 'Inter-Regular',
    fontSize: 8.5,
  },

  footerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  footerDot: {
    width: 5,
    height: 5,

    borderRadius: 5,

    marginRight: 5,
  },

  footerStatusText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 8.5,
  },

  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  swipeHintText: {
    fontFamily: 'Inter-Regular',
    fontSize: 8,

    marginLeft: 4,
  },

  /*
   * ============================================
   * LOADING
   * ============================================
   */

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,

    opacity: 0.94,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 20,
  },

  loadingContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingSpinner: {
    width: 26,
    height: 26,

    borderWidth: 2.5,
    borderRadius: 13,

    marginBottom: 8,
  },

  loadingText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
  },
});

export default VehicleCard;
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import RepairShopCard from '../components/RepairShopCard';
import RepairShopDetails from '../components/RepairShopDetails';
import RepairShopMap from '../components/RepairShopMap';
import { useSidebar } from '../context/SidebarContext';
import { useVehicle } from '../context/VehicleContext';
import useRepairShops, { LOCATION_PRESETS } from '../hooks/useRepairShops';
import LocationService from '../services/locationService';
import { useTheme } from '../theme/ThemeContext';

const BRAND = '#F63B05';

const RepairShopsScreen = ({ navigation }) => {
  const { theme, themeName } = useTheme();
  const { openSidebar } = useSidebar();
  const isDark = themeName === 'dark';

  // Get active vehicle context and normalize vehicleType string safely
  const { activeVehicle } = useVehicle();
  const rawVehicleType = activeVehicle?.vehicle_type ?? activeVehicle?.vehicleType ?? activeVehicle?.type;
  const vehicleTypeString = typeof rawVehicleType === 'object' && rawVehicleType !== null
    ? (rawVehicleType.name || rawVehicleType.type || 'car')
    : (typeof rawVehicleType === 'string' ? rawVehicleType : 'car');

  const displayVehicleType = String(vehicleTypeString).toLowerCase();

  // Custom hook consuming LocationService OOP service layer
  const {
    shops,
    loading,
    refreshing,
    acquiringLocation,
    permissionState,
    error,
    userLocation,
    deviceGpsLocation,
    useCurrentGpsLocation,
    selectedShopId,
    setSelectedShopId,
    activeShopModal,
    setActiveShopModal,
    isMapExpanded,
    setIsMapExpanded,
    selectShop,
    setManualLocation,
    requestPermissionAndAcquire,
    acquireFreshLocation,
    reload,
  } = useRepairShops(displayVehicleType);

  // Option selection state: 'find' (Find Nearby Shops) or 'own' (Already Know a Shop)
  const [activeOption, setActiveOption] = useState('find');
  const [locationModalVisible, setLocationModalVisible] = useState(false);

  // Dynamic theme styling
  const option1Bg = activeOption === 'find'
    ? (isDark ? 'rgba(246, 59, 5, 0.14)' : '#FFF4F0')
    : (isDark ? theme.surfaceAlt || '#1C1C1C' : '#F9FAFB');
  const option1Border = activeOption === 'find'
    ? BRAND
    : (isDark ? theme.border || '#292929' : '#E5E7EB');
  const option1IconBg = isDark ? 'rgba(246, 59, 5, 0.22)' : '#FEE4DA';
  const option1IconColor = isDark ? BRAND : '#C2410C';

  const option2Bg = activeOption === 'own'
    ? (isDark ? 'rgba(56, 189, 248, 0.14)' : '#F0F9FF')
    : (isDark ? theme.surfaceAlt || '#1C1C1C' : '#F9FAFB');
  const option2Border = activeOption === 'own'
    ? (isDark ? '#38BDF8' : '#0284C7')
    : (isDark ? theme.border || '#292929' : '#E5E7EB');
  const option2IconBg = isDark ? 'rgba(56, 189, 248, 0.22)' : '#E0F2FE';
  const option2IconColor = isDark ? '#38BDF8' : '#0284C7';

  const proBadgeBg = isDark ? 'rgba(246, 59, 5, 0.16)' : '#FEE4DA';
  const proBadgeColor = isDark ? BRAND : '#C2410C';

  const handleSelectLocationPreset = (preset) => {
    setManualLocation(preset);
    setLocationModalVisible(false);
  };

  const handleSetLocationPin = async (coords) => {
    if (!coords || !coords.latitude || !coords.longitude) return;
    const geocodedName = await LocationService.reverseGeocode(coords.latitude, coords.longitude);
    setManualLocation({
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: 10,
      name: geocodedName || 'Selected Location',
    });
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background || '#0A0A0A' }]}
    >
      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: theme.border || '#292929' }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
          activeOpacity={0.75}
          onPress={() => navigation?.goBack()}
        >
          <Icon name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleBox}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Nearby Repair Shops
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.menuButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
          activeOpacity={0.75}
          onPress={openSidebar}
          accessibilityLabel="Open Sidebar Menu"
        >
          <Icon name="menu" size={22} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* LOCATION PERMISSION OR ACCURACY STATUS BAR */}
      {!userLocation ? (
        <View style={[styles.permissionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.permissionTopRow}>
            <View style={[styles.permissionIconBox, { backgroundColor: isDark ? 'rgba(246, 59, 5, 0.16)' : '#FEE4DA' }]}>
              <Icon name="my-location" size={20} color={BRAND} />
            </View>
            <View style={styles.permissionTextWrap}>
              <Text style={[styles.permissionTitle, { color: theme.text }]} numberOfLines={1}>
                GPS Location Access Needed
              </Text>
              <Text style={[styles.permissionSubtitle, { color: theme.textSecondary }]}>
                VehiCare requires location access to find real repair shops near your position.
              </Text>
            </View>
          </View>
          <View style={styles.permissionActionRow}>
            <TouchableOpacity
              style={styles.grantPermissionBtn}
              activeOpacity={0.7}
              onPress={() => requestPermissionAndAcquire()}
            >
              {acquiringLocation ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="gps-fixed" size={14} color="#FFFFFF" />
                  <Text style={styles.grantPermissionText}>Grant Access</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.manualSelectBtn, { borderColor: theme.border }]}
              activeOpacity={0.7}
              onPress={() => setLocationModalVisible(true)}
            >
              <Icon name="map" size={14} color={theme.text} />
              <Text style={[styles.manualSelectText, { color: theme.text }]}>Select City</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={[styles.locationBar, { backgroundColor: isDark ? theme.surface : '#F3F4F6', borderColor: theme.border }]}>
          <TouchableOpacity
            style={styles.locationBarLeft}
            activeOpacity={0.85}
            onPress={() => setLocationModalVisible(true)}
          >
            <View style={[styles.locationIconWrap, { backgroundColor: isDark ? 'rgba(246, 59, 5, 0.14)' : '#FEE4DA' }]}>
              <Icon name="place" size={15} color={userLocation?.accuracyColor || BRAND} />
            </View>
            <View style={styles.locationTextWrap}>
              <View style={styles.locationLabelRow}>
                <Text style={[styles.locationLabel, { color: theme.textSecondary }]}>
                  {userLocation?.isManual ? 'Preset Location' : 'Verified GPS'}
                </Text>
                {/* ACCURACY STATUS CHIP */}
                {userLocation?.accuracy !== undefined && (
                  <View style={[styles.accuracyChip, { backgroundColor: `${userLocation?.accuracyColor || BRAND}1A` }]}>
                    <View style={[styles.accuracyDot, { backgroundColor: userLocation?.accuracyColor || BRAND }]} />
                    <Text style={[styles.accuracyText, { color: userLocation?.accuracyColor || BRAND }]}>
                      {userLocation?.accuracy}m ({userLocation?.accuracyShortLabel || 'Precise'})
                    </Text>
                  </View>
                )}
              </View>

              <Text style={[styles.locationValue, { color: theme.text }]} numberOfLines={1} ellipsizeMode="tail">
                {acquiringLocation ? 'Acquiring GPS Fix...' : (userLocation?.name || 'Detecting Location...')}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.locationBarRight}>
            {/* REFINE GPS BUTTON */}
            <TouchableOpacity
              style={[styles.refineGpsBtn, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E5E7EB' }]}
              activeOpacity={0.75}
              onPress={() => acquireFreshLocation()}
              disabled={acquiringLocation}
              accessibilityLabel="Refine GPS Location"
            >
              {acquiringLocation ? (
                <ActivityIndicator size="small" color={BRAND} />
              ) : (
                <Icon name="gps-fixed" size={14} color={theme.text} />
              )}
            </TouchableOpacity>

            {/* CHANGE CITY PRESET BUTTON */}
            <TouchableOpacity
              style={[styles.changeLocationChip, { backgroundColor: isDark ? 'rgba(246, 59, 5, 0.14)' : '#FEE4DA' }]}
              activeOpacity={0.85}
              onPress={() => setLocationModalVisible(true)}
            >
              <Text style={[styles.changeLocationText, { color: isDark ? BRAND : '#C2410C' }]}>Change</Text>
              <Icon name="keyboard-arrow-down" size={14} color={isDark ? BRAND : '#C2410C'} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* POOR ACCURACY WARNING BANNER */}
      {userLocation && !userLocation.isGoodAccuracy && !userLocation.isManual && !acquiringLocation && (
        <View style={[styles.accuracyWarningBanner, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FEF3C7', borderColor: '#F59E0B' }]}>
          <Icon name="warning" size={16} color="#F59E0B" />
          <Text style={[styles.accuracyWarningText, { color: isDark ? '#FBBF24' : '#D97706' }]}>
            Location accuracy is low ({userLocation.accuracy}m). Move outdoors or select your city manually for best shop discovery.
          </Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => reload(true)}
            tintColor={BRAND}
            colors={[BRAND]}
          />
        }
      >
        {/* DUAL-PURPOSE REPAIR ASSISTANCE CONTAINER */}
        <View
          style={[
            styles.contextCard,
            {
              backgroundColor: theme.surface || '#151515',
              borderColor: theme.border || '#292929',
            },
          ]}
        >
          <View style={styles.contextHeaderRow}>
            <View style={[styles.proBadge, { backgroundColor: proBadgeBg }]}>
              <Icon name="build" size={13} color={proBadgeColor} />
              <Text style={[styles.proBadgeText, { color: proBadgeColor }]}>
                PROFESSIONAL ASSISTANCE RECOMMENDED
              </Text>
            </View>
          </View>

          <Text style={[styles.contextDescription, { color: theme.textSecondary }]}>
            VehiCare provides an administrator-managed directory of repair shops and uses the user's location to display nearby listed establishments.
          </Text>

          {/* DUAL OPTIONS SELECTION */}
          <View style={styles.dualOptionsGrid}>
            {/* OPTION 1: FIND NEARBY REPAIR SHOPS */}
            <TouchableOpacity
              activeOpacity={0.88}
              style={[
                styles.optionCard,
                {
                  backgroundColor: option1Bg,
                  borderColor: option1Border,
                },
              ]}
              onPress={() => setActiveOption('find')}
            >
              <View style={styles.optionHeaderRow}>
                <View style={[styles.optionIconWrap, { backgroundColor: option1IconBg }]}>
                  <Icon name="near-me" size={18} color={option1IconColor} />
                </View>
                <View style={styles.optionTitleWrap}>
                  <Text style={[styles.optionTag, { color: option1IconColor }]}>OPTION 1</Text>
                  <Text style={[styles.optionTitle, { color: theme.text }]}>
                    Find Nearby Repair Shops
                  </Text>
                </View>
                <View style={[styles.radioOuter, activeOption === 'find' && { borderColor: option1IconColor }]}>
                  {activeOption === 'find' && <View style={[styles.radioInner, { backgroundColor: option1IconColor }]} />}
                </View>
              </View>
              <Text style={[styles.optionDesc, { color: theme.textSecondary }]}>
                Explore listed repair shops near your position matching your vehicle category ({displayVehicleType}).
              </Text>
            </TouchableOpacity>

            {/* OPTION 2: USE A SHOP YOU ALREADY KNOW */}
            <TouchableOpacity
              activeOpacity={0.88}
              style={[
                styles.optionCard,
                {
                  backgroundColor: option2Bg,
                  borderColor: option2Border,
                },
              ]}
              onPress={() => setActiveOption('own')}
            >
              <View style={styles.optionHeaderRow}>
                <View style={[styles.optionIconWrap, { backgroundColor: option2IconBg }]}>
                  <Icon name="verified-user" size={18} color={option2IconColor} />
                </View>
                <View style={styles.optionTitleWrap}>
                  <Text style={[styles.optionTag, { color: option2IconColor }]}>OPTION 2</Text>
                  <Text style={[styles.optionTitle, { color: theme.text }]}>
                    Already know a repair shop?
                  </Text>
                </View>
                <View style={[styles.radioOuter, activeOption === 'own' && { borderColor: option2IconColor }]}>
                  {activeOption === 'own' && <View style={[styles.radioInner, { backgroundColor: option2IconColor }]} />}
                </View>
              </View>
              <Text style={[styles.optionDesc, { color: theme.textSecondary }]}>
                If you already have a trusted repair shop nearby, you can visit them directly for assistance.
              </Text>
            </TouchableOpacity>
          </View>

          {/* SUBTLE AFFILIATION DISCLAIMER */}
          <View style={[styles.disclaimerRow, { borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E5E7EB' }]}>
            <Icon name="info-outline" size={13} color={theme.textSecondary} />
            <Text style={[styles.disclaimerText, { color: theme.textSecondary }]}>
              VehiCare provides an administrator-managed directory of repair shops. Listed establishments are independent and not affiliated with or sponsored by VehiCare.
            </Text>
          </View>
        </View>

        {/* CONDITIONALLY RENDER CONTENT BASED ON SELECTED OPTION */}
        {activeOption === 'find' ? (
          <>
            {/* MAP AREA */}
            <RepairShopMap
              shops={shops}
              userLocation={userLocation}
              deviceGpsLocation={deviceGpsLocation}
              selectedShopId={selectedShopId}
              onSelectShop={selectShop}
              onSetLocationPin={handleSetLocationPin}
              onRecenterGps={useCurrentGpsLocation}
              isExpanded={isMapExpanded}
              onToggleExpand={() => setIsMapExpanded(prev => !prev)}
            />

            {/* NEARBY SHOPS SECTION HEADER */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Nearby Repair Shops
              </Text>
              <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                {shops.length} repair shops found near {userLocation?.name || 'your location'}
              </Text>
            </View>

            {/* LOADING STATE */}
            {loading && !refreshing && (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={BRAND} />
                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                  Acquiring location & finding repair shops...
                </Text>
              </View>
            )}

            {/* ERROR STATE */}
            {error && !loading && (
              <View style={[styles.errorBox, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEE2E2', borderColor: '#EF4444' }]}>
                <Icon name="error-outline" size={20} color="#EF4444" />
                <Text style={[styles.errorText, { color: isDark ? '#FCA5A5' : '#991B1B' }]}>
                  {error}
                </Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => reload()}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* EMPTY STATE */}
            {!loading && !error && shops.length === 0 && (
              <View style={[styles.emptyBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Icon name="location-off" size={32} color={theme.textSecondary} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>
                  No Listed Repair Shops Found
                </Text>
                <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                  No listed repair shops were found within 10 km of your selected location.
                </Text>
                <TouchableOpacity style={styles.reloadBtn} onPress={() => reload()}>
                  <Text style={styles.reloadBtnText}>Search Again</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* REPAIR SHOP CARDS LIST */}
            {!loading && !error && shops.map((shop) => (
              <RepairShopCard
                key={shop.id}
                shop={shop}
                isSelected={selectedShopId === shop.id}
                onPressCard={selectShop}
              />
            ))}
          </>
        ) : (
          /* OPTION 2: INFORMATIONAL TRUSTED SHOP GUIDANCE CARD */
          <View
            style={[
              styles.trustedShopGuidanceCard,
              {
                backgroundColor: theme.surface || '#151515',
                borderColor: theme.border || '#292929',
              },
            ]}
          >
            <View style={styles.guidanceHeader}>
              <View style={[styles.guidanceIconBox, { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.14)' : '#E0F2FE' }]}>
                <Icon name="storefront" size={24} color={isDark ? '#38BDF8' : '#0284C7'} />
              </View>
              <View style={styles.guidanceTitleWrap}>
                <Text style={[styles.guidanceTitle, { color: theme.text }]}>
                  Visit Your Trusted Repair Shop
                </Text>
                <Text style={[styles.guidanceSubtitle, { color: theme.textSecondary }]}>
                  Independent Assistance
                </Text>
              </View>
            </View>

            <Text style={[styles.guidanceBodyText, { color: theme.textSecondary }]}>
              You are free to seek assistance from any repair technician or service facility you already know and trust.
            </Text>

            <View style={[styles.guidanceNoticeBox, { backgroundColor: isDark ? (theme.surfaceAlt || '#1C1C1C') : '#F3F4F6' }]}>
              <Icon name="check-circle-outline" size={18} color={isDark ? '#32D583' : '#16A34A'} />
              <Text style={[styles.guidanceNoticeText, { color: theme.text }]}>
                VehiCare repair-shop discovery is optional and purely informational. VehiCare does not require, endorse, or partner with specific repair shops.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.switchOptionBtn, { backgroundColor: isDark ? 'rgba(246, 59, 5, 0.12)' : '#FEE4DA' }]}
              activeOpacity={0.8}
              onPress={() => setActiveOption('find')}
            >
              <Icon name="map" size={16} color={isDark ? BRAND : '#C2410C'} />
              <Text style={[styles.switchOptionText, { color: isDark ? BRAND : '#C2410C' }]}>
                Explore Nearby Shops Instead
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* LOCATION PRESET SELECTION MODAL */}
      <Modal
        visible={locationModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLocationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setLocationModalVisible(false)}
          />
          <View style={[styles.locationModalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.locationModalHeader, { borderBottomColor: theme.border }]}>
              <View>
                <Text style={[styles.locationModalTitle, { color: theme.text }]}>Select Your Location</Text>
                <Text style={[styles.locationModalSubtitle, { color: theme.textSecondary }]}>
                  Choose a location to find nearby repair shops
                </Text>
              </View>
              <TouchableOpacity onPress={() => setLocationModalVisible(false)}>
                <Icon name="close" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.presetList} showsVerticalScrollIndicator={false}>
              {LOCATION_PRESETS.map((preset) => {
                const isSelected = userLocation?.name === preset.name;
                return (
                  <TouchableOpacity
                    key={preset.id}
                    style={[
                      styles.presetItem,
                      {
                        backgroundColor: isSelected
                          ? (isDark ? 'rgba(246, 59, 5, 0.16)' : '#FEE4DA')
                          : (isDark ? theme.background : '#F9FAFB'),
                        borderColor: isSelected ? BRAND : (theme.border || '#E5E7EB'),
                      },
                    ]}
                    activeOpacity={0.8}
                    onPress={() => handleSelectLocationPreset(preset)}
                  >
                    <View style={styles.presetLeft}>
                      <Icon
                        name="place"
                        size={20}
                        color={isSelected ? (isDark ? BRAND : '#C2410C') : theme.textSecondary}
                      />
                      <Text
                        style={[
                          styles.presetName,
                          { color: isSelected ? (isDark ? BRAND : '#C2410C') : theme.text },
                        ]}
                      >
                        {preset.name}
                      </Text>
                    </View>
                    {isSelected && <Icon name="check-circle" size={18} color={isDark ? BRAND : '#C2410C'} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* SHOP DETAILS MODAL */}
      <RepairShopDetails
        visible={Boolean(activeShopModal)}
        shop={activeShopModal}
        onClose={() => setActiveShopModal(null)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleBox: {
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
  },
  menuButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionCard: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    overflow: 'hidden',
  },
  permissionTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  permissionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  permissionTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  permissionTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
  },
  permissionSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    lineHeight: 16,
  },
  permissionActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  grantPermissionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: BRAND,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    flex: 1,
  },
  grantPermissionText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  manualSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
  },
  manualSelectText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 12,
  },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  locationBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
    marginRight: 6,
  },
  locationIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  locationTextWrap: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  locationLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'nowrap',
  },
  locationLabel: {
    fontFamily: 'Inter-Bold',
    fontSize: 8.5,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    flexShrink: 0,
  },
  accuracyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
    flexShrink: 0,
  },
  accuracyDot: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.25,
    flexShrink: 0,
  },
  accuracyText: {
    fontFamily: 'Inter-Bold',
    fontSize: 8.5,
  },
  locationValue: {
    fontFamily: 'Outfit-Bold',
    fontSize: 12.5,
    marginTop: 1,
  },
  locationBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 0,
  },
  refineGpsBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeLocationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 7,
  },
  changeLocationText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 10.5,
  },
  accuracyWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  accuracyWarningText: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    lineHeight: 15,
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  contextCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginTop: 14,
  },
  contextHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexShrink: 1,
  },
  proBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  contextDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  dualOptionsGrid: {
    gap: 10,
  },
  optionCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
  },
  optionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  optionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitleWrap: {
    flex: 1,
  },
  optionTag: {
    fontFamily: 'Inter-Bold',
    fontSize: 8,
    letterSpacing: 0.6,
  },
  optionTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    marginTop: 1,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  optionDesc: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    lineHeight: 16,
  },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  disclaimerText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    flex: 1,
  },
  sectionHeader: {
    marginTop: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 17,
  },
  sectionSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    marginTop: 2,
  },
  centerContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
  },
  errorBox: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginVertical: 12,
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryButton: {
    backgroundColor: BRAND,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  emptyBox: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    marginVertical: 12,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
  },
  emptySubtext: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    textAlign: 'center',
  },
  reloadBtn: {
    backgroundColor: BRAND,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  reloadBtnText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  trustedShopGuidanceCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginTop: 14,
    gap: 14,
  },
  guidanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  guidanceIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guidanceTitleWrap: {
    flex: 1,
  },
  guidanceTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
  },
  guidanceSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    marginTop: 1,
  },
  guidanceBodyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  guidanceNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 12,
  },
  guidanceNoticeText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  switchOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    marginTop: 4,
  },
  switchOptionText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  locationModalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '75%',
  },
  locationModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  locationModalTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
  },
  locationModalSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    marginTop: 2,
  },
  presetList: {
    padding: 20,
    gap: 10,
  },
  presetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  presetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  presetName: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
  },
});

export default RepairShopsScreen;

import React from 'react';
import {
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../theme/ThemeContext';

const BRAND = '#F63B05';

/**
 * RepairShopDetails Component
 * Modal bottom sheet displaying detailed OpenStreetMap repair shop reference information
 * and native map directions launch.
 */
const RepairShopDetails = ({
  visible = false,
  shop = null,
  onClose = () => {},
}) => {
  const { theme, themeName } = useTheme();
  const isDark = themeName === 'dark';

  if (!shop) return null;

  const verifiedBg = isDark ? 'rgba(50, 213, 131, 0.12)' : '#DCFCE7';
  const verifiedTextColor = isDark ? '#32D583' : '#16A34A';

  const categoryBg = isDark ? 'rgba(246, 59, 5, 0.12)' : '#FEE4DA';
  const categoryTextColor = isDark ? BRAND : '#C2410C';

  const iconColor = isDark ? BRAND : '#C2410C';

  const distanceText = shop.distance_formatted || (shop.distance_km ? `${shop.distance_km} km` : '1.2 km');

  const rawCategory = shop.vehicle_category;
  const categoryString = typeof rawCategory === 'object' && rawCategory !== null
    ? (rawCategory.name || rawCategory.type || 'CAR & VEHICLE REPAIR')
    : (rawCategory ? String(rawCategory) : 'CAR & VEHICLE REPAIR');

  const handleOpenDirections = () => {
    const lat = shop.latitude;
    const lng = shop.longitude;
    const label = encodeURIComponent(shop.name || 'Repair Shop');

    if (!lat || !lng) return;

    const latLng = `${lat},${lng}`;
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${latLng}`,
      android: `geo:0,0?q=${latLng}(${label})`,
    });

    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latLng}`);
    });
  };

  const handleCallShop = () => {
    if (shop.phone) {
      Linking.openURL(`tel:${shop.phone}`).catch(err => console.warn('Cannot open dialer:', err));
    }
  };

  const handleOpenWebsite = () => {
    if (shop.website) {
      const url = shop.website.startsWith('http') ? shop.website : `https://${shop.website}`;
      Linking.openURL(url).catch(err => console.warn('Cannot open website:', err));
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: theme.surface || '#151515',
              borderColor: theme.border || '#292929',
            },
          ]}
        >
          {/* Header Bar */}
          <View style={[styles.header, { borderBottomColor: theme.border || '#292929' }]}>
            <View style={styles.titleWrap}>
              <View style={styles.nameRow}>
                <Text style={[styles.shopName, { color: theme.text }]} numberOfLines={1}>
                  {shop.name}
                </Text>
                {shop.verified && (
                  <View style={[styles.verifiedBadge, { backgroundColor: verifiedBg }]}>
                    <Icon name="check" size={11} color={verifiedTextColor} />
                    <Text style={[styles.verifiedText, { color: verifiedTextColor }]}>Verified</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.metaSubtitle, { color: theme.textSecondary }]}>
                {distanceText} away • VehiCare Repair Directory
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: theme.background }]}
              onPress={onClose}
            >
              <Icon name="close" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Category Badge */}
            <View style={styles.badgeRow}>
              <View style={[styles.categoryBadge, { backgroundColor: categoryBg }]}>
                <Icon name="directions-car" size={13} color={categoryTextColor} />
                <Text style={[styles.categoryBadgeText, { color: categoryTextColor }]}>
                  {categoryString.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Address Section */}
            <View style={[styles.infoBlock, { backgroundColor: isDark ? theme.background : '#F9FAFB' }]}>
              <Text style={[styles.blockTitle, { color: theme.textSecondary }]}>
                LOCATION / ADDRESS
              </Text>
              <View style={styles.infoLine}>
                <Icon name="place" size={16} color={iconColor} />
                <Text style={[styles.infoText, { color: theme.text }]}>
                  {shop.address || 'Near current location coordinates'}
                </Text>
              </View>
            </View>

            {/* Contact & Hours Section */}
            <View style={[styles.infoBlock, { backgroundColor: isDark ? theme.background : '#F9FAFB' }]}>
              <Text style={[styles.blockTitle, { color: theme.textSecondary }]}>
                CONTACT & OPENING HOURS
              </Text>
              
              <View style={styles.infoLine}>
                <Icon name="access-time" size={16} color={iconColor} />
                <Text style={[styles.infoText, { color: theme.text }]}>
                  {shop.opening_hours || 'Opening hours not listed'}
                </Text>
              </View>

              {shop.phone && (
                <TouchableOpacity style={[styles.infoLine, { marginTop: 8 }]} onPress={handleCallShop}>
                  <Icon name="phone" size={16} color={iconColor} />
                  <Text style={[styles.infoText, { color: BRAND }]}>
                    {shop.phone} (Tap to call)
                  </Text>
                </TouchableOpacity>
              )}

              {shop.website && (
                <TouchableOpacity style={[styles.infoLine, { marginTop: 8 }]} onPress={handleOpenWebsite}>
                  <Icon name="language" size={16} color={iconColor} />
                  <Text style={[styles.infoText, { color: BRAND }]} numberOfLines={1}>
                    {shop.website}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* QUICK DIRECTIONS ACTION BUTTON */}
            <TouchableOpacity
              style={styles.directionsBtn}
              activeOpacity={0.85}
              onPress={handleOpenDirections}
            >
              <Icon name="directions" size={18} color="#FFFFFF" />
              <Text style={styles.directionsBtnText}>
                Get Directions in Maps App
              </Text>
            </TouchableOpacity>

            {/* General Reference Info */}
            <Text style={[styles.sectionHeading, { color: theme.text }]}>
              Directory Establishment Information
            </Text>
            <Text style={[styles.generalInfoText, { color: theme.textSecondary }]}>
              This repair shop is listed in the administrator-managed VehiCare repair shop directory. Coordinates: {Number(shop.latitude).toFixed(4)}, {Number(shop.longitude).toFixed(4)}.
            </Text>

            {/* MANDATORY DISCLAIMER */}
            <View style={[styles.disclaimerBox, { borderColor: theme.border || '#292929', backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F9FAFB' }]}>
              <Icon name="info" size={15} color={theme.textSecondary} style={{ marginTop: 1 }} />
              <Text style={[styles.disclaimerText, { color: theme.textSecondary }]}>
                VehiCare provides an administrator-managed directory of repair shops and uses the user's location to display nearby listed establishments. Listed shops are independent third parties.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '82%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  titleWrap: {
    flex: 1,
    marginRight: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shopName: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    flex: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedText: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
  },
  metaSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    marginTop: 2,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyContent: {
    padding: 20,
    paddingBottom: 36,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  infoBlock: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  blockTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  infoLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    flex: 1,
  },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BRAND,
    paddingVertical: 12,
    borderRadius: 12,
    marginVertical: 10,
  },
  directionsBtnText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  sectionHeading: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    marginTop: 10,
    marginBottom: 6,
  },
  generalInfoText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
  },
  disclaimerText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
});

export default RepairShopDetails;

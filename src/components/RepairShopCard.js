import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../theme/ThemeContext';

const BRAND = '#F63B05';

/**
 * RepairShopCard Component
 * Displays summary information for a single repair shop retrieved from OpenStreetMap / VehiCare backend.
 */
const RepairShopCard = ({
  shop,
  isSelected = false,
  onPressCard = () => {},
}) => {
  const { theme, themeName } = useTheme();
  const isDark = themeName === 'dark';

  if (!shop) return null;

  const logoBg = isDark ? 'rgba(246, 59, 5, 0.14)' : '#FEE4DA';
  const logoIconColor = isDark ? BRAND : '#C2410C';

  const verifiedBg = isDark ? 'rgba(50, 213, 131, 0.12)' : '#DCFCE7';
  const verifiedTextColor = isDark ? '#32D583' : '#16A34A';

  const serviceChipBg = isDark ? (theme.surfaceAlt || '#1C1C1C') : '#F3F4F6';
  const serviceTextColor = isDark ? theme.textSecondary : '#374151';

  const distanceText = shop.distance_formatted || (shop.distance_km ? `${shop.distance_km} km` : (shop.distance || '1.2 km'));

  const rawCategory = shop.vehicle_category;
  const categoryString = typeof rawCategory === 'object' && rawCategory !== null
    ? (rawCategory.name || rawCategory.type || 'ALL VEHICLES')
    : (rawCategory ? String(rawCategory) : 'ALL VEHICLES');

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      style={[
        styles.card,
        {
          backgroundColor: theme.surface || '#151515',
          borderColor: isSelected ? BRAND : (theme.border || '#292929'),
        },
      ]}
      onPress={() => onPressCard(shop)}
    >
      {/* Top Header Row */}
      <View style={styles.headerRow}>
        <View style={[styles.shopLogoBadge, { backgroundColor: logoBg }]}>
          <Icon name="build" size={18} color={logoIconColor} />
        </View>

        <View style={styles.titleMetaWrap}>
          <View style={styles.nameVerifiedRow}>
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

          {/* Vehicle Category Badge */}
          <View style={styles.categoryTag}>
            <Icon name="directions-car" size={11} color={theme.textSecondary} />
            <Text style={[styles.categoryText, { color: theme.textSecondary }]}>
              {categoryString.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Distance Badge */}
        <View style={[styles.distanceBadge, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F3F4F6' }]}>
          <Icon name="near-me" size={12} color={isDark ? BRAND : '#C2410C'} />
          <Text style={[styles.distanceText, { color: theme.text }]}>
            {distanceText}
          </Text>
        </View>
      </View>

      {/* Services / Tags Row */}
      <View style={styles.servicesWrap}>
        <View style={[styles.serviceChip, { backgroundColor: serviceChipBg }]}>
          <Text style={[styles.serviceText, { color: serviceTextColor }]}>
            Source: Managed Directory
          </Text>
        </View>
        {shop.phone && (
          <View style={[styles.serviceChip, { backgroundColor: serviceChipBg }]}>
            <Icon name="phone" size={10} color={serviceTextColor} style={{ marginRight: 3 }} />
            <Text style={[styles.serviceText, { color: serviceTextColor }]}>
              Contact Available
            </Text>
          </View>
        )}
      </View>

      {/* Address Snippet Footer */}
      <View style={[styles.cardFooter, { borderTopColor: theme.border || '#292929' }]}>
        <View style={styles.addressLine}>
          <Icon name="place" size={13} color={theme.textSecondary} />
          <Text style={[styles.addressText, { color: theme.textSecondary }]} numberOfLines={1}>
            {shop.address || 'Near location'}
          </Text>
        </View>
        <Icon name="chevron-right" size={18} color={theme.textSecondary} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  shopLogoBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleMetaWrap: {
    flex: 1,
  },
  nameVerifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  shopName: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
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
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  categoryText: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  distanceText: {
    fontFamily: 'Inter-Bold',
    fontSize: 11,
  },
  servicesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  serviceText: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  addressLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    marginRight: 8,
  },
  addressText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    flex: 1,
  },
});

export default RepairShopCard;

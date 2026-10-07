import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { vehicleApi } from '../api/vehicleApi';
import { useTheme } from '../theme/ThemeContext';

const ORANGE = '#F63B05';

const NearbyShopsModal = ({
  visible,
  onClose,
  diagnosticId,
  vehicleTypeInput = 'car',
  onReferralSuccess,
}) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [shops, setShops] = useState([]);
  const [selectedShopId, setSelectedShopId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const vehicleType = typeof vehicleTypeInput === 'object' && vehicleTypeInput !== null
    ? (vehicleTypeInput.name || vehicleTypeInput.type || 'car')
    : String(vehicleTypeInput || 'car');

  useEffect(() => {
    if (visible) {
      fetchNearbyShops();
    }
  }, [visible, vehicleType]);

  const requestLocationPermission = async () => {
    if (Platform.OS !== 'android') return true;

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'VehiCare needs access to your location to find nearby repair shops.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('Location permission error:', err);
      return false;
    }
  };

  const fetchNearbyShops = async () => {
    setLoading(true);
    await requestLocationPermission();

    try {
      const results = await vehicleApi.getNearbyShops({
        vehicle_type: vehicleType,
        latitude: 14.6507,
        longitude: 121.0315,
      });

      setShops(Array.isArray(results) ? results : []);
    } catch (error) {
      console.warn('Failed to fetch nearby shops:', error?.message);
      Alert.alert('Error', 'Unable to fetch nearby repair shops. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectShop = async (shop) => {
    setSelectedShopId(shop.id);
    setSubmitting(true);

    try {
      await vehicleApi.createServiceReferral({
        diagnostic_id: diagnosticId || null,
        repair_shop_id: shop.id,
        shop_name: shop.name,
        shop_address: shop.address,
        shop_phone: shop.phone_number,
        is_custom_shop: false,
        notes: `Selected from AI Diagnostic recommendation for ${vehicleType}`,
      });

      Alert.alert(
        'Referral Confirmed!',
        `Your repair request has been referred to ${shop.name}. They will be notified of your diagnosis.`,
        [
          {
            text: 'OK',
            onPress: () => {
              onClose();
              if (onReferralSuccess) onReferralSuccess(shop);
            },
          },
        ],
      );
    } catch (error) {
      console.error('Service referral creation error:', error);
      Alert.alert('Error', error?.response?.data?.message || 'Failed to create service referral.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderShopItem = ({ item }) => {
    const isSelected = selectedShopId === item.id;
    const rawCategory = item.vehicle_category;
    const categoryString = typeof rawCategory === 'object' && rawCategory !== null
      ? (rawCategory.name || rawCategory.type || 'VEHICLE')
      : (rawCategory ? String(rawCategory) : 'VEHICLE');

    return (
      <View style={[styles.shopCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.shopCardHeader}>
          <View style={styles.titleWrap}>
            <View style={styles.nameRow}>
              <Text style={[styles.shopName, { color: theme.text }]} numberOfLines={1}>
                {item.name}
              </Text>
              {item.is_certified && (
                <View style={styles.certifiedBadge}>
                  <Icon name="verified" size={13} color={ORANGE} />
                  <Text style={styles.certifiedText}>CERTIFIED</Text>
                </View>
              )}
            </View>

            <Text style={[styles.categoryTag, { color: theme.textSecondary }]}>
              {categoryString.toUpperCase()} REPAIR CENTER
            </Text>
          </View>

          <View style={styles.ratingBadge}>
            <Icon name="star" size={14} color="#F59E0B" />
            <Text style={styles.ratingText}>{item.rating?.toFixed(1) || '4.8'}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Icon name="place" size={15} color={ORANGE} />
          <Text style={[styles.infoText, { color: theme.textSecondary }]} numberOfLines={1}>
            {item.address}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.distanceBadge}>
            <Icon name="near-me" size={13} color={ORANGE} />
            <Text style={styles.distanceText}>{item.distance_km || '1.2'} km away</Text>
          </View>

          {item.phone_number ? (
            <Text style={[styles.phoneText, { color: theme.textSecondary }]}>
              {item.phone_number}
            </Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.selectBtn, { backgroundColor: ORANGE }]}
          onPress={() => handleSelectShop(item)}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting && isSelected ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Icon name="handshake" size={18} color="#FFFFFF" />
              <Text style={styles.selectBtnText}>Select & Send Referral</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: theme.modalOverlay }]}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <SafeAreaView style={[styles.modalCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <View>
              <Text style={[styles.headerTitle, { color: theme.text }]}>Nearby Repair Shops</Text>
              <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                Based on your current location & vehicle type
              </Text>
            </View>

            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: theme.surface }]} onPress={onClose}>
              <Icon name="close" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={ORANGE} />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                Locating nearby certified repair centers...
              </Text>
            </View>
          ) : (
            <FlatList
              data={shops}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderShopItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Icon name="storefront" size={40} color={ORANGE} />
                  <Text style={[styles.emptyTitle, { color: theme.text }]}>No Repair Shops Found</Text>
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    No registered repair shops match your exact search criteria right now.
                  </Text>
                </View>
              }
            />
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
  },
  headerSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingWrap: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    marginTop: 12,
  },
  listContent: {
    padding: 20,
  },
  shopCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  shopCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleWrap: {
    flex: 1,
    marginRight: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  shopName: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
  },
  certifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(246, 59, 5, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 99,
  },
  certifiedText: {
    fontFamily: 'Inter-Bold',
    fontSize: 8,
    color: ORANGE,
  },
  categoryTag: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
    marginTop: 3,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 15, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: {
    fontFamily: 'Inter-Bold',
    fontSize: 11,
    color: '#F59E0B',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  infoText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: ORANGE,
  },
  phoneText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
  },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 14,
    gap: 8,
  },
  selectBtnText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  emptyWrap: {
    padding: 30,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    marginTop: 12,
  },
  emptyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
  },
});

export default NearbyShopsModal;

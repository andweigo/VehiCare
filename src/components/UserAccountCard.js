import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import {
    Image,
    Modal,
    Pressable,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../theme/ThemeContext';

const UserAccountCard = ({
  username = 'Andrei Obligar',
  email = 'andrei@gmail.com',
  handle = '@vehicare',
  plan = 'FREE',
  avatar,
  verified = true,
  darkMode = true,
  onToggleDarkMode,
  onAddAccount,
  onLogout,
}) => {
  const navigation = useNavigation();
  const { theme, themeName } = useTheme();

  const [visible, setVisible] = useState(false);
  const isDark = themeName === 'dark';

  const closeModal = () => {
    setVisible(false);
  };

  const openProfile = () => {
    closeModal();
    navigation.navigate('Profile');
  };

  const openSettings = () => {
    closeModal();
    navigation.navigate('Settings');
  };

  const openPremium = () => {
    closeModal();
    navigation.navigate('Premium');
  };

  const openVehicles = () => {
    closeModal();
    navigation.navigate('Vehicles');
  };

  const openHelp = () => {
    closeModal();
    // navigate at the topmost navigator so HelpSupport route is handled
    let root = navigation;
    while (root && root.getParent && root.getParent() && root.getParent() !== root) {
      const p = root.getParent();
      if (!p) break;
      root = p;
    }

    if (root && root.navigate) root.navigate('HelpSupport');
    else navigation.navigate('HelpSupport');
  };

  const openAddAccount = () => {
    closeModal();

    if (onAddAccount) {
      onAddAccount();
    } else {
      navigation.navigate('AddAccount');
    }
  };

  const handleLogout = () => {
    closeModal();

    if (onLogout) {
      onLogout();
    }
  };

  const handleToggleDarkMode = value => {
    if (onToggleDarkMode) {
      onToggleDarkMode(value);
    }
  };

  const renderAvatar = (uri, name, size, textSize) => (
    <View
      style={[
        styles.avatarBase,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.surface,
        },
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
          }}
        />
      ) : (
        <Text
          style={[
            styles.avatarText,
            {
              fontSize: textSize,
            },
          ]}
        >
          {name?.charAt(0)?.toUpperCase() || 'U'}
        </Text>
      )}
    </View>
  );

  return (
    <>
      {/* =========================================================
          CLOSED USER ACCOUNT CARD
          ========================================================= */}
      <TouchableOpacity
        activeOpacity={0.75}
        style={[styles.card, { backgroundColor: theme.surfaceAlt }]}
        onPress={() => setVisible(true)}
      >
        {renderAvatar(avatar, username, 40, 16)}

        <View style={styles.userInfo}>
          <Text
            style={[styles.username, { color: theme.text }]}
            numberOfLines={1}
          >
            {username}
          </Text>

          <Text
            style={[styles.email, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {email}
          </Text>
        </View>

<View style={[styles.planBadge, { backgroundColor: theme.accentSoft, borderColor: theme.accentSoft }]}> 
          <Text style={[styles.planText, { color: theme.accent }]}>
            {plan}
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={18}
          color={theme.textSecondary}
        />
      </TouchableOpacity>

      {/* =========================================================
          ACCOUNT MENU MODAL
          ========================================================= */}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <Pressable
          style={[styles.overlay, { backgroundColor: theme.overlay }]}
          onPress={closeModal}
        >
          <Pressable
            style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={e => e.stopPropagation()}
          >
            {/* =====================================================
                HEADER
                ===================================================== */}
            <View style={styles.headerRow}>
              {renderAvatar(avatar, username, 40, 16)}

              <View style={styles.headerInfo}>
                <View style={styles.headerNameRow}>
                  <Text
                    style={[styles.headerUsername, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {username}
                  </Text>

                  {verified && (
                    <View style={styles.verifiedBadge}>
                      <Ionicons
                        name="checkmark"
                        size={11}
                        color={theme.surface}
                      />
                    </View>
                  )}
                </View>

                <Text
                  style={[styles.headerHandle, { color: theme.textSecondary }]}
                  numberOfLines={1}
                >
                  {email}
                </Text>
              </View>

              {/* LOGOUT */}
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: theme.accentSoft }]}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="log-out-outline"
                  size={18}
                  color={theme.accent}
                />
              </TouchableOpacity>
            </View>

            {/* =====================================================
                PROFILE
                ===================================================== */}
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={openProfile}
              activeOpacity={0.7}
            >
              <View style={styles.sectionLeft}>
                <View style={[styles.iconContainer, { backgroundColor: theme.accentSoft }]}> 
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color={theme.accent}
                  />
                </View>

                <View>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    Profile
                  </Text>

                  <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                    View and edit your profile
                  </Text>
                </View>
              </View>

              <Ionicons
                name="chevron-forward"
                size={18}
                color="#F63B05"
              />
            </TouchableOpacity>

            {/* =====================================================
                SETTINGS
                ===================================================== */}
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={openSettings}
              activeOpacity={0.7}
            >
              <View style={styles.sectionLeft}>
                <View style={[styles.iconContainer, { backgroundColor: theme.accentSoft }]}> 
                  <Ionicons
                    name="settings-outline"
                    size={18}
                    color={theme.accent}
                  />
                </View>

                <View>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    Settings
                  </Text>

                  <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                    Manage your VehiCare preferences
                  </Text>
                </View>
              </View>

              <Ionicons
                name="chevron-forward"
                size={18}
                color="#F63B05"
              />
            </TouchableOpacity>

            {/* =====================================================
                PREMIUM
                ===================================================== */}
            {plan.toUpperCase() !== 'PREMIUM' && (
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={openPremium}
                activeOpacity={0.7}
              >
                <View style={styles.sectionLeft}>
<View style={[styles.iconContainer, { backgroundColor: theme.accentSoft }]}> 
                  <Ionicons
                    name="star-outline"
                    size={18}
                    color={theme.accent}
                    />
                  </View>

                  <View>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>
                      VehiCare Premium
                    </Text>

                    <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                      Unlock more vehicle care features
                    </Text>
                  </View>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color="#F63B05"
                />
              </TouchableOpacity>
            )}

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            {/* =====================================================
                DARK MODE
                ===================================================== */}
            <View style={styles.utilityRow}>
              <View style={[styles.iconContainer, { backgroundColor: theme.accentSoft }]}> 
                <Ionicons
                  name="contrast-outline"
                  size={18}
                  color={theme.accent}
                />
              </View>

              <View style={styles.utilityTextContainer}>
                <Text style={[styles.utilityLabel, { color: theme.text }]}> 
                  Dark Mode
                </Text>

                <Text style={[styles.utilitySubtitle, { color: theme.textSecondary }]}> 
                  Use the dark VehiCare appearance
                </Text>
              </View>

              <Switch
                value={isDark}
                onValueChange={handleToggleDarkMode}
                trackColor={{
                  false: '#3A3A3A',
                  true: '#F63B05',
                }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#3A3A3A"
              />
            </View>

            {/* =====================================================
                MY VEHICLES
                ===================================================== */}
            <TouchableOpacity
              style={styles.utilityRow}
              onPress={openVehicles}
              activeOpacity={0.7}
            >
            <View style={[styles.iconContainer, { backgroundColor: theme.accentSoft }]}> 
                <Ionicons
                  name="contrast-outline"
                  size={18}
                  color={theme.accent}
                />
              </View>

              <View style={styles.utilityTextContainer}>
                <Text style={[styles.utilityLabel, { color: theme.text }]}>
                  My Vehicles
                </Text>

                <Text style={[styles.utilitySubtitle, { color: theme.textSecondary }]}>
                  Manage your vehicle profiles
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={18}
                color="#666"
              />
            </TouchableOpacity>

            {/* =====================================================
                HELP & SUPPORT
                ===================================================== */}
            <TouchableOpacity
              style={styles.utilityRow}
              onPress={openHelp}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: theme.accentSoft }]}> 
                <Ionicons
                  name="contrast-outline"
                  size={18}
                  color={theme.accent}
                />
              </View>

              <View style={styles.utilityTextContainer}>
                <Text style={[styles.utilityLabel, { color: theme.text }]}>
                  Help & Support
                </Text>

                <Text style={[styles.utilitySubtitle, { color: theme.textSecondary }]}>
                  Get help with VehiCare
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={18}
                color="#666"
              />
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  /* =============================================================
     CLOSED USER CARD
     ============================================================= */

  card: {
    width: '100%',
    height: 64,
    marginTop: 18,
    marginBottom: 8,
    paddingHorizontal: 23,
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatarBase: {
    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: '#202020',

    overflow: 'hidden',
  },

  avatarText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
  },

  userInfo: {
    flex: 1,

    marginLeft: 10,
    marginRight: 8,
  },

  username: {
    flexShrink: 1,

    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },

  email: {
    marginTop: 3,

    fontSize: 9,
    fontFamily: 'Inter-Regular',
  },

  planBadge: {
    marginRight: 8,

    paddingHorizontal: 6,
    paddingVertical: 3,

    borderRadius: 5,

    backgroundColor: 'rgba(246, 59, 5, 0.10)',

    borderWidth: 1,
    borderColor: 'rgba(246, 59, 5, 0.20)',
  },

  planText: {
    color: '#F63B05',

    fontFamily: 'Inter-SemiBold',
    fontSize: 7,

    letterSpacing: 0.5,
  },

  /* =============================================================
     MODAL
     ============================================================= */

  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },

  panel: {
    width: '100%',

    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 34,

    backgroundColor: '#151515',

    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,

    borderWidth: 1,
    borderColor: '#292929',
  },

  /* =============================================================
     MODAL HEADER
     ============================================================= */

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',

    marginBottom: 18,
  },

  headerInfo: {
    flex: 1,

    marginLeft: 14,
    marginRight: 8,
  },

  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',

    gap: 6,
  },

  headerUsername: {
    flexShrink: 1,

    fontSize: 18,
    fontWeight: '700',
  },

  verifiedBadge: {
    width: 16,
    height: 16,

    borderRadius: 8,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: '#F63B05',
  },

  headerHandle: {
    marginTop: 4,

    fontSize: 13,
  },

  iconButton: {
    width: 40,
    height: 40,

    borderRadius: 12,

    marginLeft: 8,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: 'rgba(246, 59, 5, 0.08)',
  },

  /* =============================================================
     MODAL SECTIONS
     ============================================================= */

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    paddingVertical: 10,
  },

  sectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',

    flex: 1,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },

  sectionSubtitle: {
    marginTop: 2,

    fontSize: 11,
  },

  divider: {
    height: 1,

    marginVertical: 14,

    backgroundColor: '#292929',
  },

  /* =============================================================
     UTILITY ROWS
     ============================================================= */

  utilityRow: {
    minHeight: 52,

    flexDirection: 'row',
    alignItems: 'center',

    paddingVertical: 6,
  },

  iconContainer: {
    width: 36,
    height: 36,

    borderRadius: 10,

    marginRight: 12,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: 'rgba(246, 59, 5, 0.08)',
  },

  utilityTextContainer: {
    flex: 1,
  },

  utilityLabel: {
    fontSize: 15,
    fontWeight: '500',
  },

  utilitySubtitle: {
    marginTop: 2,

    fontSize: 11,
  },
});

export default UserAccountCard;
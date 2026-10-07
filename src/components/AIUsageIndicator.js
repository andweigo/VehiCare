import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '../theme/ThemeContext';

const AIUsageIndicator = ({ stats }) => {
  const { theme } = useTheme();

  if (!stats) return null;

  const { plan, remaining, limit, period } = stats;

  const isGuest = plan === 'guest';
  const isFree = plan === 'free';
  const isPremium = plan === 'premium';

  const badgeColor =
    remaining <= 1
      ? '#EF4444'
      : remaining <= 3
      ? '#F59E0B'
      : theme.accent;

  const label = isGuest
    ? `Guest: ${remaining} of ${limit} remaining`
    : isFree
    ? `Free: ${remaining}/${limit} left this month`
    : `Premium: ${remaining}/${limit} left`;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.surfaceAlt,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: badgeColor }]} />
      <Feather name="zap" size={12} color={badgeColor} style={{ marginRight: 4 }} />
      <Text style={[styles.text, { color: theme.textSecondary }]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
  },
});

export default AIUsageIndicator;

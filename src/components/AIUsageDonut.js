import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const TOTAL_DOTS = 64;

const AIUsageDonut = ({
  used = 0,
  limit = 20,
  size = 104,
  strokeWidth = 10,
  activeColor = '#F5501C',
  trackColor = 'rgba(255, 255, 255, 0.12)',
  exhaustedColor = '#F5501C',
  isExhausted = false,
  showLabel = true,
  style,
  testID = 'ai-usage-donut',
}) => {
  const safeLimit = Math.max(1, typeof limit === 'number' && !isNaN(limit) ? limit : 20);
  const safeUsed = Math.max(0, typeof used === 'number' && !isNaN(used) ? used : 0);
  const percentage = Math.min(100, Math.max(0, Math.round((safeUsed / safeLimit) * 100)));
  const exhausted = isExhausted || safeUsed >= safeLimit || percentage >= 100;
  const currentColor = exhausted ? exhaustedColor : activeColor;

  const halfSize = size / 2;
  const radius = Math.max(1, halfSize - strokeWidth / 2);
  const innerSize = Math.max(10, size - strokeWidth * 2);

  // Calculate seamless overlapping arc segments for reliable cross-platform rendering
  const activeDotsCount = percentage >= 100
    ? TOTAL_DOTS
    : percentage > 0
    ? Math.max(1, Math.round((percentage / 100) * TOTAL_DOTS))
    : 0;

  const arcDots = [];
  for (let i = 0; i < activeDotsCount; i++) {
    // Start from top (12 o'clock / -Math.PI / 2) and advance clockwise
    const angle = (i / TOTAL_DOTS) * 2 * Math.PI - Math.PI / 2;
    const cx = halfSize + radius * Math.cos(angle);
    const cy = halfSize + radius * Math.sin(angle);

    arcDots.push(
      <View
        key={`donut-dot-${i}`}
        style={{
          position: 'absolute',
          left: cx - strokeWidth / 2,
          top: cy - strokeWidth / 2,
          width: strokeWidth,
          height: strokeWidth,
          borderRadius: strokeWidth / 2,
          backgroundColor: currentColor,
        }}
      />
    );
  }

  const halfThreshold = Math.floor(TOTAL_DOTS / 2);
  const rightHalfDots = arcDots.slice(0, Math.min(arcDots.length, halfThreshold));
  const leftHalfDots = arcDots.slice(halfThreshold);

  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: safeLimit, now: safeUsed, text: `${safeUsed} of ${safeLimit} consultations used` }}
      style={[
        styles.container,
        {
          width: size,
          height: size,
        },
        style,
      ]}
    >
      {/* Background Track Circle */}
      <View
        testID="donut-track"
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: halfSize,
            borderWidth: strokeWidth,
            borderColor: trackColor,
          },
        ]}
      />

      {/* Full circle if 100% or exhausted */}
      {percentage >= 100 ? (
        <View
          testID="donut-full-ring"
          style={[
            styles.circle,
            {
              width: size,
              height: size,
              borderRadius: halfSize,
              borderWidth: strokeWidth,
              borderColor: currentColor,
            },
          ]}
        />
      ) : percentage > 0 ? (
        <>
          {/* Right half (0 - 180 deg) */}
          <View
            testID="donut-right-half"
            pointerEvents="none"
            style={[styles.halfWrapper, { width: size, height: size }]}
          >
            {rightHalfDots}
          </View>

          {/* Left half (180 - 360 deg) */}
          {percentage > 50 && (
            <View
              testID="donut-left-half"
              pointerEvents="none"
              style={[styles.halfWrapper, { width: size, height: size }]}
            >
              {leftHalfDots}
            </View>
          )}
        </>
      ) : null}

      {/* Center Display */}
      {showLabel && (
        <View
          testID="donut-center-label"
          style={[
            styles.centerCutout,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
            },
          ]}
        >
          <Text
            testID="donut-ratio-text"
            style={[
              styles.ratioText,
              { color: exhausted ? currentColor : '#FFFFFF' },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {safeUsed}/{safeLimit}
          </Text>
          <Text style={[styles.captionText, { color: exhausted ? currentColor : '#8E8E93' }]}>
            {exhausted ? 'LIMIT' : 'USED'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  circle: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  halfContainer: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },
  halfWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  halfCircle: {
    position: 'absolute',
    top: 0,
  },
  centerCutout: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  ratioText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.5,
    fontFamily: 'Outfit-Bold',
    textAlign: 'center',
  },
  captionText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: 'Inter-SemiBold',
    textTransform: 'uppercase',
    marginTop: 1,
  },
});

export default AIUsageDonut;

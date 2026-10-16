import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

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

  // Angular progress (0 to 360 degrees)
  const angle = (percentage / 100) * 360;
  const rightAngle = Math.min(180, angle);
  const leftAngle = Math.max(0, angle - 180);

  const halfSize = size / 2;
  const innerSize = size - strokeWidth * 2;

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
            style={[
              styles.halfContainer,
              {
                width: halfSize,
                height: size,
                left: halfSize,
              },
            ]}
          >
            <View
              style={[
                styles.halfCircle,
                {
                  width: size,
                  height: size,
                  borderRadius: halfSize,
                  borderWidth: strokeWidth,
                  borderColor: currentColor,
                  left: -halfSize,
                  borderLeftColor: 'transparent',
                  borderBottomColor: 'transparent',
                  transform: [{ rotate: `${-135 + rightAngle}deg` }],
                },
              ]}
            />
          </View>

          {/* Left half (180 - 360 deg) */}
          {angle > 180 && (
            <View
              testID="donut-left-half"
              style={[
                styles.halfContainer,
                {
                  width: halfSize,
                  height: size,
                  left: 0,
                },
              ]}
            >
              <View
                style={[
                  styles.halfCircle,
                  {
                    width: size,
                    height: size,
                    borderRadius: halfSize,
                    borderWidth: strokeWidth,
                    borderColor: currentColor,
                    left: 0,
                    borderLeftColor: 'transparent',
                    borderBottomColor: 'transparent',
                    transform: [{ rotate: `${-135 + leftAngle}deg` }],
                  },
                ]}
              />
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

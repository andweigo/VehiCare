
import { Animated, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

const DOT_SIZE = 7;
const GAP = 9;

const OnboardingPagination = ({
  currentIndex,
  total,
  scrollX,
  pageWidth,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {Array.from({ length: total }).map((_, index) => {
        const inputStart = Math.max(
          0,
          (index - 1) * pageWidth,
        );

        const inputCenter = index * pageWidth;

        const inputEnd =
          (index + 1) * pageWidth;

        const scale = scrollX.interpolate({
          inputRange: [
            inputStart,
            inputCenter,
            inputEnd,
          ],
          outputRange: [
            1,
            1.25,
            1,
          ],
          extrapolate: 'clamp',
        });

        const opacity = scrollX.interpolate({
          inputRange: [
            inputStart,
            inputCenter,
            inputEnd,
          ],
          outputRange: [
            0.35,
            1,
            0.35,
          ],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={`dot-${index}`}
            style={[
              styles.dot,
              {
                transform: [{ scale }],
                opacity,
                backgroundColor:
                  index === currentIndex
                    ? theme.accent
                    : theme.border,
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: GAP,
  },

  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
});

export default OnboardingPagination;

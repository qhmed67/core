---
name: react-native-motion
description: Build fluid, accessible motion in React Native and Expo with Reanimated, Gesture Handler and Skia. Use when implementing press feedback, container transforms, gesture-driven sliders, icon morphs, staggered entrances, shader effects, or when reviewing a React Native component for animation performance and reduced-motion support.
---

# React Native motion

Implementation craft for React Native and Expo interfaces. The rules assume a
modern stack but verify what the project actually has installed before writing
code: Expo SDK, React Native, Reanimated, Gesture Handler and Skia versions
change their APIs.

Use this skill together with the project's design tokens and motion presets. If
the project has no tokens or presets, create them first; never bury magic
numbers in components.

## Hard rules

1. Animated values live in shared values, not React state. No `setState` per
   frame, per gesture event or per slider tick.
2. Use Reanimated, not `Animated` from `react-native`. Do not use
   `useNativeDriver` with Reanimated.
3. Use the Gesture API (`Gesture.Pan()` plus `GestureDetector`). The old
   `useAnimatedGestureHandler` API is gone in current Reanimated versions.
4. Import design values from the project's token and motion modules. No literal
   colors, radii, spacing, durations or spring configs in components.
5. Bridge to the JS thread through one project-local module (for example a
   `threads` re-export) so a worklets API rename is a one-file change.
6. Every component has typed props, an accessibility role and label, a test ID
   where the project uses them, a hit target of at least 44 pt and a
   reduced-motion variant.
7. Use named exports, one component per file, and memoize list items and canvas
   children.
8. Compile Skia `RuntimeEffect`s once at module scope, null-check the result and
   provide a plain fallback.
9. Stop idle loops when the screen loses focus or the app backgrounds.
10. Verify on a mid-range Android device or emulator. A smooth simulator run is
    not proof.

## Choose the tool

| Need | Use |
| --- | --- |
| Press feedback, toggles, scale, opacity, color, radius | Shared value plus `useAnimatedStyle` and `withSpring` |
| Mount, unmount, reorder | Reanimated layout animations (`entering`, `exiting`, `layout`) |
| Finger-driven motion | Gesture Handler writes shared values; springs or decay finish the motion |
| One surface becomes another | Container transform: measure the source rect and animate the destination rect |
| Pixel-level effects, particles, path morphs | Skia |
| Frosted panels | A blur view, used sparingly, with an opaque fallback |
| Continuous clock for a shader | A frame callback writing to a shared value |

Do not use experimental shared-element APIs for production transitions. Build a
container transform you control.

## Component workflow

1. **Name the change.** What is the origin shape and the destination shape? If
   something appears or disappears, where does it come from and go to?
2. **Assign ownership.** Each animated value has one owner: the component or a
   parent that passes a shared value down. Prefer accepting a shared value over
   a value-plus-callback pair when the value drives visuals.
3. **List states.** Idle, pressed, focused, disabled, loading, error and
   reduced motion.
4. **Choose presets.** Springs for touch and shape; timing for color, opacity
   and progress.
5. **Write the component** from the smallest pattern that fits.
6. **Add accessibility.** Role, label, state, hit slop and screen-reader
   actions.
7. **Run the performance pass.**
8. **Run the definition of done.**

## Patterns

### Pressable with spring feedback

```tsx
// src/ui/PressableScale.tsx
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { radius } from '@/theme';
import { spring } from '@/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  restRadius?: number;
  pressedRadius?: number;
};

export function PressableScale({
  style,
  restRadius = radius.lg,
  pressedRadius = radius.xl,
  onPressIn,
  onPressOut,
  ...rest
}: Props) {
  const pressed = useSharedValue(0);

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressed.value, [0, 1], [1, 0.96]) }],
    borderRadius: interpolate(
      pressed.value,
      [0, 1],
      [restRadius, pressedRadius],
    ),
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      onPressIn={(event) => {
        pressed.value = withSpring(1, spring.snappy);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        pressed.value = withSpring(0, spring.gooey);
        onPressOut?.(event);
      }}
      style={[style, animated]}
      {...rest}
    />
  );
}
```

### Container transform

Render the overlay in a root-level absolute container so `measureInWindow`
coordinates line up. Hide the real trigger while the overlay is open so only one
copy is visible.

```tsx
// src/ui/useContainerTransform.ts
import { useCallback, useRef, useState } from 'react';
import type { View } from 'react-native';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { runOnJS } from '@/threads';
import { spring } from '@/motion';

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
};

export function useContainerTransform(target: Rect, fromRadius = 20) {
  const triggerRef = useRef<View>(null);
  const [mounted, setMounted] = useState(false);
  const progress = useSharedValue(0);
  const from = useSharedValue<Rect>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    radius: fromRadius,
  });

  const open = useCallback(() => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      from.value = { x, y, width, height, radius: fromRadius };
      setMounted(true);
      progress.value = withSpring(1, spring.smooth);
    });
  }, [fromRadius, progress]);

  const close = useCallback(() => {
    progress.value = withSpring(0, spring.smooth, (finished) => {
      if (finished) runOnJS(setMounted)(false);
    });
  }, [progress]);

  const panelStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: interpolate(progress.value, [0, 1], [from.value.x, target.x]),
    top: interpolate(progress.value, [0, 1], [from.value.y, target.y]),
    width: interpolate(progress.value, [0, 1], [from.value.width, target.width]),
    height: interpolate(progress.value, [0, 1], [from.value.height, target.height]),
    borderRadius: interpolate(progress.value, [0, 1], [from.value.radius, target.radius]),
    overflow: 'hidden',
  }));

  const sourceContentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.35], [1, 0], Extrapolation.CLAMP),
  }));

  const targetContentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.45, 1], [0, 1], Extrapolation.CLAMP),
  }));

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 0.6], Extrapolation.CLAMP),
  }));

  return {
    triggerRef,
    mounted,
    open,
    close,
    progress,
    panelStyle,
    sourceContentStyle,
    targetContentStyle,
    scrimStyle,
  };
}
```

### Velocity-aware slider

Keep the value on the UI thread and call back to JS only at the end of the
gesture.

```tsx
// src/ui/VelocitySlider.tsx
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
import type { StyleProp, ViewStyle } from 'react-native';
import { runOnJS } from '@/threads';
import { spring } from '@/motion';
import { color, radius } from '@/theme';

type Props = {
  value: SharedValue<number>;
  width: number;
  label: string;
  onCommit?: (value: number) => void;
  trackStyle?: StyleProp<ViewStyle>;
};

const THUMB = 28;

export function VelocitySlider({ value, width, label, onCommit, trackStyle }: Props) {
  const velocity = useSharedValue(0);
  const active = useSharedValue(0);

  const pan = Gesture.Pan()
    .hitSlop({ top: 16, bottom: 16, left: 8, right: 8 })
    .onBegin(() => {
      active.value = withSpring(1, spring.snappy);
    })
    .onChange((event) => {
      value.value = Math.min(1, Math.max(0, value.value + event.changeX / width));
      velocity.value = event.velocityX;
    })
    .onFinalize(() => {
      velocity.value = withSpring(0, spring.gooey);
      active.value = withSpring(0, spring.gooey);
      if (onCommit) runOnJS(onCommit)(value.value);
    });

  const fill = useAnimatedStyle(() => ({ width: value.value * width }));
  const thumb = useAnimatedStyle(() => {
    const stretch = interpolate(
      Math.abs(velocity.value),
      [0, 2000],
      [1, 1.6],
      Extrapolation.CLAMP,
    );
    return {
      transform: [
        { translateX: value.value * (width - THUMB) },
        { scaleX: stretch },
        { scaleY: 1 / Math.sqrt(stretch) },
        { scale: 1 + active.value * 0.12 },
      ],
    };
  });

  return (
    <GestureDetector gesture={pan}>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min: 0, max: 100, now: Math.round(value.value * 100) }}
        style={[{ width, height: 44, justifyContent: 'center' }, trackStyle]}
      >
        <View
          style={{
            height: 6,
            borderRadius: radius.pill,
            backgroundColor: color.bg.subtle,
          }}
        >
          <Animated.View
            style={[
              {
                height: 6,
                borderRadius: radius.pill,
                backgroundColor: color.accent,
              },
              fill,
            ]}
          />
        </View>
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: THUMB,
              height: THUMB,
              borderRadius: radius.pill,
              backgroundColor: color.text.primary,
            },
            thumb,
          ]}
        />
      </View>
    </GestureDetector>
  );
}
```

Add `accessibilityActions` for increment and decrement so screen-reader users
can change the value without dragging.

### Staggered entrance

```tsx
<Animated.View
  entering={FadeInDown.delay(index * stagger.list)
    .springify()
    .damping(spring.smooth.damping)}
  layout={LinearTransition.springify()}
/>
```

Stagger only a small group. Long lists should animate on mount once, not on every
scroll.

### Icon morph

Both paths need the same command sequence. Use explicit move, line and cubic
commands; avoid arcs and shorthand commands that do not interpolate.

```tsx
import { Canvas, Path, Skia, interpolatePath } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

const OPEN = Skia.Path.MakeFromSVGString('M12 5L12 19M5 12L19 12')!;
const CLOSE = Skia.Path.MakeFromSVGString('M6 6L18 18M18 6L6 18')!;

export function MorphIcon({
  progress,
  color,
  size = 24,
}: {
  progress: SharedValue<number>;
  color: string;
  size?: number;
}) {
  const path = useDerivedValue(() =>
    interpolatePath(progress.value, [0, 1], [OPEN, CLOSE]),
  );

  return (
    <Canvas style={{ width: size, height: size }}>
      <Path
        path={path}
        style="stroke"
        strokeWidth={1.75}
        strokeCap="round"
        color={color}
      />
    </Canvas>
  );
}
```

## Performance checklist

- [ ] No React state updates while dragging, scrubbing or animating.
- [ ] Uniforms are computed in `useDerivedValue`, not in render.
- [ ] Preview media is downscaled; full resolution only for export.
- [ ] No more than a few visible canvases per screen; prefer layers.
- [ ] Particles are bounded and drawn as Skia primitives.
- [ ] Blur views are limited and have an opaque fallback.
- [ ] Lists use stable keys and memoized rows; no canvas per row.
- [ ] Idle loops stop when the screen is unfocused or the app is backgrounded.
- [ ] No avoidable object or array creation inside per-frame worklets.
- [ ] Verified at 55 fps or better on a mid-range Android device.

## Accessibility checklist

- [ ] `useReducedMotion()` replaces morphs with short cross-fades and disables
      idle loops and particles.
- [ ] Roles, labels and states are set; sliders expose accessibility actions.
- [ ] Hit area is at least 44×44 pt.
- [ ] State is not conveyed by color alone.
- [ ] Canvas gestures have button equivalents for compare, undo and reset.

## Anti-patterns

| Don't | Do |
| --- | --- |
| `useState` updated in a gesture handler | Shared value written in the worklet |
| Animate width and height through state | Animate transform and opacity, or interpolate a rect |
| `Animated` from `react-native` | Reanimated |
| `useAnimatedGestureHandler` | `Gesture.Pan()` and `GestureDetector` |
| Literal colors, radii or spring configs | Theme and motion tokens |
| Recreate a `RuntimeEffect` in render | Compile once at module scope |
| Full-resolution media in a preview | Downscaled preview, full resolution on export |
| A canvas per list row | Static thumbnails or one shared canvas |
| Linear easing on touch feedback | Springs with velocity hand-off |
| Elements appearing from nowhere | Container transform or an entering animation tied to the source |
| Unbounded loops | Loops tied to focus and app state |

## Definition of done

- [ ] Tokens and motion presets used; no magic values.
- [ ] All states implemented.
- [ ] Origin and destination defined for every appearance.
- [ ] No per-frame React renders.
- [ ] Reduced-motion variant works.
- [ ] Accessibility labels, roles, actions and targets are done.
- [ ] Typecheck and lint pass; no unexplained `any`.
- [ ] Interaction holds at least 55 fps on a mid-range Android device.
- [ ] The file header states purpose, props and whether a development build is
      required.

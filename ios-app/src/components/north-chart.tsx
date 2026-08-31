import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Path, Rect, Text as SvgText } from "react-native-svg";

import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { grahaShort, signLabel } from "@/lib/vedic";

// North-Indian diamond chart: houses are fixed positions, signs rotate with the
// lagna. House 1 is the top-centre diamond; houses run anticlockwise. Mirrors
// src/NorthChart.tsx from the web client.
const HOUSE_CENTERS: [number, number][] = [
  [200, 105], [100, 52], [50, 105], [105, 200], [50, 295], [100, 348],
  [200, 295], [300, 348], [350, 295], [295, 200], [350, 105], [300, 52],
];

export function NorthChart({
  placements,
  title,
  te,
}: {
  placements: { name: string; sign: number }[];
  title: string;
  te: boolean;
}) {
  const theme = useTheme();
  const [box, setBox] = useState(320);
  const lagna = placements.find((item) => item.name === "Lagna");
  const lagnaSign = lagna ? lagna.sign : 0;
  const houses = HOUSE_CENTERS.map(([x, y], index) => {
    const sign = (lagnaSign + index) % 12;
    const bodies = placements
      .filter((item) => item.name !== "Lagna" && item.sign === sign)
      .map((item) => grahaShort(item.name, te));
    return { x, y, sign, bodies, house: index + 1 };
  });

  const stroke = theme.textSecondary;

  return (
    <View style={styles.figure}>
      <ThemedText type="smallBold" style={styles.caption}>{title}</ThemedText>
      <View
        style={[styles.frame, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
        onLayout={(event) => setBox(event.nativeEvent.layout.width)}>
        <Svg width="100%" height={box} viewBox="0 0 400 400">
          <Rect x={4} y={4} width={392} height={392} fill="none" stroke={stroke} strokeWidth={1} />
          <Path d="M4 4 L396 396 M396 4 L4 396" fill="none" stroke={stroke} strokeWidth={1} />
          <Path d="M200 4 L396 200 L200 396 L4 200 Z" fill="none" stroke={stroke} strokeWidth={1} />
          {houses.map((h) => {
            const isLagna = h.house === 1;
            return (
              <SvgText
                key={`sign-${h.house}`}
                x={h.x}
                y={h.y - 10}
                fontSize={13}
                fontWeight={isLagna ? "700" : "400"}
                fill={isLagna ? theme.accent : theme.textSecondary}
                textAnchor="middle">
                {signLabel(h.sign, te)}
              </SvgText>
            );
          })}
          {houses.map((h) => (
            <SvgText
              key={`grahas-${h.house}`}
              x={h.x}
              y={h.y + 12}
              fontSize={15}
              fontWeight="700"
              fill={theme.text}
              textAnchor="middle">
              {h.bodies.slice(0, 4).join(" ")}
            </SvgText>
          ))}
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  figure: { gap: 8 },
  caption: { textAlign: "center" },
  frame: {
    width: "100%",
    aspectRatio: 1,
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
    padding: 6,
  },
});

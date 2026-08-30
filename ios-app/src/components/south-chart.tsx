import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { grahaShort, signLabel } from "@/lib/vedic";

// Traditional fixed South Indian order: Meena top-left, Mesha second,
// clockwise around the frame — matches the web and PDF/MCP render layout.
const CELLS: [number, number, number][] = [
  [0, 1, 0], [1, 2, 0], [2, 3, 0], [3, 3, 1], [4, 3, 2], [5, 3, 3],
  [6, 2, 3], [7, 1, 3], [8, 0, 3], [9, 0, 2], [10, 0, 1], [11, 0, 0],
];

export function SouthChart({
  placements,
  title,
  te,
}: {
  placements: { name: string; sign: number }[];
  title: string;
  te: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={styles.figure}>
      <ThemedText type="smallBold" style={styles.caption}>{title}</ThemedText>
      <View style={[styles.grid, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
        {CELLS.map(([sign, col, row]) => {
          const bodies = placements.filter((placement) => placement.sign === sign);
          const hasLagna = bodies.some((body) => body.name === "Lagna");
          return (
            <View
              key={sign}
              style={[
                styles.cell,
                {
                  left: `${col * 25}%`,
                  top: `${row * 25}%`,
                  borderColor: theme.border,
                  backgroundColor: hasLagna ? theme.backgroundSelected : "transparent",
                },
              ]}>
              <ThemedText style={[styles.signName, { color: theme.textSecondary }]}>
                {signLabel(sign, te)}
              </ThemedText>
              <ThemedText style={[styles.grahas, { color: theme.text }]} numberOfLines={2}>
                {bodies.map((body) => grahaShort(body.name, te)).join(" ")}
              </ThemedText>
            </View>
          );
        })}
        <View style={styles.center}>
          <ThemedText type="smallBold">Sahadeva</ThemedText>
          <ThemedText style={[styles.centerNote, { color: theme.textSecondary }]}>
            {te ? "స్థిర రాశి చక్రం" : "fixed-sign chart"}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  figure: { gap: 8 },
  caption: { textAlign: "center" },
  grid: {
    width: "100%",
    aspectRatio: 1,
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
  },
  cell: {
    position: "absolute",
    width: "25%",
    height: "25%",
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    justifyContent: "space-between",
  },
  signName: { fontSize: 9, letterSpacing: 0.2 },
  grahas: { fontSize: 12, fontWeight: "700" },
  center: {
    position: "absolute",
    left: "25%",
    top: "25%",
    width: "50%",
    height: "50%",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  centerNote: { fontSize: 10 },
});

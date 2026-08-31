import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { calculateKp } from "@/lib/kp";
import { getStrings } from "@/lib/strings";
import type { FullChart, Language } from "@/lib/types";
import { grahaLabel, signLabel } from "@/lib/vedic";

// The practitioner tables from the web "Pro tools" tab: shadbala, KP lords,
// significators, ruling planets, sarvashtakavarga and graha drishti.
export function ProTools({ chart, language }: { chart: FullChart; language: Language }) {
  const theme = useTheme();
  const t = getStrings(language);
  const te = language === "te";

  const avasthas = chart.advanced?.planetaryStates?.avasthas ?? [];
  const sarva = chart.advanced?.ashtakavarga?.sarva;
  const aspects = chart.advanced?.aspects ?? [];
  const kp = calculateKp(chart);

  return (
    <View style={styles.wrap}>
      {/* Shadbala */}
      {avasthas.length > 0 && (
        <Card theme={theme} title={t.shadbala}>
          <Row head theme={theme} cells={[t.planet, "Virupas", t.required, "×"]} widths={[1.3, 1, 1, 0.7]} />
          {avasthas.map((row) => {
            const ratio =
              row.shadbalaTotalVirupas && row.requiredVirupas
                ? row.shadbalaTotalVirupas / row.requiredVirupas
                : row.requiredStrengthRatio;
            return (
              <Row
                key={row.name}
                theme={theme}
                cells={[
                  grahaLabel(row.name, te),
                  row.shadbalaTotalVirupas != null ? row.shadbalaTotalVirupas.toFixed(0) : "—",
                  row.requiredVirupas != null ? row.requiredVirupas.toFixed(0) : "—",
                  ratio != null ? ratio.toFixed(2) : "—",
                ]}
                widths={[1.3, 1, 1, 0.7]}
                emphasize={(ratio ?? 0) >= 1}
                accent={theme.accent}
              />
            );
          })}
        </Card>
      )}

      {/* Sarvashtakavarga */}
      {sarva && (
        <Card theme={theme} title={t.sarva}>
          <View style={styles.sarvaGrid}>
            {sarva.signs.map((bindu, index) => (
              <View key={index} style={[styles.sarvaCell, { borderColor: theme.border }]}>
                <ThemedText style={styles.sarvaSign} themeColor="textSecondary">{signLabel(index, te)}</ThemedText>
                <ThemedText type="smallBold">{bindu}</ThemedText>
              </View>
            ))}
          </View>
          <ThemedText type="small" themeColor="textSecondary">{t.sarvaTotal}: {sarva.total}</ThemedText>
        </Card>
      )}

      {/* KP lords */}
      {kp && (
        <Card theme={theme} title={t.kpTitle}>
          <Row head theme={theme} cells={[t.planet, t.starLord, t.subLord]} widths={[1, 1.2, 1.2]} />
          {kp.significators.map((row) => (
            <Row
              key={row.planet}
              theme={theme}
              cells={[grahaLabel(row.planet, te), grahaLabel(row.starLord, te), grahaLabel(row.subLord, te)]}
              widths={[1, 1.2, 1.2]}
            />
          ))}
        </Card>
      )}

      {/* KP significators */}
      {kp && (
        <Card theme={theme} title={t.signifTitle}>
          <Row head theme={theme} cells={[t.planet, "A", "B", "C", "D"]} widths={[1.3, 0.7, 0.7, 1, 1]} />
          {kp.significators.map((row) => (
            <Row
              key={row.planet}
              theme={theme}
              cells={[
                grahaLabel(row.planet, te),
                String(row.starLordOccupiedHouse),
                String(row.occupiedHouse),
                row.starLordOwnedHouses.join(",") || "—",
                row.ownedHouses.join(",") || "—",
              ]}
              widths={[1.3, 0.7, 0.7, 1, 1]}
            />
          ))}
          <ThemedText type="small" themeColor="textSecondary" style={styles.legend}>{t.signifLegend}</ThemedText>
        </Card>
      )}

      {/* Ruling planets */}
      {kp && (
        <Card theme={theme} title={t.rulingTitle}>
          {kp.rulingPlanets.map((row) => (
            <View key={row.role} style={styles.rulingRow}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.rulingRole}>{row.role}</ThemedText>
              <ThemedText type="smallBold">{grahaLabel(row.planet, te)}</ThemedText>
            </View>
          ))}
        </Card>
      )}

      {/* Graha drishti */}
      {aspects.length > 0 && (
        <Card theme={theme} title={t.aspectsTitle}>
          {aspects.slice(0, 24).map((aspect, index) => (
            <View key={`${aspect.from}-${aspect.to}-${index}`} style={styles.aspectRow}>
              <ThemedText type="smallBold" style={styles.aspectPair}>
                {grahaLabel(aspect.from, te)} → {grahaLabel(aspect.to, te)}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">{aspect.kind}</ThemedText>
            </View>
          ))}
        </Card>
      )}
    </View>
  );
}

type Theme = ReturnType<typeof useTheme>;

function Card({ theme, title, children }: { theme: Theme; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>{title.toUpperCase()}</ThemedText>
      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>{children}</View>
    </View>
  );
}

function Row({
  theme,
  cells,
  widths,
  head,
  emphasize,
  accent,
}: {
  theme: Theme;
  cells: string[];
  widths: number[];
  head?: boolean;
  emphasize?: boolean;
  accent?: string;
}) {
  return (
    <View style={[styles.row, !head && { borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
      {cells.map((cell, index) => (
        <ThemedText
          key={index}
          type={head ? "small" : emphasize && index === 0 ? "smallBold" : "small"}
          themeColor={head ? "textSecondary" : undefined}
          style={[
            styles.cell,
            { flex: widths[index] },
            emphasize && index > 0 ? { color: accent } : null,
          ]}
          numberOfLines={1}>
          {cell}
        </ThemedText>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  section: { gap: 6, marginTop: 4 },
  sectionTitle: { fontSize: 11, letterSpacing: 1.2, fontWeight: "800" },
  card: { borderRadius: 16, padding: 14, gap: 2 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 6, gap: 6 },
  cell: {},
  sarvaGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
  sarvaCell: {
    width: `${100 / 6}%`,
    alignItems: "center",
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  sarvaSign: { fontSize: 9 },
  legend: { marginTop: 8 },
  rulingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 },
  rulingRole: { flex: 1 },
  aspectRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 5, gap: 8 },
  aspectPair: { flexShrink: 0 },
});

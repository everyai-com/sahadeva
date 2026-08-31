import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { NorthChart } from "@/components/north-chart";
import { SouthChart } from "@/components/south-chart";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { fetchJudgment } from "@/lib/api";
import { useAppState } from "@/lib/app-state";
import { loadChartStyle, saveChartStyle } from "@/lib/storage";
import type { JudgmentTopic, TopicJudgment } from "@/lib/types";
import {
  grahaLabel,
  jdToDate,
  localizeMap,
  nakshatraLabel,
  nowJd,
  signLabel,
  TELUGU_PAKSHAS,
  TELUGU_TITHIS,
  TELUGU_VARAS,
} from "@/lib/vedic";

const TOPICS: JudgmentTopic[] = ["career", "education", "property", "relationships", "spirituality"];

export default function ChartScreen() {
  const state = useAppState();
  const theme = useTheme();
  const router = useRouter();
  const [variant, setVariant] = useState<"d1" | "d9">("d1");
  const [chartStyle, setChartStyle] = useState<"south" | "north">("south");
  const [topic, setTopic] = useState<JudgmentTopic>("career");
  const [judgments, setJudgments] = useState<Partial<Record<JudgmentTopic, TopicJudgment>>>({});
  const [judgmentBusy, setJudgmentBusy] = useState(false);
  const [judgmentError, setJudgmentError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const { t, profile, chart, summary } = state;
  const te = state.language === "te";

  useEffect(() => {
    void loadChartStyle().then(setChartStyle);
  }, []);

  if (!profile)
    return (
      <ThemedView style={styles.screen}>
        <SafeAreaView style={styles.centered}>
          <ThemedText themeColor="textSecondary">{t.needProfile}</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );

  const askInChat = (question: string) => {
    void state.send(question);
    router.navigate("/");
  };

  const loadJudgment = async (nextTopic: JudgmentTopic) => {
    setTopic(nextTopic);
    if (judgments[nextTopic] || judgmentBusy) return;
    setJudgmentBusy(true);
    setJudgmentError("");
    try {
      const result = await fetchJudgment(profile, nextTopic);
      setJudgments((previous) => ({ ...previous, [nextTopic]: result }));
    } catch {
      setJudgmentError(t.genericError);
    } finally {
      setJudgmentBusy(false);
    }
  };

  const lagna = chart?.placements.find((p) => p.name === "Lagna");
  const moon = chart?.placements.find((p) => p.name === "Moon");

  const timeline = chart?.advanced?.vimshottariTimeline ?? [];
  const jd = nowJd();
  const runningMaha = timeline.find((period) => jd >= period.startJulianDay && jd < period.endJulianDay);
  const runningAntar = runningMaha?.subPeriods.find((period) => jd >= period.startJulianDay && jd < period.endJulianDay);

  const formatDay = (value: Date) =>
    value.toLocaleDateString(te ? "te-IN" : undefined, { day: "numeric", month: "short", year: "numeric" });
  const formatIso = (iso?: string | null) => (iso ? formatDay(new Date(iso)) : "");
  const degree = (value: number) => `${Math.floor(value)}°${String(Math.round((value % 1) * 60)).padStart(2, "0")}′`;

  const strengths =
    summary?.measuredStrengths ??
    chart?.advanced?.planetaryStates?.avasthas?.map((row) => ({
      planet: row.name,
      ratio:
        row.shadbalaTotalVirupas && row.requiredVirupas
          ? row.shadbalaTotalVirupas / row.requiredVirupas
          : row.requiredStrengthRatio,
      avastha: row.balaadiAvastha,
    })) ??
    [];

  const judgment = judgments[topic];
  const timing = summary?.currentTiming;

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={theme.accent}
              onRefresh={async () => {
                setRefreshing(true);
                await state.refreshChart();
                setRefreshing(false);
              }}
            />
          }>
          <ThemedText style={styles.eyebrow}>{t.yourChart.toUpperCase()}</ThemedText>
          <ThemedText type="subtitle">{profile.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {profile.date} · {profile.time} · {profile.place}
          </ThemedText>

          {!chart && (
            <View style={[styles.card, styles.loadingCard, { backgroundColor: theme.backgroundElement }]}>
              <ActivityIndicator color={theme.accent} />
              <ThemedText type="small" themeColor="textSecondary">{t.loadingChart}</ThemedText>
            </View>
          )}

          {chart && (
            <>
              {/* Chart figure */}
              <View style={styles.segmentRow}>
                {(
                  [
                    { key: "d1", label: t.rasiChart },
                    { key: "d9", label: t.navamsaChart },
                  ] as const
                ).map((option) => (
                  <Pressable
                    key={option.key}
                    onPress={() => setVariant(option.key)}
                    style={[
                      styles.segment,
                      {
                        backgroundColor: variant === option.key ? theme.accent : theme.backgroundElement,
                        borderColor: theme.border,
                      },
                    ]}>
                    <ThemedText type="small" style={{ color: variant === option.key ? "#fff" : theme.text }}>
                      {option.label}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
              <View style={styles.segmentRow}>
                {(
                  [
                    { key: "south", label: t.southStyle },
                    { key: "north", label: t.northStyle },
                  ] as const
                ).map((option) => (
                  <Pressable
                    key={option.key}
                    onPress={() => {
                      setChartStyle(option.key);
                      void saveChartStyle(option.key);
                    }}
                    style={[
                      styles.segment,
                      {
                        backgroundColor: chartStyle === option.key ? theme.accent : theme.backgroundElement,
                        borderColor: theme.border,
                      },
                    ]}>
                    <ThemedText type="small" style={{ color: chartStyle === option.key ? "#fff" : theme.text }}>
                      {option.label}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
              {chartStyle === "south" ? (
                <SouthChart
                  placements={variant === "d1" ? chart.placements : chart.navamsa}
                  title={variant === "d1" ? t.rasiChart : t.navamsaChart}
                  te={te}
                />
              ) : (
                <NorthChart
                  placements={variant === "d1" ? chart.placements : chart.navamsa}
                  title={variant === "d1" ? t.rasiChart : t.navamsaChart}
                  te={te}
                />
              )}
              <Pressable onPress={() => askInChat(t.explainQ.chart)} style={styles.explain}>
                <ThemedText type="small" style={{ color: theme.accent }}>{t.askInChat}</ThemedText>
              </Pressable>

              {/* Anchors */}
              <SectionTitle title={t.anchors} />
              <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
                <View style={styles.grid}>
                  <Fact
                    label={t.lagna}
                    value={lagna ? `${signLabel(lagna.sign, te)} ${degree(lagna.degree)}` : "—"}
                  />
                  <Fact
                    label={t.moon}
                    value={
                      moon
                        ? `${signLabel(moon.sign, te)} · ${nakshatraLabel(moon.nakshatra, te)} ${t.padaShort}${moon.pada}`
                        : "—"
                    }
                  />
                </View>
              </View>

              {/* Current dasha */}
              <SectionTitle title={t.currentDasha} />
              <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
                <View style={styles.grid}>
                  <Fact
                    label={t.mahadasha}
                    value={grahaLabel(timing?.mahadasha ?? runningMaha?.lord ?? undefined, te)}
                    sub={
                      timing?.boundaries.mahadasha
                        ? `${formatIso(timing.boundaries.mahadasha.startIso)} – ${formatIso(timing.boundaries.mahadasha.endIso)}`
                        : runningMaha
                          ? `${formatDay(jdToDate(runningMaha.startJulianDay))} – ${formatDay(jdToDate(runningMaha.endJulianDay))}`
                          : undefined
                    }
                  />
                  <Fact
                    label={t.antardasha}
                    value={grahaLabel(timing?.antardasha ?? runningAntar?.lord ?? undefined, te)}
                    sub={
                      timing?.boundaries.antardasha
                        ? `${formatIso(timing.boundaries.antardasha.startIso)} – ${formatIso(timing.boundaries.antardasha.endIso)}`
                        : runningAntar
                          ? `${formatDay(jdToDate(runningAntar.startJulianDay))} – ${formatDay(jdToDate(runningAntar.endJulianDay))}`
                          : undefined
                    }
                  />
                  {timing?.pratyantardasha ? (
                    <Fact
                      label={t.pratyantardasha}
                      value={grahaLabel(timing.pratyantardasha, te)}
                      sub={
                        timing.boundaries.pratyantardasha
                          ? `${formatIso(timing.boundaries.pratyantardasha.startIso)} – ${formatIso(timing.boundaries.pratyantardasha.endIso)}`
                          : undefined
                      }
                    />
                  ) : null}
                </View>
                <Pressable onPress={() => askInChat(t.explainQ.dasha)} style={styles.explain}>
                  <ThemedText type="small" style={{ color: theme.accent }}>{t.askInChat}</ThemedText>
                </Pressable>
              </View>

              {/* Birth panchanga */}
              <SectionTitle title={t.panchanga} />
              <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
                <View style={styles.grid}>
                  <Fact label={t.vara} value={localizeMap(chart.panchanga.vara, te, TELUGU_VARAS)} />
                  <Fact label={t.tithi} value={localizeMap(chart.panchanga.tithi, te, TELUGU_TITHIS)} />
                  <Fact label={t.paksha} value={localizeMap(chart.panchanga.paksha, te, TELUGU_PAKSHAS)} />
                  <Fact label={t.nakshatra} value={nakshatraLabel(chart.panchanga.nakshatra, te)} />
                  <Fact label={t.yoga} value={chart.panchanga.yoga} />
                  <Fact label={t.karana} value={chart.panchanga.karana} />
                </View>
              </View>

              {/* Strength bars */}
              {strengths.length > 0 && (
                <>
                  <SectionTitle title={t.strength} />
                  <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
                    {strengths
                      .filter((row) => row.planet !== "Lagna")
                      .map((row) => (
                        <View key={row.planet} style={styles.strengthRow}>
                          <ThemedText type="small" style={styles.strengthName}>
                            {grahaLabel(row.planet, te)}
                          </ThemedText>
                          <View style={[styles.strengthTrack, { backgroundColor: theme.background }]}>
                            <View
                              style={[
                                styles.strengthFill,
                                {
                                  backgroundColor: (row.ratio ?? 0) >= 1 ? theme.accent : theme.backgroundSelected,
                                  width: `${Math.min(100, Math.round(((row.ratio ?? 0) / 1.5) * 100))}%`,
                                },
                              ]}
                            />
                          </View>
                          <ThemedText type="small" themeColor="textSecondary" style={styles.strengthValue}>
                            {row.ratio != null ? row.ratio.toFixed(2) : "—"}
                          </ThemedText>
                        </View>
                      ))}
                  </View>
                </>
              )}

              {/* Placements table */}
              <SectionTitle title={t.allPlacements} />
              <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
                <View style={[styles.tableRow, styles.tableHead]}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.colPlanet}>{t.planet}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.colSign}>{t.signCol}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.colDeg}>{t.degreeCol}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.colNak}>{t.nakCol}</ThemedText>
                </View>
                {chart.placements.map((placement) => (
                  <View key={placement.name} style={[styles.tableRow, { borderTopColor: theme.border }]}>
                    <ThemedText type="smallBold" style={styles.colPlanet}>
                      {grahaLabel(placement.name, te)}
                      {placement.retrograde ? ` ℞` : ""}
                    </ThemedText>
                    <ThemedText type="small" style={styles.colSign}>{signLabel(placement.sign, te)}</ThemedText>
                    <ThemedText type="small" style={styles.colDeg}>{degree(placement.degree)}</ThemedText>
                    <ThemedText type="small" style={styles.colNak}>
                      {nakshatraLabel(placement.nakshatra, te)} {t.padaShort}{placement.pada}
                    </ThemedText>
                  </View>
                ))}
                <Pressable onPress={() => askInChat(t.explainQ.placements)} style={styles.explain}>
                  <ThemedText type="small" style={{ color: theme.accent }}>{t.askInChat}</ThemedText>
                </Pressable>
              </View>

              {/* Vimshottari timeline */}
              {timeline.length > 0 && (
                <>
                  <SectionTitle title={t.dashaTimeline} />
                  <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
                    {timeline.map((period) => {
                      const running = period === runningMaha;
                      return (
                        <View
                          key={`${period.lord}-${period.startJulianDay}`}
                          style={[styles.timelineRow, running && { backgroundColor: theme.backgroundSelected, borderRadius: 10 }]}>
                          <ThemedText type={running ? "smallBold" : "small"} style={styles.timelineLord}>
                            {grahaLabel(period.lord, te)}
                            {running ? ` · ${t.running}` : ""}
                          </ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">
                            {formatDay(jdToDate(period.startJulianDay))} – {formatDay(jdToDate(period.endJulianDay))}
                          </ThemedText>
                        </View>
                      );
                    })}
                    <Pressable onPress={() => askInChat(t.explainQ.timeline)} style={styles.explain}>
                      <ThemedText type="small" style={{ color: theme.accent }}>{t.askInChat}</ThemedText>
                    </Pressable>
                  </View>
                </>
              )}

              {/* Yogas */}
              <SectionTitle title={t.yogasTitle} />
              <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
                {(chart.advanced?.yogas ?? []).filter((yoga) => yoga.detected).length === 0 ? (
                  <ThemedText type="small" themeColor="textSecondary">{t.noYogas}</ThemedText>
                ) : (
                  (chart.advanced?.yogas ?? [])
                    .filter((yoga) => yoga.detected)
                    .map((yoga) => (
                      <View key={yoga.yoga} style={styles.yogaRow}>
                        <ThemedText type="smallBold">{yoga.yoga}</ThemedText>
                        {yoga.evidence.slice(0, 2).map((line) => (
                          <ThemedText key={line} type="small" themeColor="textSecondary">{line}</ThemedText>
                        ))}
                      </View>
                    ))
                )}
                <Pressable onPress={() => askInChat(t.explainQ.yogas)} style={styles.explain}>
                  <ThemedText type="small" style={{ color: theme.accent }}>{t.askInChat}</ThemedText>
                </Pressable>
              </View>
            </>
          )}

          {/* Topic judgment */}
          <SectionTitle title={t.judgmentTitle} />
          <View style={styles.topicRow}>
            {TOPICS.map((option) => (
              <Pressable
                key={option}
                onPress={() => void loadJudgment(option)}
                style={[
                  styles.topicChip,
                  {
                    backgroundColor: topic === option ? theme.accent : theme.backgroundElement,
                    borderColor: theme.border,
                  },
                ]}>
                <ThemedText type="small" style={{ color: topic === option ? "#fff" : theme.text }}>
                  {t.judgmentTopics[option]}
                </ThemedText>
              </Pressable>
            ))}
          </View>
          {judgmentBusy && (
            <View style={[styles.card, styles.loadingCard, { backgroundColor: theme.backgroundElement }]}>
              <ActivityIndicator color={theme.accent} />
            </View>
          )}
          {judgmentError ? <ThemedText style={styles.error}>{judgmentError}</ThemedText> : null}
          {!judgment && !judgmentBusy && (
            <Pressable
              onPress={() => void loadJudgment(topic)}
              style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="small" style={{ color: theme.accent }}>
                {t.judgmentTopics[topic]} →
              </ThemedText>
            </Pressable>
          )}
          {judgment && (
            <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText style={[styles.verdictStatus, { color: theme.accent }]}>
                {judgment.status.toUpperCase()}
              </ThemedText>
              <ThemedText type="smallBold" style={styles.verdictTitle}>{judgment.title}</ThemedText>
              <ThemedText type="small">{judgment.conclusion}</ThemedText>
              <View style={styles.grid}>
                <Fact label={t.varga} value={`${judgment.vargaConfirmation.varga} · ${judgment.vargaConfirmation.status}`} />
                <Fact label={t.timing} value={judgment.timingActivation.status} />
                <Fact label={t.clarity} value={judgment.uncertainty.level} />
              </View>
              <EvidenceBlock title={t.supporting} rows={judgment.supportingEvidence} color={theme.accent} />
              <EvidenceBlock title={t.opposing} rows={judgment.opposingEvidence} color={theme.accent} />
              <ThemedText type="small" themeColor="textSecondary">
                {judgment.citations.length
                  ? t.citedRules(judgment.citations.length)
                  : t.unresolvedRules(judgment.unresolvedSourceKeys.length)}
              </ThemedText>
              <Pressable
                onPress={() =>
                  askInChat(
                    te
                      ? `${t.judgmentTopics[topic]} గురించి పూర్తి సంప్రదింపు ఇవ్వండి.`
                      : `Give me a complete ${topic} consultation with evidence, timing and practical next steps.`,
                  )
                }
                style={styles.explain}>
                <ThemedText type="small" style={{ color: theme.accent }}>{t.askInChat}</ThemedText>
              </Pressable>
            </View>
          )}

          <ThemedText type="small" themeColor="textSecondary">{t.disclaimer}</ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <ThemedText style={styles.sectionTitle}>{title.toUpperCase()}</ThemedText>;
}

function Fact({ label, value, sub }: { label: string; value?: string; sub?: string }) {
  return (
    <View style={styles.fact}>
      <ThemedText style={styles.factLabel} themeColor="textSecondary">{label}</ThemedText>
      <ThemedText type="smallBold">{value || "—"}</ThemedText>
      {sub ? <ThemedText type="small" themeColor="textSecondary">{sub}</ThemedText> : null}
    </View>
  );
}

function EvidenceBlock({
  title,
  rows,
  color,
}: {
  title: string;
  rows: { id: string; label: string; detail: string }[];
  color: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.evidence}>
      <Pressable onPress={() => setOpen((value) => !value)} style={styles.evidenceHead}>
        <ThemedText type="smallBold">{title} · {rows.length}</ThemedText>
        <ThemedText style={{ color }}>{open ? "−" : "+"}</ThemedText>
      </Pressable>
      {open &&
        rows.map((row) => (
          <View key={row.id} style={[styles.evidenceRow, { borderLeftColor: color }]}>
            <ThemedText type="smallBold">{row.label}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">{row.detail}</ThemedText>
          </View>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30 },
  content: { padding: 18, gap: 12, paddingBottom: BottomTabInset + 60 },
  eyebrow: { fontSize: 10, letterSpacing: 1.5, fontWeight: "700" },
  sectionTitle: { fontSize: 11, letterSpacing: 1.2, fontWeight: "800", marginTop: 10 },
  card: { borderRadius: 18, padding: 16, gap: 10 },
  loadingCard: { alignItems: "center", paddingVertical: 26 },
  segmentRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  segment: { flex: 1, borderWidth: 1, borderRadius: 14, minHeight: 42, alignItems: "center", justifyContent: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: 12 },
  fact: { width: "50%", gap: 2, paddingRight: 8 },
  factLabel: { fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase" },
  explain: { alignSelf: "flex-start", paddingVertical: 4 },
  strengthRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  strengthName: { width: 84 },
  strengthTrack: { flex: 1, height: 8, borderRadius: 5, overflow: "hidden" },
  strengthFill: { height: "100%", borderRadius: 5 },
  strengthValue: { width: 44, textAlign: "right" },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 7, borderTopWidth: StyleSheet.hairlineWidth, gap: 4 },
  tableHead: { borderTopWidth: 0 },
  colPlanet: { flex: 1.2 },
  colSign: { flex: 1 },
  colDeg: { width: 62 },
  colNak: { flex: 1.4 },
  timelineRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 7, paddingHorizontal: 6 },
  timelineLord: { flexShrink: 0, marginRight: 10 },
  yogaRow: { gap: 2, marginBottom: 8 },
  topicRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  topicChip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 13, paddingVertical: 8 },
  verdictStatus: { fontSize: 10, letterSpacing: 1.3, fontWeight: "800" },
  verdictTitle: { fontSize: 20, lineHeight: 26 },
  evidence: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(128,110,88,.3)", paddingTop: 4 },
  evidenceHead: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  evidenceRow: { borderLeftWidth: 2, paddingLeft: 12, marginBottom: 11, gap: 3 },
  error: { color: "#a84840" },
});

import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useTheme } from "@/hooks/use-theme";
import { fetchBrief, fetchToday } from "@/lib/api";
import { useAppState } from "@/lib/app-state";
import type { TodayPanchanga } from "@/lib/types";
import { localizeMap, nakshatraLabel, TELUGU_PAKSHAS, TELUGU_TITHIS, TELUGU_VARAS } from "@/lib/vedic";
import { BottomTabInset } from "@/constants/theme";

export default function TodayScreen() {
  const state = useAppState();
  const theme = useTheme();
  const router = useRouter();
  const [today, setToday] = useState<TodayPanchanga | null>(null);
  const [brief, setBrief] = useState<{ title: string; body: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const { t, profile } = state;
  const te = state.language === "te";

  const load = async () => {
    if (!profile) return;
    setLoading(true);
    const [panchanga, briefResult] = await Promise.all([
      fetchToday(profile),
      state.account ? fetchBrief() : Promise.resolve(null),
    ]);
    setToday(panchanga);
    setBrief(briefResult);
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.date, profile?.place, profile?.language, state.account?.id]);

  const clock = (iso?: string) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleTimeString(te ? "te-IN" : "en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: profile?.timezone || undefined,
      });
    } catch {
      return iso.slice(11, 16);
    }
  };

  if (!profile)
    return (
      <ThemedView style={styles.screen}>
        <SafeAreaView style={styles.centered}>
          <ThemedText themeColor="textSecondary">{t.needProfile}</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );

  const limbs = today?.fiveLimbs;
  const dateLabel = new Date().toLocaleDateString(te ? "te-IN" : undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={theme.accent} />}>
          <ThemedText style={styles.eyebrow}>{t.today.toUpperCase()}</ThemedText>
          <ThemedText type="subtitle">{dateLabel}</ThemedText>

          {brief && (
            <View style={[styles.card, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="smallBold">{brief.title}</ThemedText>
              <ThemedText type="small">{brief.body}</ThemedText>
            </View>
          )}

          {!today && loading && (
            <View style={[styles.card, styles.loadingCard, { backgroundColor: theme.backgroundElement }]}>
              <ActivityIndicator color={theme.accent} />
            </View>
          )}

          {limbs && (
            <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.grid}>
                <Fact label={t.vara} value={localizeMap(limbs.vara, te, TELUGU_VARAS)} />
                <Fact label={t.tithi} value={localizeMap(limbs.tithi, te, TELUGU_TITHIS)} />
                <Fact label={t.paksha} value={localizeMap(limbs.paksha, te, TELUGU_PAKSHAS)} />
                <Fact label={t.nakshatra} value={nakshatraLabel(limbs.nakshatra, te)} />
                <Fact label={t.yoga} value={limbs.yoga} />
                <Fact label={t.karana} value={limbs.karana} />
              </View>
            </View>
          )}

          {today && (
            <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.grid}>
                <Fact label={t.sunrise} value={clock(today.solar?.sunrise)} />
                <Fact label={t.sunset} value={clock(today.solar?.sunset)} />
                <Fact
                  label={t.rahuKaal}
                  value={`${clock(today.inauspicious?.rahuKaal?.startIso)} – ${clock(today.inauspicious?.rahuKaal?.endIso)}`}
                  wide
                />
              </View>
            </View>
          )}

          <View style={styles.chipColumn}>
            {t.dailySuggestions.map((question) => (
              <Pressable
                key={question}
                onPress={() => {
                  void state.send(question);
                  router.navigate("/");
                }}
                style={[styles.askChip, { borderColor: theme.border }]}>
                <ThemedText type="small">💬 {question}</ThemedText>
              </Pressable>
            ))}
          </View>

          <ThemedText type="small" themeColor="textSecondary">{t.disclaimer}</ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Fact({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <View style={[styles.fact, wide && styles.factWide]}>
      <ThemedText style={styles.factLabel} themeColor="textSecondary">{label}</ThemedText>
      <ThemedText type="smallBold">{value || "—"}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30 },
  content: { padding: 18, gap: 14, paddingBottom: BottomTabInset + 60 },
  eyebrow: { fontSize: 10, letterSpacing: 1.5, fontWeight: "700" },
  card: { borderRadius: 18, padding: 16, gap: 8 },
  loadingCard: { alignItems: "center", paddingVertical: 30 },
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: 14 },
  fact: { width: "50%", gap: 2, paddingRight: 8 },
  factWide: { width: "100%" },
  factLabel: { fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase" },
  chipColumn: { gap: 8 },
  askChip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 },
});

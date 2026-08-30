import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { Sheet } from "@/components/sheet";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { AmbiguousPlaceError, resolvePlace, type PlaceCandidate } from "@/lib/api";
import { getStrings } from "@/lib/strings";
import type { Language, Profile, ResolvedPlace } from "@/lib/types";

const pad = (value: number) => String(value).padStart(2, "0");

function PickerField({
  label,
  value,
  options,
  onSelect,
  flex = 1,
}: {
  label: string;
  value: string;
  options: { key: number; label: string }[];
  onSelect: (key: number) => void;
  flex?: number;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={[styles.field, { flex }]}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.input, styles.pickerButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <ThemedText>{value}</ThemedText>
        <ThemedText style={{ color: theme.textSecondary }}>▾</ThemedText>
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title={label}>
        <ScrollView style={styles.pickerList}>
          {options.map((option) => (
            <Pressable
              key={option.key}
              onPress={() => {
                onSelect(option.key);
                setOpen(false);
              }}
              style={({ pressed }) => [
                styles.pickerRow,
                { borderColor: theme.border, opacity: pressed ? 0.6 : 1 },
              ]}>
              <ThemedText type={option.label === value ? "smallBold" : "small"}>
                {option.label}
              </ThemedText>
              {option.label === value && <ThemedText style={{ color: theme.accent }}>✓</ThemedText>}
            </Pressable>
          ))}
        </ScrollView>
      </Sheet>
    </View>
  );
}

export function Onboarding({
  initial,
  onReady,
  title,
}: {
  initial?: Profile | null;
  onReady: (profile: Profile) => void;
  title?: string;
}) {
  const theme = useTheme();
  const [language, setLanguage] = useState<Language>(initial?.language ?? "en");
  const t = getStrings(language);
  const initialDate = initial?.date?.split("-") ?? [];
  const initialTime = initial?.time?.split(":") ?? [];
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initial?.name ?? "");
  const [year, setYear] = useState(Number(initialDate[0]) || 1995);
  const [month, setMonth] = useState((Number(initialDate[1]) || 1) - 1);
  const [day, setDay] = useState(Number(initialDate[2]) || 1);
  const [hour, setHour] = useState(initialTime[0] !== undefined ? Number(initialTime[0]) : 12);
  const [minute, setMinute] = useState(initialTime[1] !== undefined ? Number(initialTime[1]) : 0);
  const [place, setPlace] = useState(initial?.place ?? "");
  const [resolved, setResolved] = useState<ResolvedPlace | null>(null);
  const [candidates, setCandidates] = useState<PlaceCandidate[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(
    () => Array.from({ length: currentYear - 1919 }, (_, index) => ({ key: currentYear - index, label: String(currentYear - index) })),
    [currentYear],
  );
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const date = `${year}-${pad(month + 1)}-${pad(Math.min(day, daysInMonth))}`;
  const time = `${pad(hour)}:${pad(minute)}`;

  async function findPlace() {
    if (!place.trim()) return;
    setBusy(true);
    setError("");
    setCandidates([]);
    try {
      const result = await resolvePlace(place.trim(), date, time);
      setResolved(result);
      setStep(3);
    } catch (reason) {
      if (reason instanceof AmbiguousPlaceError) setCandidates(reason.candidates);
      else setError(t.placeError);
    } finally {
      setBusy(false);
    }
  }

  function pickCandidate(candidate: PlaceCandidate) {
    setCandidates([]);
    setResolved({
      place: candidate.label,
      latitude: candidate.latitude,
      longitude: candidate.longitude,
      timezone: candidate.timezone,
      timezoneOffset: candidate.timezoneOffset,
    });
    setPlace(candidate.label);
    setStep(3);
  }

  function start() {
    if (!resolved) return;
    onReady({
      name: name.trim(),
      date,
      time,
      place: resolved.place,
      latitude: resolved.latitude,
      longitude: resolved.longitude,
      timezone: resolved.timezone,
      timezoneOffset: resolved.timezoneOffset,
      language,
    });
  }

  const progress = (step + 1) / 4;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={[styles.progressTrack]}>
          <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: theme.accent }]} />
        </View>
        <View style={styles.topRow}>
          <ThemedText style={styles.eyebrow}>{title ?? `SAHADEVA · ${step + 1} / 4`}</ThemedText>
          {step > 0 && (
            <Pressable onPress={() => setStep((value) => value - 1)} hitSlop={12}>
              <ThemedText style={{ color: theme.accent }}>{t.back}</ThemedText>
            </Pressable>
          )}
        </View>

        {step === 0 && (
          <View style={styles.step}>
            <ThemedText type="title" style={styles.title}>Sahadeva</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.detail}>{t.tagline}</ThemedText>
            <View style={styles.langRow}>
              {(["en", "te"] as const).map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setLanguage(option)}
                  style={[
                    styles.langButton,
                    {
                      backgroundColor: language === option ? theme.accent : theme.backgroundElement,
                      borderColor: theme.border,
                    },
                  ]}>
                  <ThemedText style={{ color: language === option ? "#fff" : theme.text, fontWeight: "700" }}>
                    {option === "en" ? "English" : "తెలుగు"}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
            <View style={styles.field}>
              <ThemedText type="smallBold">{t.name}</ThemedText>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={t.namePlaceholder}
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="words"
                style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
              />
            </View>
            <PrimaryButton label={t.continue} disabled={!name.trim()} onPress={() => setStep(1)} color={theme.accent} />
          </View>
        )}

        {step === 1 && (
          <View style={styles.step}>
            <ThemedText type="subtitle">{t.dob}</ThemedText>
            <View style={styles.row}>
              <PickerField
                label={t.day}
                value={String(Math.min(day, daysInMonth))}
                options={Array.from({ length: daysInMonth }, (_, index) => ({ key: index + 1, label: String(index + 1) }))}
                onSelect={setDay}
              />
              <PickerField
                label={t.month}
                value={t.months[month]}
                options={t.months.map((label, index) => ({ key: index, label }))}
                onSelect={setMonth}
                flex={1.6}
              />
              <PickerField label={t.year} value={String(year)} options={yearOptions} onSelect={setYear} />
            </View>
            <ThemedText type="subtitle" style={styles.sectionGap}>{t.tob}</ThemedText>
            <View style={styles.row}>
              <PickerField
                label={t.hour}
                value={pad(hour)}
                options={Array.from({ length: 24 }, (_, index) => ({ key: index, label: pad(index) }))}
                onSelect={setHour}
              />
              <PickerField
                label={t.minute}
                value={pad(minute)}
                options={Array.from({ length: 60 }, (_, index) => ({ key: index, label: pad(index) }))}
                onSelect={setMinute}
              />
            </View>
            <PrimaryButton label={t.continue} disabled={false} onPress={() => setStep(2)} color={theme.accent} />
          </View>
        )}

        {step === 2 && (
          <View style={styles.step}>
            <ThemedText type="subtitle">{t.pob}</ThemedText>
            <View style={styles.field}>
              <TextInput
                value={place}
                onChangeText={setPlace}
                placeholder={t.pobPlaceholder}
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="words"
                onSubmitEditing={findPlace}
                style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
              />
            </View>
            <PrimaryButton
              label={busy ? t.finding : t.continue}
              disabled={busy || !place.trim()}
              onPress={findPlace}
              color={theme.accent}
            />
            {busy && <ActivityIndicator color={theme.accent} />}
            {candidates.length > 0 && (
              <View style={styles.candidateList}>
                <ThemedText type="small" themeColor="textSecondary">{t.placeAmbiguous}</ThemedText>
                {candidates.map((candidate) => (
                  <Pressable
                    key={`${candidate.label}-${candidate.latitude}`}
                    onPress={() => pickCandidate(candidate)}
                    style={[styles.candidateRow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                    <ThemedText type="smallBold">{candidate.label}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">{candidate.timezone}</ThemedText>
                  </Pressable>
                ))}
              </View>
            )}
            {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
          </View>
        )}

        {step === 3 && resolved && (
          <View style={styles.step}>
            <ThemedText type="subtitle">{name}</ThemedText>
            <View style={[styles.summaryCard, { backgroundColor: theme.backgroundElement }]}>
              <SummaryRow label={t.dob} value={`${Math.min(day, daysInMonth)} ${t.months[month]} ${year}`} />
              <SummaryRow label={t.tob} value={time} />
              <SummaryRow label={t.pob} value={resolved.place} />
              <SummaryRow label="UTC" value={`${resolved.timezoneOffset >= 0 ? "+" : ""}${resolved.timezoneOffset} · ${resolved.timezone}`} />
            </View>
            <ThemedText type="small" themeColor="textSecondary">{t.privacy}</ThemedText>
            <PrimaryButton label={t.start} disabled={false} onPress={start} color={theme.accent} />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <ThemedText type="small" themeColor="textSecondary">{label}</ThemedText>
      <ThemedText type="smallBold" style={styles.summaryValue}>{value}</ThemedText>
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled,
  color,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
  color: string;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primary,
        { backgroundColor: color, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 },
      ]}>
      <ThemedText style={styles.primaryText}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 22, gap: 18, paddingBottom: 60 },
  progressTrack: { height: 5, borderRadius: 5, backgroundColor: "rgba(128,110,88,.16)", overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 5 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  eyebrow: { fontSize: 10, letterSpacing: 1.5, fontWeight: "700" },
  step: { gap: 18, paddingTop: 12 },
  title: { fontSize: 42, lineHeight: 46, letterSpacing: -1.2 },
  detail: { lineHeight: 23, maxWidth: 330 },
  langRow: { flexDirection: "row", gap: 10 },
  langButton: { flex: 1, minHeight: 50, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  field: { gap: 8 },
  row: { flexDirection: "row", gap: 10 },
  sectionGap: { marginTop: 6 },
  input: { minHeight: 54, borderWidth: 1, borderRadius: 15, paddingHorizontal: 15, fontSize: 17 },
  pickerButton: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pickerList: { maxHeight: 380 },
  pickerRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 4,
  },
  candidateList: { gap: 8 },
  candidateRow: { borderWidth: 1, borderRadius: 14, padding: 13, gap: 2 },
  summaryCard: { borderRadius: 18, padding: 16, gap: 10 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  summaryValue: { flexShrink: 1, textAlign: "right" },
  primary: { minHeight: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 8 },
  primaryText: { color: "#fff", fontWeight: "700" },
  error: { color: "#a84840" },
});

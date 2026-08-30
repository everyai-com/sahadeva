import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Onboarding } from "@/components/onboarding";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { API_URL, createShareLink } from "@/lib/api";
import { useAppState } from "@/lib/app-state";
import { disableDailyReminder, enableDailyReminder } from "@/lib/notifications";
import { loadReminder, saveReminder } from "@/lib/storage";

export default function MoreScreen() {
  const state = useAppState();
  const theme = useTheme();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [shareState, setShareState] = useState<"idle" | "busy" | "done" | "need-account">("idle");
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [reminderOn, setReminderOn] = useState(false);
  const [reminderToken, setReminderToken] = useState<string | undefined>();
  const [reminderBusy, setReminderBusy] = useState(false);
  const [reminderMsg, setReminderMsg] = useState("");

  const { t, profile, account } = state;
  const te = state.language === "te";

  useEffect(() => {
    void loadReminder().then((value) => {
      setReminderOn(value.enabled);
      setReminderToken(value.token);
    });
  }, []);

  async function toggleReminder(next: boolean) {
    setReminderMsg("");
    if (!account) {
      setReminderMsg(t.remindersNeedsAccount);
      return;
    }
    if (!next) {
      setReminderOn(false);
      setReminderBusy(true);
      await disableDailyReminder(reminderToken);
      await saveReminder({ enabled: false });
      setReminderToken(undefined);
      setReminderBusy(false);
      return;
    }
    setReminderBusy(true);
    const result = await enableDailyReminder(7, profile?.timezoneOffset ?? 5.5);
    setReminderBusy(false);
    if (result.ok) {
      setReminderOn(true);
      setReminderToken(result.token);
      await saveReminder({ enabled: true, token: result.token });
    } else {
      setReminderOn(false);
      setReminderMsg(
        result.reason === "denied"
          ? t.remindersDenied
          : result.reason === "unsupported"
            ? t.remindersUnsupported
            : result.reason === "unconfigured"
              ? t.remindersUnconfigured
              : t.remindersFailed,
      );
    }
  }

  const methodLayers = te
    ? [
        { title: "సరళమైన రీడింగ్", body: "సాధారణ భాషలో హద్దులతో కూడిన నిర్ణయం." },
        { title: "ఈ నిర్ణయం ఎందుకు", body: "అనుకూలం, ప్రతికూలం, వర్గ ధృవీకరణ, కాలం విడివిడిగా చూపుతాం." },
        { title: "సాంకేతిక సాక్ష్యం", body: "భావాలు, అధిపతులు, స్థితి, కొలిచిన బలం, సంబంధాలు." },
        { title: "మూలాలు", body: "సమీక్షించిన నియమాలకే ఉల్లేఖనలు; మిగతావి బహిరంగంగా పెండింగ్‌లో." },
      ]
    : [
        { title: "Plain reading", body: "A bounded conclusion in ordinary language." },
        { title: "Why this judgment", body: "Support, opposition, Varga confirmation and timing are separated." },
        { title: "Technical evidence", body: "Houses, lords, dignity, measured strength, relationships and dispositors." },
        { title: "Sources", body: "Only publishable rules receive citations; unresolved source keys stay visible." },
      ];

  async function submitAuth() {
    if (!email.trim() || password.length < 8 || authBusy) return;
    setAuthBusy(true);
    setAuthError("");
    try {
      if (mode === "signin") await state.signIn(email, password);
      else await state.signUp(email, password, profile?.name || email.split("@")[0]);
      setEmail("");
      setPassword("");
    } catch {
      setAuthError(mode === "signin" ? t.authError : t.signupError);
    } finally {
      setAuthBusy(false);
    }
  }

  async function shareChart() {
    if (!account) {
      setShareState("need-account");
      return;
    }
    setShareState("busy");
    const url = await createShareLink();
    if (url) {
      setShareState("done");
      await Share.share({ message: url }).catch(() => {});
    } else {
      setShareState("idle");
    }
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText style={styles.eyebrow}>{t.account.toUpperCase()}</ThemedText>

          {/* Account */}
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            {account ? (
              <>
                <ThemedText type="smallBold">
                  {t.signedInAs} {account.email}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">{t.syncNote}</ThemedText>
                <Pressable onPress={() => void state.signOut()} style={[styles.outlineButton, { borderColor: theme.border }]}>
                  <ThemedText type="smallBold">{t.signOut}</ThemedText>
                </Pressable>
              </>
            ) : (
              <>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t.email}
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t.password}
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry
                  style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                />
                <Pressable
                  onPress={() => void submitAuth()}
                  disabled={authBusy || !email.trim() || password.length < 8}
                  style={[
                    styles.primary,
                    { backgroundColor: theme.accent, opacity: authBusy || !email.trim() || password.length < 8 ? 0.5 : 1 },
                  ]}>
                  {authBusy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText style={styles.primaryText}>{mode === "signin" ? t.signIn : t.signUp}</ThemedText>
                  )}
                </Pressable>
                <Pressable onPress={() => setMode(mode === "signin" ? "signup" : "signin")} hitSlop={8}>
                  <ThemedText type="small" style={{ color: theme.accent }}>
                    {mode === "signin" ? t.noAccount : t.haveAccount}
                  </ThemedText>
                </Pressable>
                {authError ? <ThemedText style={styles.error}>{authError}</ThemedText> : null}
                <ThemedText type="small" themeColor="textSecondary">{t.guestNote}</ThemedText>
              </>
            )}
          </View>

          {/* People */}
          {account && (
            <>
              <ThemedText style={styles.eyebrow}>{t.people.toUpperCase()}</ThemedText>
              <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
                {state.people.map((person) => (
                  <View key={person.id} style={[styles.personRow, { borderBottomColor: theme.border }]}>
                    <Pressable style={styles.personMain} onPress={() => void state.switchPerson(person)}>
                      <ThemedText type="smallBold">
                        {person.profile?.name || "—"}
                        {person.profile?.name === profile?.name ? `  · ${t.activeTag}` : ""}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {person.profile ? `${person.profile.date} · ${person.profile.place}` : ""}
                      </ThemedText>
                    </Pressable>
                    {person.profile && person.profile.name !== profile?.name && (
                      <>
                        <Pressable
                          onPress={() => {
                            void state.compareWith(person);
                            router.navigate("/");
                          }}
                          hitSlop={8}>
                          <ThemedText type="small" style={{ color: theme.accent }}>⚭ {t.compare}</ThemedText>
                        </Pressable>
                        <Pressable onPress={() => void state.deletePerson(person)} hitSlop={8}>
                          <ThemedText type="small" style={styles.error}>{t.deletePerson}</ThemedText>
                        </Pressable>
                      </>
                    )}
                  </View>
                ))}
                <Pressable onPress={() => setAddOpen(true)} hitSlop={8}>
                  <ThemedText type="small" style={{ color: theme.accent }}>{t.addPerson}</ThemedText>
                </Pressable>
              </View>
            </>
          )}

          {/* Preferences */}
          <ThemedText style={styles.eyebrow}>{t.language.toUpperCase()}</ThemedText>
          <View style={styles.langRow}>
            {(["en", "te"] as const).map((option) => (
              <Pressable
                key={option}
                onPress={() => state.switchLanguage(option)}
                style={[
                  styles.langButton,
                  {
                    backgroundColor: state.language === option ? theme.accent : theme.backgroundElement,
                    borderColor: theme.border,
                  },
                ]}>
                <ThemedText style={{ color: state.language === option ? "#fff" : theme.text, fontWeight: "700" }}>
                  {option === "en" ? "English" : "తెలుగు"}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          {/* Chart actions */}
          {profile && (
            <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              <Pressable onPress={() => void shareChart()} disabled={shareState === "busy"} hitSlop={6}>
                <ThemedText type="smallBold" style={{ color: theme.accent }}>
                  {shareState === "busy" ? "…" : `↗ ${t.shareChart}`}
                </ThemedText>
              </Pressable>
              {shareState === "done" && (
                <ThemedText type="small" themeColor="textSecondary">{t.shareCopied}</ThemedText>
              )}
              {shareState === "need-account" && (
                <ThemedText type="small" themeColor="textSecondary">{t.shareNeedsAccount}</ThemedText>
              )}
              <Pressable onPress={() => setEditOpen(true)} hitSlop={6}>
                <ThemedText type="smallBold" style={{ color: theme.accent }}>✎ {t.editBirth}</ThemedText>
              </Pressable>
            </View>
          )}

          {/* Daily reminder */}
          {profile && (
            <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.reminderRow}>
                <View style={styles.reminderCopy}>
                  <ThemedText type="smallBold">{t.reminders}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {reminderOn ? t.remindersOn : t.remindersDesc}
                  </ThemedText>
                </View>
                {reminderBusy ? (
                  <ActivityIndicator color={theme.accent} />
                ) : (
                  <Switch
                    value={reminderOn}
                    onValueChange={(next) => void toggleReminder(next)}
                    trackColor={{ true: theme.accent, false: theme.border }}
                  />
                )}
              </View>
              {reminderMsg ? (
                <ThemedText type="small" themeColor="textSecondary">{reminderMsg}</ThemedText>
              ) : null}
            </View>
          )}

          {/* Method */}
          <ThemedText style={styles.eyebrow}>{t.method.toUpperCase()}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">{t.methodIntro}</ThemedText>
          {methodLayers.map((item, index) => (
            <View key={item.title} style={[styles.methodCard, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText style={[styles.methodNumber, { color: theme.accent }]}>0{index + 1}</ThemedText>
              <View style={styles.methodCopy}>
                <ThemedText type="smallBold">{item.title}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">{item.body}</ThemedText>
              </View>
            </View>
          ))}

          <View style={[styles.notice, { borderColor: theme.border }]}>
            <ThemedText type="smallBold">{t.researchBoundary}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">{t.researchNote}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">{t.disclaimer}</ThemedText>
            <ThemedText type="code" themeColor="textSecondary">API {API_URL}</ThemedText>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Edit birth details */}
      <Modal visible={editOpen} animationType="slide" onRequestClose={() => setEditOpen(false)}>
        <ThemedView style={styles.screen}>
          <SafeAreaView style={styles.flex}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setEditOpen(false)} hitSlop={10}>
                <ThemedText style={{ color: theme.accent }}>✕ {t.cancel}</ThemedText>
              </Pressable>
            </View>
            <Onboarding
              initial={profile}
              title={t.editBirth.toUpperCase()}
              onReady={(next) => {
                state.replaceProfile(next);
                setEditOpen(false);
              }}
            />
          </SafeAreaView>
        </ThemedView>
      </Modal>

      {/* Add another person */}
      <Modal visible={addOpen} animationType="slide" onRequestClose={() => setAddOpen(false)}>
        <ThemedView style={styles.screen}>
          <SafeAreaView style={styles.flex}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setAddOpen(false)} hitSlop={10}>
                <ThemedText style={{ color: theme.accent }}>✕ {t.cancel}</ThemedText>
              </Pressable>
            </View>
            <Onboarding
              title={t.addPerson.replace("+ ", "").toUpperCase()}
              onReady={(next) => {
                void state.addPersonProfile(next);
                setAddOpen(false);
              }}
            />
          </SafeAreaView>
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: 18, gap: 12, paddingBottom: BottomTabInset + 60 },
  eyebrow: { fontSize: 10, letterSpacing: 1.5, fontWeight: "700", marginTop: 8 },
  card: { borderRadius: 18, padding: 16, gap: 12 },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 13, paddingHorizontal: 14, fontSize: 16 },
  primary: { minHeight: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#fff", fontWeight: "700" },
  outlineButton: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 18,
  },
  error: { color: "#a84840" },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 10,
    marginBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  personMain: { flex: 1, gap: 2 },
  reminderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  reminderCopy: { flex: 1, gap: 3 },
  langRow: { flexDirection: "row", gap: 10 },
  langButton: { flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  methodCard: { borderRadius: 18, padding: 16, flexDirection: "row", gap: 14 },
  methodNumber: { fontSize: 22, fontWeight: "700" },
  methodCopy: { flex: 1, gap: 3 },
  notice: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 8 },
  modalHeader: { flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 18, paddingTop: 8 },
});

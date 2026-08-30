import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AssistantText } from "@/components/assistant-text";
import { Onboarding } from "@/components/onboarding";
import { Sheet } from "@/components/sheet";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useTheme } from "@/hooks/use-theme";
import { useAppState } from "@/lib/app-state";
import { sendReadingFeedback, sendTelemetry } from "@/lib/api";
import { threadTitle } from "@/lib/storage";
import type { Message } from "@/lib/types";

export default function ChatScreen() {
  const state = useAppState();
  const theme = useTheme();
  const [input, setInput] = useState("");
  const [threadsOpen, setThreadsOpen] = useState(false);
  const [muhurtaOpen, setMuhurtaOpen] = useState(false);
  const [renamingId, setRenamingId] = useState("");
  const [renameText, setRenameText] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  const { t, profile } = state;

  useEffect(() => {
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(timer);
  }, [state.messages.length, state.draft, state.busy]);

  if (!state.hydrated)
    return (
      <ThemedView style={styles.screen}>
        <SafeAreaView style={styles.centered}>
          <ActivityIndicator color={theme.accent} />
        </SafeAreaView>
      </ThemedView>
    );

  if (!profile)
    return (
      <ThemedView style={styles.screen}>
        <SafeAreaView style={styles.flex}>
          <Onboarding onReady={state.adoptProfile} />
        </SafeAreaView>
      </ThemedView>
    );

  const sendText = (text: string) => {
    setInput("");
    void state.send(text);
  };

  const chips: { key: string; label: string; onPress: () => void; active?: boolean }[] = [];
  if (!state.busy && !state.partner) {
    for (const suggestion of t.dailySuggestions)
      chips.push({ key: suggestion, label: suggestion, onPress: () => sendText(suggestion) });
    chips.push({
      key: "prashna",
      label: t.prashnaChip,
      active: state.prashnaMode,
      onPress: () => state.setPrashnaMode(!state.prashnaMode),
    });
    chips.push({ key: "muhurta", label: t.muhurtaChip, onPress: () => setMuhurtaOpen(true) });
    chips.push({ key: "btr", label: t.btrChip, onPress: () => sendText(t.btrAsk) });
    if (state.messages.length <= 1)
      for (const suggestion of t.suggestions)
        chips.push({ key: suggestion, label: suggestion, onPress: () => sendText(suggestion) });
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={["top"]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Pressable
              onPress={() => setThreadsOpen(true)}
              style={styles.headerTitle}
              hitSlop={8}>
              <ThemedText type="smallBold" numberOfLines={1}>
                Sahadeva · {profile.name}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {state.threads.length > 1 ? `${state.threads.length} ${t.chats.toLowerCase()} ▾` : `${profile.date} ▾`}
              </ThemedText>
            </Pressable>
            <Pressable onPress={state.newThread} hitSlop={10} style={[styles.headerButton, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText style={{ color: theme.accent, fontSize: 18 }}>✎</ThemedText>
            </Pressable>
          </View>

          {state.prashnaMode && (
            <View style={[styles.banner, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="small" style={styles.bannerText}>{t.prashnaBanner}</ThemedText>
              <Pressable onPress={() => state.setPrashnaMode(false)} hitSlop={8}>
                <ThemedText type="smallBold" style={{ color: theme.accent }}>{t.prashnaOff} ✕</ThemedText>
              </Pressable>
            </View>
          )}
          {state.partner && (
            <View style={[styles.banner, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="small" style={styles.bannerText}>
                ⚭ {t.comparingWith} {state.partner.name}
              </ThemedText>
              <Pressable onPress={state.clearPartner} hitSlop={8}>
                <ThemedText type="smallBold" style={{ color: theme.accent }}>{t.clearCompare} ✕</ThemedText>
              </Pressable>
            </View>
          )}

          {/* Messages */}
          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={styles.messages}
            keyboardShouldPersistTaps="handled">
            {state.messages.map((message, index) => (
              <MessageBubble
                key={`${index}-${message.role}`}
                message={message}
                language={profile.language}
                onFollowUp={() => {
                  setInput(t.followUpPrefill);
                  sendTelemetry("follow_up_started", { language: profile.language });
                }}
                onRegenerate={() => sendText(t.regenerateAsk)}
                t={t}
              />
            ))}
            {state.draft !== null && state.draft !== "" && (
              <View style={[styles.bubbleAssistant, { backgroundColor: theme.backgroundElement }]}>
                <AssistantText text={state.draft} />
              </View>
            )}
            {state.busy && !state.draft && (
              <View style={[styles.bubbleAssistant, styles.typing, { backgroundColor: theme.backgroundElement }]}>
                <ActivityIndicator size="small" color={theme.accent} />
                <ThemedText type="small" themeColor="textSecondary">{t.thinking}</ThemedText>
              </View>
            )}
            {state.error ? (
              <Pressable onPress={state.clearError} style={[styles.errorBanner, { borderColor: theme.border }]}>
                <ThemedText type="small" style={styles.errorText}>{state.error}</ThemedText>
              </Pressable>
            ) : null}
          </ScrollView>

          {/* Suggestion chips */}
          {chips.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipScroll}
              contentContainerStyle={styles.chipRow}
              keyboardShouldPersistTaps="handled">
              {chips.map((chip) => (
                <Pressable
                  key={chip.key}
                  onPress={chip.onPress}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: chip.active ? theme.accent : theme.backgroundElement,
                      borderColor: theme.border,
                    },
                  ]}>
                  <ThemedText type="small" style={{ color: chip.active ? "#fff" : theme.text }}>
                    {chip.label}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          )}

          {/* Composer */}
          <View style={[styles.composer, { borderTopColor: theme.border, backgroundColor: theme.background }]}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={t.composer}
              placeholderTextColor={theme.textSecondary}
              multiline
              style={[styles.composerInput, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            />
            <Pressable
              disabled={!input.trim() || state.busy}
              onPress={() => sendText(input)}
              style={[styles.send, { backgroundColor: theme.accent, opacity: !input.trim() || state.busy ? 0.5 : 1 }]}>
              <ThemedText style={styles.sendText}>↑</ThemedText>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Threads sheet */}
      <Sheet visible={threadsOpen} onClose={() => setThreadsOpen(false)} title={t.chats}>
        <ScrollView style={styles.threadList}>
          {[...state.threads]
            .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
            .map((thread) => (
              <View
                key={thread.id}
                style={[
                  styles.threadRow,
                  { borderColor: theme.border, backgroundColor: thread.id === state.activeThreadId ? theme.backgroundElement : "transparent" },
                ]}>
                {renamingId === thread.id ? (
                  <View style={styles.renameRow}>
                    <TextInput
                      value={renameText}
                      onChangeText={setRenameText}
                      autoFocus
                      maxLength={80}
                      style={[styles.renameInput, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
                    />
                    <Pressable
                      onPress={() => {
                        state.renameThread(thread.id, renameText.trim());
                        setRenamingId("");
                      }}
                      hitSlop={8}>
                      <ThemedText type="smallBold" style={{ color: theme.accent }}>{t.save}</ThemedText>
                    </Pressable>
                  </View>
                ) : (
                  <>
                    <Pressable
                      style={styles.threadMain}
                      onPress={() => {
                        state.switchThread(thread.id);
                        setThreadsOpen(false);
                      }}>
                      <ThemedText type="smallBold" numberOfLines={1}>
                        {threadTitle(thread, t.emptyChat)}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {thread.messages.length} · {new Date(thread.updatedAt).toLocaleDateString(profile.language === "te" ? "te-IN" : undefined)}
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setRenamingId(thread.id);
                        setRenameText(threadTitle(thread, t.emptyChat));
                      }}
                      hitSlop={8}>
                      <ThemedText type="small" style={{ color: theme.accent }}>{t.rename}</ThemedText>
                    </Pressable>
                    {thread.id !== state.activeThreadId && (
                      <Pressable onPress={() => state.deleteThread(thread.id)} hitSlop={8}>
                        <ThemedText type="small" style={styles.errorText}>{t.deleteChat}</ThemedText>
                      </Pressable>
                    )}
                  </>
                )}
              </View>
            ))}
        </ScrollView>
        <Pressable
          onPress={() => {
            state.newThread();
            setThreadsOpen(false);
          }}
          style={[styles.newThreadButton, { backgroundColor: theme.accent }]}>
          <ThemedText style={styles.sendTextSmall}>{t.newChat}</ThemedText>
        </Pressable>
      </Sheet>

      {/* Muhurta sheet */}
      <Sheet visible={muhurtaOpen} onClose={() => setMuhurtaOpen(false)} title={t.muhurtaTitle}>
        {Object.entries(t.muhurtaActivities).map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => {
              setMuhurtaOpen(false);
              void state.send(`${t.muhurtaAsk} ${label}`, { muhurta: { activity: key } });
            }}
            style={[styles.muhurtaRow, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">{label}</ThemedText>
          </Pressable>
        ))}
      </Sheet>
    </ThemedView>
  );
}

function MessageBubble({
  message,
  language,
  onFollowUp,
  onRegenerate,
  t,
}: {
  message: Message;
  language: "en" | "te";
  onFollowUp: () => void;
  onRegenerate: () => void;
  t: ReturnType<typeof useAppState>["t"];
}) {
  const theme = useTheme();
  const [feedbackSent, setFeedbackSent] = useState("");
  if (message.role === "user")
    return (
      <View style={[styles.bubbleUser, { backgroundColor: theme.accent }]}>
        <ThemedText style={styles.userText}>{message.content}</ThemedText>
      </View>
    );
  const long = message.content.length > 1200;
  return (
    <View style={styles.assistantWrap}>
      <View style={[styles.bubbleAssistant, { backgroundColor: theme.backgroundElement }]}>
        <AssistantText text={message.content} />
      </View>
      {long && (
        <View style={styles.qualityRow}>
          {[
            { key: "helpful", label: t.feedbackHelpful },
            { key: "unclear", label: t.feedbackUnclear },
            { key: "incorrect", label: t.feedbackIncorrect },
          ].map((option) => (
            <Pressable
              key={option.key}
              onPress={() => {
                sendReadingFeedback(message.content, "overall", option.key, language);
                setFeedbackSent(option.key);
              }}
              style={[styles.qualityChip, { borderColor: theme.border, backgroundColor: feedbackSent === option.key ? theme.backgroundSelected : "transparent" }]}>
              <ThemedText type="small">{option.label}</ThemedText>
            </Pressable>
          ))}
          <Pressable onPress={onFollowUp} style={[styles.qualityChip, { borderColor: theme.border }]}>
            <ThemedText type="small">{t.followUp}</ThemedText>
          </Pressable>
          <Pressable onPress={onRegenerate} style={[styles.qualityChip, { borderColor: theme.border }]}>
            <ThemedText type="small">{t.regenerate}</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => {
              void Share.share({ message: message.content }).catch(() => {});
              sendTelemetry("reading_shared", { language, characters: message.content.length });
            }}
            style={[styles.qualityChip, { borderColor: theme.border }]}>
            <ThemedText type="small">{t.shareReading}</ThemedText>
          </Pressable>
        </View>
      )}
      {feedbackSent !== "" && (
        <ThemedText type="small" themeColor="textSecondary">{t.feedbackSent}</ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  headerTitle: { flex: 1, gap: 1 },
  headerButton: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
  },
  bannerText: { flex: 1 },
  messages: { padding: 14, gap: 12, paddingBottom: 18 },
  bubbleUser: {
    alignSelf: "flex-end",
    maxWidth: "86%",
    borderRadius: 20,
    borderBottomRightRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userText: { color: "#fff", fontWeight: "500" },
  assistantWrap: { gap: 8 },
  bubbleAssistant: {
    alignSelf: "flex-start",
    maxWidth: "94%",
    borderRadius: 20,
    borderTopLeftRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  typing: { flexDirection: "row", alignItems: "center", gap: 10 },
  qualityRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  qualityChip: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  errorBanner: { borderWidth: 1, borderRadius: 14, padding: 12 },
  errorText: { color: "#a84840" },
  chipScroll: { flexGrow: 0 },
  chipRow: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, flexDirection: "row" },
  chip: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 13, paddingVertical: 8 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  composerInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 16,
  },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  sendText: { color: "#fff", fontSize: 22, fontWeight: "700" },
  sendTextSmall: { color: "#fff", fontWeight: "700" },
  threadList: { maxHeight: 420 },
  threadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  threadMain: { flex: 1, gap: 2 },
  renameRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  renameInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  newThreadButton: { minHeight: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  muhurtaRow: { minHeight: 52, borderRadius: 14, paddingHorizontal: 16, justifyContent: "center", marginBottom: 8 },
});

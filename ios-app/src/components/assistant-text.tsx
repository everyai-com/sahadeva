import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";

// Renders the assistant's minimal-markdown replies: paragraphs, headings,
// bullet/numbered lists and **bold** — the same subset the web client renders.
function InlineBold({ text, small }: { text: string; small?: boolean }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <ThemedText type={small ? "small" : "default"} style={styles.paragraph}>
      {parts.map((part, index) =>
        index % 2 ? (
          <ThemedText key={index} type={small ? "smallBold" : "default"} style={styles.bold}>
            {part}
          </ThemedText>
        ) : (
          part
        ),
      )}
    </ThemedText>
  );
}

export function AssistantText({ text }: { text: string }) {
  const theme = useTheme();
  const blocks = text.split(/\n{2,}/).filter((block) => block.trim().length > 0);
  return (
    <View style={styles.container}>
      {blocks.map((block, index) => {
        const lines = block.split("\n").filter((line) => line.trim().length > 0);
        const isList = lines.every((line) => /^\s*([-*•]|\d+[.)])\s+/.test(line));
        if (isList)
          return (
            <View key={index} style={styles.list}>
              {lines.map((line, i) => (
                <View key={i} style={styles.listRow}>
                  <ThemedText style={[styles.bullet, { color: theme.accent }]}>•</ThemedText>
                  <View style={styles.listBody}>
                    <InlineBold text={line.replace(/^\s*([-*•]|\d+[.)])\s+/, "")} />
                  </View>
                </View>
              ))}
            </View>
          );
        const heading = /^#{1,4}\s+/.test(block);
        if (heading)
          return (
            <ThemedText key={index} type="smallBold" style={styles.heading}>
              {block.replace(/^#+\s*/, "").replace(/\*\*/g, "")}
            </ThemedText>
          );
        return <InlineBold key={index} text={block} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  paragraph: { lineHeight: 24, fontWeight: "400" },
  bold: { fontWeight: "700" },
  heading: { fontSize: 17, lineHeight: 23, marginTop: 4 },
  list: { gap: 6 },
  listRow: { flexDirection: "row", gap: 8, paddingRight: 8 },
  bullet: { lineHeight: 24 },
  listBody: { flex: 1 },
});

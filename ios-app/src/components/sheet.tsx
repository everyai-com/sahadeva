import { Modal, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";

// Simple bottom sheet used for threads, muhurta and picker overlays.
export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.background, borderColor: theme.border }]}>
        <View style={[styles.handle, { backgroundColor: theme.border }]} />
        {title ? (
          <ThemedText type="smallBold" style={styles.title}>{title}</ThemedText>
        ) : null}
        {children}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(20,15,10,0.45)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "82%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 34,
    gap: 12,
  },
  handle: {
    alignSelf: "center",
    width: 42,
    height: 5,
    borderRadius: 4,
    marginBottom: 4,
  },
  title: { textAlign: "center", letterSpacing: 0.4 },
});

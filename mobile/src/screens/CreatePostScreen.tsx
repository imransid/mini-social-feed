import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api, ApiError } from "../api/client";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "CreatePost">;

const MAX = 500;

export default function CreatePostScreen({ navigation }: Props) {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const trimmed = content.trim();
  const canSubmit = trimmed.length > 0 && trimmed.length <= MAX && !busy;

  async function onSubmit() {
    setError(null);
    setBusy(true);
    try {
      await api.createPost(trimmed);
      navigation.goBack(); // Feed refreshes on focus.
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not publish your post.",
      );
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TextInput
        style={styles.input}
        placeholder="What's on your mind?"
        multiline
        autoFocus
        maxLength={MAX}
        value={content}
        onChangeText={setContent}
        editable={!busy}
      />
      <Text style={[styles.counter, trimmed.length > MAX && styles.counterOver]}>
        {trimmed.length}/{MAX}
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.button, !canSubmit && styles.buttonDisabled]}
        onPress={onSubmit}
        disabled={!canSubmit}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Post</Text>
        )}
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  input: {
    borderWidth: 1,
    borderColor: "#d0d0d0",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    minHeight: 140,
    textAlignVertical: "top",
  },
  counter: { alignSelf: "flex-end", color: "#888", marginTop: 6 },
  counterOver: { color: "#b91c1c" },
  error: { color: "#b91c1c", marginTop: 8 },
  button: {
    backgroundColor: "#1d4ed8",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  buttonDisabled: { backgroundColor: "#9aa8c7" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});

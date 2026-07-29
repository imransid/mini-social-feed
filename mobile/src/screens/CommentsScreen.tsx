import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api, ApiError } from "../api/client";
import type { PostComment } from "../api/types";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Comments">;

const MAX = 300;

export default function CommentsScreen({ route }: Props) {
  const { postId } = route.params;

  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.listComments(postId);
      setComments(res.data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not load comments.",
      );
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    load();
  }, [load]);

  const trimmed = draft.trim();
  const canSend = trimmed.length > 0 && trimmed.length <= MAX && !sending;

  async function onSend() {
    setSending(true);
    setError(null);
    try {
      const created = await api.createComment(postId, trimmed);
      setComments((prev) => [...prev, created]);
      setDraft("");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not post your comment.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      {loading ? (
        <ActivityIndicator style={styles.centered} size="large" />
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <View style={styles.comment}>
              <Text style={styles.author}>@{item.author.username}</Text>
              <Text style={styles.content}>{item.content}</Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>No comments yet. Start the thread.</Text>
          }
          contentContainerStyle={
            comments.length === 0 ? styles.emptyContainer : styles.listContent
          }
        />
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          placeholder="Add a comment…"
          value={draft}
          onChangeText={setDraft}
          maxLength={MAX}
          multiline
          editable={!sending}
        />
        <Pressable
          style={[styles.send, !canSend && styles.sendDisabled]}
          onPress={onSend}
          disabled={!canSend}
        >
          {sending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.sendText}>Send</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f5f7" },
  centered: { marginTop: 40 },
  listContent: { paddingVertical: 8 },
  comment: {
    backgroundColor: "#fff",
    marginHorizontal: 12,
    marginVertical: 4,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#eee",
  },
  author: { fontWeight: "700", color: "#1d4ed8", marginBottom: 4 },
  content: { fontSize: 15, lineHeight: 21, color: "#111" },
  empty: { textAlign: "center", color: "#777", marginTop: 40 },
  emptyContainer: { flexGrow: 1 },
  error: { color: "#b91c1c", paddingHorizontal: 16, paddingBottom: 4 },
  composer: {
    flexDirection: "row",
    padding: 10,
    gap: 8,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d0d0d0",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    maxHeight: 100,
  },
  send: {
    backgroundColor: "#1d4ed8",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 11,
    justifyContent: "center",
  },
  sendDisabled: { backgroundColor: "#9aa8c7" },
  sendText: { color: "#fff", fontWeight: "600" },
});

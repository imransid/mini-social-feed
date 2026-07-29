import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api, ApiError } from "../api/client";
import type { FeedPost } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { registerPushToken } from "../push/registerPushToken";
import PostCard from "../components/PostCard";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Feed">;

const PAGE_SIZE = 10;

export default function FeedScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);

  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filterInput, setFilterInput] = useState("");
  const [filter, setFilter] = useState<string | undefined>(undefined);

  // Guards against a focus-triggered refresh racing an in-flight page load.
  const loadingRef = useRef(false);

  const load = useCallback(
    async (opts: { page: number; username?: string; mode: "replace" | "append" }) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      try {
        const res = await api.listPosts({
          page: opts.page,
          limit: PAGE_SIZE,
          username: opts.username,
        });
        setPosts((prev) =>
          opts.mode === "append" ? [...prev, ...res.data] : res.data,
        );
        setPage(res.pagination.page);
        setPages(res.pagination.pages);
        setError(null);
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Could not load the feed.",
        );
      } finally {
        loadingRef.current = false;
      }
    },
    [],
  );

  // First load, plus a reload whenever the filter changes.
  useEffect(() => {
    setInitialLoading(true);
    load({ page: 1, username: filter, mode: "replace" }).finally(() =>
      setInitialLoading(false),
    );
  }, [filter, load]);

  // Coming back from Create Post should show the new post.
  useFocusEffect(
    useCallback(() => {
      load({ page: 1, username: filter, mode: "replace" });
    }, [filter, load]),
  );

  // Register this device for push once, after login. Failure is non-fatal.
  useEffect(() => {
    registerPushToken().then((res) => {
      if (res.status === "skipped") {
        console.log("[push] not registered:", res.reason);
      }
    });
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load({ page: 1, username: filter, mode: "replace" });
    setRefreshing(false);
  }, [filter, load]);

  const onEndReached = useCallback(async () => {
    if (loadingMore || loadingRef.current || page >= pages) return;
    setLoadingMore(true);
    await load({ page: page + 1, username: filter, mode: "append" });
    setLoadingMore(false);
  }, [loadingMore, page, pages, filter, load]);

  const onToggleLike = useCallback(async (post: FeedPost) => {
    // Optimistic: flip immediately, reconcile with the server's count after.
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? {
              ...p,
              likedByMe: !p.likedByMe,
              likeCount: p.likeCount + (p.likedByMe ? -1 : 1),
            }
          : p,
      ),
    );
    try {
      const res = await api.toggleLike(post.id);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, likedByMe: res.liked, likeCount: res.likeCount }
            : p,
        ),
      );
    } catch {
      // Roll back to the server's last known truth.
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? post : p)),
      );
    }
  }, []);

  const applyFilter = useCallback(() => {
    const next = filterInput.trim();
    setFilter(next.length > 0 ? next : undefined);
  }, [filterInput]);

  const clearFilter = useCallback(() => {
    setFilterInput("");
    setFilter(undefined);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Feed</Text>
          {user ? <Text style={styles.me}>@{user.username}</Text> : null}
        </View>
        <Pressable onPress={signOut} hitSlop={8}>
          <Text style={styles.logout}>Log out</Text>
        </Pressable>
      </View>

      <View style={styles.filterRow}>
        <TextInput
          style={styles.filterInput}
          placeholder="Filter by username"
          autoCapitalize="none"
          autoCorrect={false}
          value={filterInput}
          onChangeText={setFilterInput}
          onSubmitEditing={applyFilter}
          returnKeyType="search"
        />
        {filter ? (
          <Pressable style={styles.filterBtn} onPress={clearFilter}>
            <Text style={styles.filterBtnText}>Clear</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.filterBtn} onPress={applyFilter}>
            <Text style={styles.filterBtnText}>Apply</Text>
          </Pressable>
        )}
      </View>

      {filter ? (
        <Text style={styles.filterNote}>Showing posts by @{filter}</Text>
      ) : null}

      {error ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{error}</Text>
          <Pressable onPress={onRefresh}>
            <Text style={styles.bannerRetry}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {initialLoading ? (
        <ActivityIndicator style={styles.centered} size="large" />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onToggleLike={onToggleLike}
              onOpenComments={(p) =>
                navigation.navigate("Comments", {
                  postId: p.id,
                  commentCount: p.commentCount,
                })
              }
              onPressAuthor={(username) => {
                setFilterInput(username);
                setFilter(username);
              }}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {filter
                ? `No posts by @${filter} yet.`
                : "No posts yet. Be the first to post."}
            </Text>
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator style={styles.footerSpinner} /> : null
          }
          contentContainerStyle={posts.length === 0 ? styles.emptyContainer : undefined}
        />
      )}

      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate("CreatePost")}
      >
        <Text style={styles.fabText}>＋</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f5f7" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: "#fff",
  },
  title: { fontSize: 24, fontWeight: "700" },
  me: { color: "#666", fontSize: 13, marginTop: 2 },
  logout: { color: "#dc2626", fontWeight: "600" },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: "#fff",
    gap: 8,
  },
  filterInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d0d0d0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterBtn: {
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#1d4ed8",
  },
  filterBtnText: { color: "#fff", fontWeight: "600" },
  filterNote: { paddingHorizontal: 16, paddingVertical: 6, color: "#555" },
  banner: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fee2e2",
    padding: 12,
  },
  bannerText: { color: "#991b1b", flex: 1 },
  bannerRetry: { color: "#991b1b", fontWeight: "700" },
  centered: { marginTop: 40 },
  empty: { textAlign: "center", color: "#777", marginTop: 40 },
  emptyContainer: { flexGrow: 1 },
  footerSpinner: { marginVertical: 16 },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1d4ed8",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  fabText: { color: "#fff", fontSize: 30, lineHeight: 34 },
});

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { FeedPost } from "../api/types";

function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

type Props = {
  post: FeedPost;
  onToggleLike: (post: FeedPost) => void;
  onOpenComments: (post: FeedPost) => void;
  onPressAuthor: (username: string) => void;
};

export default function PostCard({
  post,
  onToggleLike,
  onOpenComments,
  onPressAuthor,
}: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Pressable onPress={() => onPressAuthor(post.author.username)}>
          <Text style={styles.author}>@{post.author.username}</Text>
        </Pressable>
        <Text style={styles.time}>{timeAgo(post.createdAt)}</Text>
      </View>

      <Text style={styles.content}>{post.content}</Text>

      <View style={styles.actions}>
        <Pressable
          style={styles.action}
          onPress={() => onToggleLike(post)}
          hitSlop={8}
        >
          <Text style={[styles.actionText, post.likedByMe && styles.liked]}>
            {post.likedByMe ? "♥" : "♡"} {post.likeCount}
          </Text>
        </Pressable>

        <Pressable
          style={styles.action}
          onPress={() => onOpenComments(post)}
          hitSlop={8}
        >
          <Text style={styles.actionText}>💬 {post.commentCount}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: "#eee",
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  author: { fontWeight: "700", fontSize: 15, color: "#1d4ed8" },
  time: { color: "#888", fontSize: 12 },
  content: { fontSize: 16, lineHeight: 22, marginTop: 8, color: "#111" },
  actions: { flexDirection: "row", marginTop: 14, gap: 20 },
  action: { flexDirection: "row", alignItems: "center" },
  actionText: { fontSize: 15, color: "#555" },
  liked: { color: "#dc2626", fontWeight: "700" },
});

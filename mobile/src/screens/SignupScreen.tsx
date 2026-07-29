import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/client";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Signup">;

export default function SignupScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Mirrors the backend's zod schema so the user gets feedback before a round trip.
  const usernameOk = username.trim().length >= 3 && username.trim().length <= 30;
  const passwordOk = password.length >= 6;
  const canSubmit = usernameOk && passwordOk && !busy;

  async function onSubmit() {
    setError(null);
    setBusy(true);
    try {
      await signUp(username.trim(), password);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.title}>Create account</Text>

      <TextInput
        style={styles.input}
        placeholder="Username (3–30 characters)"
        autoCapitalize="none"
        autoCorrect={false}
        value={username}
        onChangeText={setUsername}
        editable={!busy}
      />
      <TextInput
        style={styles.input}
        placeholder="Password (at least 6 characters)"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        editable={!busy}
      />

      {username.length > 0 && !usernameOk ? (
        <Text style={styles.hint}>Username must be 3–30 characters.</Text>
      ) : null}
      {password.length > 0 && !passwordOk ? (
        <Text style={styles.hint}>Password must be at least 6 characters.</Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.button, !canSubmit && styles.buttonDisabled]}
        onPress={onSubmit}
        disabled={!canSubmit}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign up</Text>
        )}
      </Pressable>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already registered? </Text>
        <Pressable onPress={() => navigation.navigate("Login")} disabled={busy}>
          <Text style={styles.link}>Log in</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  title: { fontSize: 28, fontWeight: "700", textAlign: "center", marginBottom: 28 },
  input: {
    borderWidth: 1,
    borderColor: "#d0d0d0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#1d4ed8",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { backgroundColor: "#9aa8c7" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  hint: { color: "#92400e", marginBottom: 6, fontSize: 13 },
  error: { color: "#b91c1c", marginBottom: 8 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  footerText: { color: "#666" },
  link: { color: "#1d4ed8", fontWeight: "600" },
});

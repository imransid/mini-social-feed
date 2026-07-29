import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, setAuthToken } from "../api/client";
import type { User } from "../api/types";

const TOKEN_KEY = "auth.token";
const USER_KEY = "auth.user";

type AuthState = {
  token: string | null;
  user: User | null;
  /** True until the persisted session has been read from storage. */
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore a previous session so the user isn't asked to log in every launch.
  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);
        if (storedToken) {
          setAuthToken(storedToken);
          setToken(storedToken);
          if (storedUser) setUser(JSON.parse(storedUser) as User);
        }
      } catch {
        // A corrupt session is not worth blocking startup for; start logged out.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (nextToken: string, nextUser: User) => {
    setAuthToken(nextToken);
    setToken(nextToken);
    setUser(nextUser);
    await AsyncStorage.multiSet([
      [TOKEN_KEY, nextToken],
      [USER_KEY, JSON.stringify(nextUser)],
    ]);
  }, []);

  const signIn = useCallback(
    async (username: string, password: string) => {
      const res = await api.login(username, password);
      await persist(res.token, res.user);
    },
    [persist],
  );

  const signUp = useCallback(
    async (username: string, password: string) => {
      const res = await api.signup(username, password);
      await persist(res.token, res.user);
    },
    [persist],
  );

  const signOut = useCallback(async () => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  }, []);

  const value = useMemo(
    () => ({ token, user, loading, signIn, signUp, signOut }),
    [token, user, loading, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

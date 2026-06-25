import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { setAuthToken } from "../services/api";

const TOKEN_KEY = "voxly_access_token";
const REFRESH_KEY = "voxly_refresh_token";
const USER_KEY = "voxly_user";

export type AuthUser = { id: string; email: string };

type AuthCtx = {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  signIn: (accessToken: string, refreshToken: string, user: AuthUser) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx>({
  token: null,
  user: null,
  isLoading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
        ]);
        if (storedToken && storedUser) {
          setAuthToken(storedToken);
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch {}
      setIsLoading(false);
    })();
  }, []);

  const signIn = useCallback(async (accessToken: string, refreshToken: string, newUser: AuthUser) => {
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, accessToken),
      SecureStore.setItemAsync(REFRESH_KEY, refreshToken),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(newUser)),
    ]);
    setAuthToken(accessToken);
    setToken(accessToken);
    setUser(newUser);
  }, []);

  const signOut = useCallback(async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
    setAuthToken(null);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

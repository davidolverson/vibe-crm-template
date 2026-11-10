import { createContext, useContext, useEffect, useState } from 'react';
import { sessionStore } from '../src/lib/token-cache';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { usePushNotifications } from '../src/lib/push-notifications';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

interface AuthState {
  isSignedIn: boolean;
  isLoaded: boolean;
  sessionToken: string | null;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  isSignedIn: false,
  isLoaded: false,
  sessionToken: null,
  signIn: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

function AuthGate() {
  const { isSignedIn, isLoaded } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Register for push notifications when authenticated
  usePushNotifications();

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isSignedIn && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (isSignedIn && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isSignedIn, isLoaded, segments]);

  return <Slot />;
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => {
    async function checkSession() {
      const token = await sessionStore.get();

      if (!token) {
        setIsLoaded(true);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/api/auth/get-session`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.session) {
            setSessionToken(token);
            setIsSignedIn(true);
          } else {
            await sessionStore.clear();
          }
        } else {
          await sessionStore.clear();
        }
      } catch {
        // Network error -- keep user signed out but don't clear token
        // so they can retry once connectivity is restored
      } finally {
        setIsLoaded(true);
      }
    }

    checkSession();
  }, []);

  async function signIn(token: string) {
    await sessionStore.save(token);
    setSessionToken(token);
    setIsSignedIn(true);
  }

  async function signOut() {
    const token = await sessionStore.get();

    try {
      await fetch(`${API_URL}/api/auth/sign-out`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {
      // Best-effort server sign-out; always clear local state
    }

    await sessionStore.clear();
    setSessionToken(null);
    setIsSignedIn(false);
  }

  return (
    <AuthContext.Provider value={{ isSignedIn, isLoaded, sessionToken, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <AuthGate />
    </AuthProvider>
  );
}

import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useAuth } from '../../app/_layout';
import { useRouter } from 'expo-router';
import { useApiFetch } from './api';

// Show notifications when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('[Push] Must use physical device');
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Push] Permission not granted');
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  return tokenData.data;
}

/**
 * Hook to register for push notifications and handle incoming ones.
 * Call once in the root layout when user is authenticated.
 */
export function usePushNotifications() {
  const { isSignedIn } = useAuth();
  const apiFetch = useApiFetch();
  const router = useRouter();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const responseListener = useRef<Notifications.Subscription>(undefined);

  useEffect(() => {
    if (!isSignedIn) return;

    // Register token
    getExpoPushToken().then(async (token) => {
      if (!token) return;
      setExpoPushToken(token);

      try {
        await apiFetch('/api/mobile/push-token', {
          method: 'POST',
          body: JSON.stringify({
            token,
            platform: Platform.OS,
          }),
        });
      } catch (err) {
        console.error('[Push] Failed to register token:', err);
      }
    });

    // Handle notification taps (navigate to relevant screen)
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as {
          type?: string;
          referenceType?: string;
          referenceId?: string;
        };

        const id = data.referenceId;
        const validId = id && UUID_RE.test(id);

        if (data.referenceType === 'contact' && validId) {
          router.push(`/contacts/${id}`);
        } else if (data.referenceType === 'task') {
          router.push('/(tabs)/tasks');
        } else if (data.referenceType === 'deal') {
          router.push('/(tabs)/pipeline');
        } else {
          router.push('/(tabs)');
        }
      },
    );

    // Set up Android notification channel
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'VIBE',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    return () => {
      responseListener.current?.remove();
    };
  }, [isSignedIn]);

  return { expoPushToken };
}

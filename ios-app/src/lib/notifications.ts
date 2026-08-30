import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { registerPushToken, unregisterPushToken } from "./api";

export type PushResult =
  | { ok: true; token: string }
  | { ok: false; reason: "unsupported" | "denied" | "unconfigured" | "failed" };

// Mints an Expo push token and registers it with the worker for the daily
// reminder. Remote push requires a real device + a dev/standalone build (Expo
// Go on SDK 53+ cannot receive remote notifications), and the app must have an
// EAS projectId configured — each of those is surfaced as a typed reason so the
// UI can explain what to do rather than failing silently.
export async function enableDailyReminder(hour: number, tzOffset: number): Promise<PushResult> {
  if (!Device.isDevice) return { ok: false, reason: "unsupported" };

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== "granted") return { ok: false, reason: "denied" };

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants.easConfig as { projectId?: string } | undefined)?.projectId;
  if (!projectId) return { ok: false, reason: "unconfigured" };

  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("daily-reminder", {
        name: "Daily reminder",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const registered = await registerPushToken(token, hour, tzOffset);
    return registered ? { ok: true, token } : { ok: false, reason: "failed" };
  } catch {
    return { ok: false, reason: "failed" };
  }
}

export async function disableDailyReminder(token?: string): Promise<void> {
  if (!token) {
    try {
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        (Constants.easConfig as { projectId?: string } | undefined)?.projectId;
      if (projectId) {
        const minted = await Notifications.getExpoPushTokenAsync({ projectId });
        token = minted.data;
      }
    } catch {
      /* best effort */
    }
  }
  if (token) await unregisterPushToken(token);
}

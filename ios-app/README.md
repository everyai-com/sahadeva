# Sahadeva — iOS app

Expo (SDK 57) client for Sahadeva. It calls the same worker API as the web app
and MCP; there is no separate interpretation engine. Four tabs: **Chat** (streaming
`/api/chat`, threads, prashna/muhurta/BTR), **Today** (daily panchanga + brief),
**Chart** (South-Indian D1/D9, dasha, strengths, topic judgments), and **More**
(accounts, people, language, share, daily reminder).

## Develop

```bash
npm install
npx expo start --go        # runs in Expo Go
```

`EXPO_PUBLIC_API_URL` overrides the worker base URL (defaults to the deployed worker).

## Verify

Run from the repo root:

```bash
npm run mobile:verify      # lint + tsc + web export
```

## Build with EAS

Local `expo run:ios` needs ~8 GB of free disk for a clean React Native build.
When that is not available, build in the cloud with EAS. Profiles are in `eas.json`:

```bash
npm i -g eas-cli
eas login
eas init                                        # mints the project, writes extra.eas.projectId to app.json
eas build --profile development --platform ios  # dev-client build (simulator), supports push
eas build --profile production --platform ios   # App Store binary
```

`development` and `preview` produce simulator builds; `production` auto-increments
the build number and targets the App Store.

## Push notifications (daily reminder)

The reminder toggle in **More** registers an Expo push token with the worker
(`POST /api/push/expo`); the worker cron sends the localized panchanga brief each
morning. Delivery requires:

1. An EAS `projectId` (created by `eas init` above) — `getExpoPushTokenAsync`
   reads it from `extra.eas.projectId`. Until then the toggle reports
   "requires a build with push configured".
2. A dev-client or standalone build — **Expo Go cannot receive remote push** on
   SDK 53+.
3. An APNs key registered with EAS: `eas credentials` → iOS → Push Key.

The worker needs no APNs certificate: it sends through Expo's push service. Set
`EXPO_ACCESS_TOKEN` as a worker secret only if you enable enhanced push security
in your Expo account (optional).

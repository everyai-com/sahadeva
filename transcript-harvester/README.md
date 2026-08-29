# Transcript Harvester

A fast, Cloudflare-hosted workspace for collecting existing captions from public YouTube playlists. A small Chrome extension makes caption requests from the user's browser session, then streams results into the React interface for inspection and export.

## What works

- Public YouTube playlist discovery, including modern `lockupViewModel` entries and continuation pages
- Manual and automatic caption tracks
- Preferred language ordering
- 1-12 concurrent caption requests
- Live per-video status and transcript inspection
- Search across video titles and channels
- TXT, Markdown, SRT, JSON and multi-format ZIP export
- Light and dark mode through the operating-system preference
- Cloudflare Worker API for server-side single-transcript exports

Transcripts remain in the browser in this first release. D1/R2 persistence and audio transcription are intentionally not enabled yet.

## Run locally

```bash
npm install
npm run dev
```

The development URL is normally `http://localhost:5173`.

## Install the Chrome extension

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose this project's `extension` directory.
5. Refresh the Transcript Harvester page.
6. Confirm that the header says **Extension connected**.

The extension only activates its bridge on localhost and Cloudflare hostnames beginning with `transcript-harvester`. Its YouTube permission is used for playlist pages, the InnerTube player response and timed-text caption tracks.

For a custom production domain, add the domain to `content_scripts.matches` in `extension/manifest.json` and to the `allowedOrigin` check in `extension/bridge.js` before distributing the extension.

## Deploy to Cloudflare

```bash
npm run deploy
```

The Vite Cloudflare plugin builds the React client and Hono Worker together. No database, bucket or API key is required for the caption-first version.

## Verify

```bash
npm run check
npm test
npm run build
node --check extension/background.js
node --check extension/bridge.js
```

## Processing model

The extension uses YouTube's public playlist page to enumerate videos. It requests the Android InnerTube player response for caption metadata because its signed caption URLs currently work more consistently than the equivalent web-player URLs. Caption files are requested as JSON3 and normalized into timestamped segments.

YouTube does not publish this as a supported transcript API. The parser can require maintenance when YouTube changes its internal response shapes. Requests can also be throttled. Keep concurrency moderate and only download content you have permission to use.

## Next production layers

- Save jobs and manifests in D1
- Store selected transcript exports in R2
- Resume interrupted playlist jobs
- Add an explicit audio-transcription fallback for permitted videos without captions
- Package and sign the extension for Chrome Web Store distribution


# BNY CRM Modem — Windows app

## Current delivery

This is a **portable Windows x64 app**, packaged as `release/BNY-CRM-Modem-1.0.0-Windows.zip`. It includes Electron, the tested Node 24 runtime, serial-port drivers for Node, and native audio libraries. Users do not install Node or run a local CRM backend.

The automatic installer, Windows startup registration, and browser app-link registration were blocked by automatic approval review. This package does not change those Windows settings. Open the app manually and use the live CRM **inside its window**. The ordinary browser website cannot open the portable app automatically.

## First-time setup

1. Extract the ZIP into a permanent folder, such as `Documents/BNY CRM Modem`. Keep all extracted files together.
2. Install the Huawei modem's Windows driver if it is not installed already. Confirm that Windows lists the PC UI and Application COM ports.
3. Close Mobile Partner, the old modem test server, and any other application using those ports.
4. Double-click `BNY CRM Modem.exe` in the extracted folder.
5. The app opens `https://bnycrm1.vercel.app`. Sign in with your normal CRM account.
6. Open **Call → GSM → Modem Setup**, plug in the modem, then click **Connect modem**.
7. Wait for **Connected to you**. If required, select the microphone and headphones in Advanced settings and reconnect.

The build is unsigned. It has not been signed with a Windows publisher certificate. Do not disable Windows protections; an organisation distributing it should sign the release and follow its software approval process.

## Daily use

Open the app, sign in, plug in the modem, and click Connect. Use the normal GSM dial, answer, mute and hang-up controls. Keep the Call page and app open for incoming calls; minimising is fine. Closing the app ends modem access. No terminal, batch file, port 3174 webpage or local backend is needed.

## How the connection works

- The live CRM authenticates the user and issues a modem-only ticket valid for 60 seconds.
- The desktop app accepts that ticket only from the main frame of `bnycrm1.vercel.app`. It does not expose filesystem, shell or raw serial APIs to the webpage.
- The native worker opens an outbound encrypted Socket.IO connection to `https://backend-4jwl.onrender.com/gsm-desktop`.
- Render verifies the ticket once and assigns that connection to the authenticated account. It never trusts a user ID supplied in a modem command.
- The app detects the Huawei control/voice ports and handles AT commands, PCM audio, microphone and speaker locally.
- Render routes controls to that account's modem only. Finished calls are saved under that account using an idempotent record ID.

There is no inbound local HTTP server. A modem must still be physically plugged into each caller's PC. The cloud does not gain direct access to Windows COM ports.

## Ownership and reconnecting

Only one desktop modem connection can belong to an account at a time. Different users on different PCs have separate connections. Logout releases ownership. If the Call page stops polling, ownership expires after about 90 seconds plus cleanup time. USB reinsertion is rescanned every three seconds while connected to the account. Internet interruption or a backend restart requires clicking Connect again. No CRM password or permanent login token is passed to the modem worker.

This backend registry is in memory: keep one Render backend process/instance, as configured. Multi-instance deployment needs a shared registry and cross-instance command routing before scaling. Sudden network loss may lose the final unfinished call record; audio is not recorded.

## Deployment

The desktop app requires both website and backend updates:

- Frontend repository: `DineshMurugan2022/nothing`, commit `a9c7bc8`. Vercel production deployment was verified Ready at `bnycrm1.vercel.app`.
- Render backend repository: `DineshMurugan2022/backend`, branch `main`, commit `9da1daa`. The modem update has been pushed to this repository. The development copy is also saved in `projectcrm` at `1d77201`. Render must deploy `9da1daa` before desktop connection can work.
- On Render, open service `backend-4jwl`, confirm repository `DineshMurugan2022/backend` and branch `main`, then deploy the latest commit if automatic deployment is disabled. This repository has `server.js` at its root: keep the Root Directory empty. Keep the existing database and JWT configuration. `ENABLE_MODEM=false` is appropriate on Render; USB processing happens in the app.

## Verified checks

- 23 backend/modem automated checks passed, including two-account isolation, one-use tickets, invalid/expired authentication, call logging and cleanup.
- Frontend production build passed.
- The bundled runtime loaded serialport, naudiodon and speaker and detected COM4/COM5 plus 21 audio-device entries on the development PC.
- The packaged app opened the live CRM login screen with its restricted bridge present and rejected an invalid ticket.

Still required after Render deployment: connect the physical modem through the app, make an outgoing call, verify two-way audio, receive a call, unplug/replug, and verify another account cannot see/control it. No new live phone call has been placed during this work.

## Build again

On Windows x64, install the modem project's dependencies first, then:

```
npm install --prefix desktop-modem
npm run dist --prefix desktop-modem
node desktop-modem/smoke.cjs
```

`build-worker.cjs` bundles the currently tested Node executable and native modules together to avoid Electron/Node native ABI mismatches. Rebuild and retest the native dependencies before changing that runtime.


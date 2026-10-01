# CRM USB modem calling

## Normal use

1. Start the normal CRM backend on the Windows PC with the USB modem.
2. Open CRM, sign in, and switch to **GSM**.
3. Plug in the Huawei modem and click **Connect modem** in Modem Setup.
4. Make calls or answer incoming calls from the GSM tab.

No separate port 3174 server, batch launcher, or pairing code is used by the CRM. The backend scans ports every three seconds. Install the Huawei driver once and close other applications holding the modem ports. Serial and audio packages are already backend dependencies; install the backend dependencies normally. Keep the `huawei-e173-test/lib` source folder alongside `backend`.

The frontend must use this backend's API address. A cloud backend cannot access a modem plugged into a different PC. Audio uses the backend PC's microphone and headphones.

## One modem, one user

Connect atomically assigns the backend PC's modem to the authenticated account. Other accounts see only “in use”; caller numbers, history and controls are private to the owner. Disconnect, logout, USB removal, or 90 seconds without the owner's Call page polling releases the modem (cleanup runs every three seconds). Keep the Call page open for incoming calls. After reinserting the modem, click Connect again.

This implementation supports one active modem per backend process. Each user who needs their own physical modem runs the backend on their own modem PC. Run one backend process on each modem PC; multiple processes must not compete for the same COM ports.

Call history is saved under the owner's account with duplicate protection. Audio is not recorded. Abrupt process termination can lose an unfinished call record.

## Checks

From the CRM root:

```
node --test backend/tests/gsm-local.cjs backend/tests/gsm-auth.cjs backend/tests/calls-regression.cjs
npm test --prefix huawei-e173-test
npm run build --prefix frontend
```

Hardware calls and two-way audio require testing with the actual modem, driver and SIM. The standalone test desk files are retained for development but are not started or used by the CRM backend.

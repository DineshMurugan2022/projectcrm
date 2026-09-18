# Calling fixes and verification

The calling changes address call finalization, shared mute state, microphone selection and replacement, single-owner remote playback, incoming answer/cancel/reject, bounded reconnect recovery, login/logout identity changes, lead lookup isolation, and call-log ownership checks.

## Automated checks

Run from the CRM root:

- npm test --prefix frontend -- --run src/services/sip/sipService.test.js src/components/sip/SipAudio.test.jsx src/contexts/SipContext.test.jsx
- node --test backend/tests/calls-regression.cjs
- npm run build --prefix frontend

These tests use simulated SIP sessions and mocked database operations. They do not contact CloudConnect or place calls.

## Live incoming-call acceptance test

1. Restart the backend to load the route changes, reload the frontend, and sign in with a user who has their own SIP username, password, domain, and extension configured.
2. Confirm the page shows Connected & Registered. Open Audio settings to select and test the microphone before a call.
3. From a second phone or PBX extension, call the inbound number routed by CloudConnect to this user's extension.
4. Confirm the incoming popup and ringtone appear, answer, and verify both people can hear each other.
5. Toggle microphone mute from the page and floating controls; both must show the same state. Speaker mute and volume must control the received audio.
6. Hang up and confirm call history shows completed with the elapsed duration.
7. Repeat once cancelling from the caller before answer (missed), and once rejecting in CRM (rejected).
8. Log out and confirm the SIP connection stops. Sign in with a different configured user and confirm the correct extension registers.

A passing automated test does not confirm inbound DID routing, PBX registration delivery, or physical audio. If no incoming INVITE reaches the browser, inspect CloudConnect's inbound routing and registration for that extension. No live incoming test has been performed by the agent.

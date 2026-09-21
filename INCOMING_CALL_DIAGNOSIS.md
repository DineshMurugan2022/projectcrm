# Incoming-call diagnosis — 19 September 2026

Target: caller **9843240703** → DID **8037565994** → CloudConnect extension **701**, SIP account **102597701**.

## Current conclusion

The fresh user-triggered incoming test produced **no incoming SIP INVITE on the monitored CRM browser WebSocket**. Therefore the browser had no incoming call to show. The precise upstream cause is not yet established: DID routing, contact selection and forwarding require CloudConnect-side logs/settings. Incoming delivery is **not confirmed fixed**.

No additional outgoing phone calls were placed during this incoming-call investigation.

## Live evidence (IST)

- Earlier outgoing test: a single dial to 9843240703 connected (`200 OK` / ACK), ended cleanly (BYE / `200 OK`), and was recorded as completed, 9 seconds.
- The user reported two incoming calls around **12:06**, both ringing on the caller's phone until ending. Their exact SIP path cannot be reconstructed from caller-side ringing alone.
- **12:08:23:** explicitly tested the documented registrar `sip:sip2.cloud-connect.in:7065` over `wss://sip2.cloud-connect.in:7443/`; registration succeeded.
- **12:11:28:** updated CRM registered successfully with that configuration. A fresh DevTools WebSocket capture was started, and the user confirmed a further incoming call with no popup. No inbound INVITE appeared in the capture.
- **12:13:31–12:13:33:** WSS disconnected abnormally with code `1006`, then reconnected and received a successful REGISTER response. After the code fix, service state and UI both returned to registered. The cause of the transport closure remains unknown.
- **12:14:01:** manual `Reset SIP` sent `REGISTER` with `Contact: *` and expiration zero. No SIP response arrived before the transaction timeout. Cleanup cannot be claimed successful. Registration was restored via Reconnect afterward.

Registration Call-ID for provider correlation: `fencqfjg5rj9a2m55uqg`. This is a **registration** Call-ID, not the missing incoming call's ID.

The REGISTER response advertised two bindings:

1. `sip:102597701@sip2.cloud-connect.in;transport=wss` — the monitored CRM contact, with 300-second expiration.
2. `sip:102597701@192.0.2.200;transport=ws;ob` — another contact, with roughly 1,700 seconds remaining.

The second contact's expiry was refreshed during observation, so it cannot safely be labelled merely an expired/stale record. Windows also showed two TCP connections to the CloudConnect WSS endpoint, one owned by Chrome and one by a ChatGPT process. Process ownership alone does not prove which account or contact the other connection represents. The user reports using only the monitored CRM client. No other process was terminated.

## Checks and limits

| Area | Finding |
| --- | --- |
| DNS / TCP / TLS / WSS | The browser establishes WSS and exchanges successful SIP responses. Periodic abnormal closes remain an observed transport issue. |
| Credentials / realm / account | REGISTER succeeds for full account 102597701. Earlier authentication challenges were followed by success; no evidence of a persistent bad-password failure. |
| Registrar and transport ports | Documented SIP registrar port 7065 tested successfully; WSS remains 7443. |
| Incoming delivery | No raw inbound INVITE in the fresh captured test. Provider-side route and contact selection are unverified. |
| SIP delegate / React listeners | `onInvite` exists; incoming subscribers are attached. |
| Busy/stale call | No active session at inspection, so there was no active CRM call blocking a new one. |
| Browser permissions | Secure context; online and visible; microphone permission granted; audio inputs available. |
| Popup / caller name | The popup is driven by `incomingCall`, emitted after an INVITE. Lead-name lookup happens afterward and does not block showing the number. No real inbound invitation was available to validate the popup end to end. |
| Audio / ICE / codecs | Earlier outbound call established. This does not establish incoming audio quality. Audio-stage faults cannot explain the absence of the incoming signaling request. |
| Backend logging | Incoming CRM log creation is triggered by receipt of an INVITE; the backend does not determine the provider's DID routing. |
| Duplicate contact cleanup | Extra binding observed; wildcard cleanup timed out. Provider must confirm active bindings and which one is called. |
| Provider DID / IVR / ring group / DND / forwarding | Not accessible from this CRM; cannot be ruled out without portal configuration or call trace. |

## Local changes made

Existing unrelated working-tree edits were preserved. Changes for this investigation:

- Restore the documented CloudConnect registrar port 7065 default while preserving explicit registrar configuration.
- Handle accepted re-registration even when SIP.js remains in the same `Registered` state after a WSS reconnect. Keep an already valid registration available during refresh.
- Use the same registration wrapper when recovering on tab visibility changes.
- Remove automatic wildcard deregistration on startup. It could skip the subsequent REGISTER because `unregister()` resolves when sent, before its transaction completes.
- Wait for deregistration before stopping the transport, avoiding premature closure and the observed shutdown timeout.
- For manual reset, wait for the SIP transaction response/timeout, attempt re-registration afterward, and report whether cleanup was actually accepted.
- Attach raw traffic diagnostics before startup registration; omit empty keepalives so they do not evict real messages.
- Add regression coverage; update the pre-existing login test to check no connection before authentication without requiring an unnecessary initial disconnect.

Validation: **27 tests passed** across SIP service, context and audio tests. The final production build passed (with existing bundle-size/mixed-import warnings), and git diff --check passed. At 12:18:08 IST the browser remained connected and registered with no active session.

## Required provider-side inspection

1. Locate the call(s) from **9843240703** to **8037565994** on **19 September 2026**, around **12:06 IST** and the fresh test during **12:11–12:14 IST**.
2. Verify DID normalization (national vs +91), tenant/account, time rules, IVR, queue/ring group and final route to **102597701 / 701**. Check DND, forwarding and simultaneous-registration policy.
3. Retrieve the inbound SIP Call-ID, final routing target, selected contact, and INVITE/response ladder. Caller-side ringing is not proof that this browser received an INVITE.
4. Inspect registrar/location bindings and the received WSS flow for both contacts above. Confirm delivery to the current Chrome WSS connection, including any edge-proxy Path/Route handling.
5. Explain why the wildcard deregistration received no response, and why this WSS connection periodically closes with code 1006.
6. After provider correction, repeat one inbound call while capturing: incoming INVITE → ringing response/popup → Answer → 200 OK/ACK → two-way audio → BYE and completed inbound log.

## Evidence files

- [Sanitized SIP summary](.playwright-mcp/incoming-2026-09-19-sip-summary.json)
- [Sanitized live capture](.playwright-mcp/incoming-2026-09-19-live-capture.txt)
- Configuration reference: `Customer_Integration_Guide_SIP_Registration_over_WebSocket_WSS.pdf`, especially pages 1–3. It specifies registrar `sip:sip2.cloud-connect.in:7065` and WSS port 7443.

Authorization/password headers and media payloads are excluded from the saved diagnostic summaries. No provider message was sent and no provider configuration was changed.


## Follow-up: exact `si2.cloud-connect.in:7065` test

The user supplied this hostname explicitly after the initial investigation. The CRM login initially reached a separate billing application's backend occupying localhost:5000; this was an application-port conflict, not a demonstrated credential failure. The CRM backend was started on port 5001, and local frontend API/Socket.IO settings plus backend PORT were updated accordingly. Login to the CRM then succeeded.

The exact requested SIP domain/registrar was tested as `si2.cloud-connect.in:7065`, retaining the existing WSS transport at `wss://sip2.cloud-connect.in:7443/`. WSS connected, but REGISTER received no incoming SIP response and the SIP client reported transaction timeout 408. Both the system DNS resolver and public resolver 1.1.1.1 returned no DNS record for `si2.cloud-connect.in`. A SIP domain can be logical when using a separate proxy, so DNS alone is not conclusive; the live registration also failed.

The si2 domain was not saved to the account or permanent SIP configuration. The previous sip2 configuration was restored for a control check. No phone call was placed during this test. Ask CloudConnect to confirm whether the supplied hostname intentionally omits the `p` and provide the matching SIP realm, registrar, and WSS endpoint.

Control-check result: the restored sip2.cloud-connect.in:7065 configuration also timed out with 408 during this follow-up, despite WSS being connected. The CRM is currently not SIP-registered. This prevents attributing the live failure solely to the si2 spelling; provider signaling/availability must also be checked.

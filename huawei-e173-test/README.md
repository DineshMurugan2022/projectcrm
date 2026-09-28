# Huawei Call desk

A local interface for making and receiving calls through a Huawei E173 modem.

## Start

Run `npm start`, then open http://127.0.0.1:3174. If dependencies are missing, run `npm install` first. Only one app can use the modem's COM ports at a time.

## Use

1. Select the control port (COM4) and voice port (COM5).
2. Select your microphone and headphones. Leave playback on **Low latency**. Use **Test speaker** to check the output.
3. Click **Connect modem** and check the SIM and network status.
4. Enter a number and press **Call**, or press **Answer** when an incoming call appears.
5. Use **Mute microphone** and **Hang up** as needed.

Keep the server running to receive calls. Closing the browser does not end a call. Audio uses the Windows devices on this PC. Call history and activity logs are kept in memory; call audio is not recorded.

Compatible playback is available as a fallback, but adds about four seconds of buffering. If a COM port is busy, close other modem apps. Reconnect after a command timeout.

## Checks

Run `npm test` for the five automated tests covering call state, serial responses, cleanup, input validation and HTTP request protection.

Real outgoing and incoming calls were tested on 28 September 2026 with the Huawei E1731 and Logitech headset. The user confirmed two-way speech and acceptable delay in low-latency mode. Other hardware and long-duration reliability have not been tested.

## Files

- `server.js`: local HTTP server.
- `lib/`: modem control and audio streaming.
- `public/`: calling interface.
- `tests/`: automated checks.

To use a different HTTP port, run `node server.js --port=3175`.

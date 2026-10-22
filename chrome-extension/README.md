# B&Y CRM Click-to-Call Chrome Extension

This extension intercepts phone number clicks on Google Search, Google Business Profiles, and other websites, then opens the hosted B&Y CRM Call page. The CRM uses the signed-in user's CloudConnect PBX extension to place the call.

## How to Install (Takes 10 Seconds):

1. Open **Google Chrome** and go to: `chrome://extensions/`
2. Turn ON **"Developer mode"** (toggle in the top-right corner of Chrome).
3. Click **"Load unpacked"** (top-left button).
4. Select this folder: `f:\dineshworks\CRM\chrome-extension`

Done! When you click a phone number, Chrome opens `https://bnycrm1.vercel.app/call` with that number. Sign in to the CRM first. The PBX calls the configured agent extension, then bridges to the customer.

This Chrome extension opens a regular Chrome CRM tab. The portable Windows modem EXE is a separate app; to place a PBX call in that window, open its Call page and use the PBX/SIP dialer there. The modem connection is only needed for GSM calls.

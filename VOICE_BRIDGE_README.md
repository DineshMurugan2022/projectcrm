# Voice Calling Bridge for Huawei E173 GSM Modem

This application provides a simple interface to control a Huawei E173 GSM modem for voice calls via a web interface.

## Features

- Make voice calls using the ATD command with semicolon suffix (required for voice calls)
- Hang up calls using the ATH command
- Simple React frontend with call and hangup buttons
- Express.js backend that communicates with the GSM modem via serial port

## Hardware Requirements

- Huawei E173 GSM modem connected via USB
- Modem must be accessible on COM10 (Windows) at 9600 baud rate

## Backend API Endpoints

- `POST /voice/call` - Initiate a voice call
  - Request body: `{ "phoneNumber": "1234567890" }`
  - Response: `{ "success": true, "message": "Call initiated to 1234567890" }`

- `POST /voice/hangup` - End current call
  - Response: `{ "success": true, "message": "Call hung up successfully" }`

## Setup Instructions

1. Ensure your Huawei E173 GSM modem is connected to COM10
2. Install dependencies:
   ```bash
   cd backend
   npm install serialport
   ```
3. Start the backend server:
   ```bash
   npm start
   # or
   node server.js
   ```
4. Start the frontend (in a separate terminal):
   ```bash
   cd frontend
   npm run dev
   ```

## Usage

1. Open the frontend in your browser (usually http://localhost:5173)
2. Enter the phone number you wish to call
3. Click the "Call" button to initiate the call
4. Click the "Hang Up" button to end the call

## Technical Notes

- The ATD command automatically includes a semicolon (`;`) at the end to ensure voice call mode
- The application validates phone numbers by removing non-numeric characters except the `+` sign
- Serial communication has a 5-second timeout for command responses
- The application checks for "OK" or "ERROR" responses from the modem to confirm command execution
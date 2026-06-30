# 🎵 Maestro Frontend

> Real-time Affective Music Generation App built with React Native & Expo. 

Maestro Frontend is an interactive, cross-platform mobile and web application that generates real-time piano music driven by user emotions. It maps biological signals (BVP, GSR, SKT) to valence-arousal space using Russell's Circumplex Model of Affect and plays dynamically generated REMI music tokens using a browser-based polyphonic Web Audio synthesizer.

---

## 🚀 Quick Start (Running the Frontend)

Follow these steps to run the frontend application on your machine:

### 1. Prerequisites
Ensure you have the following installed:
* [Node.js](https://nodejs.org/) (v18 or higher recommended)
* npm (bundled with Node.js) or yarn
* [Expo Go](https://expo.dev/go) app on your physical iOS/Android device (optional, if you want to test on mobile)

### 2. Install Dependencies
Navigate into the `maestro-app` directory and install the required packages:
```bash
cd maestro-app
npm install
```

### 3. Start the Development Server
Run the Expo CLI start script:
```bash
npm run start
# or
npx expo start
```

### 4. Choose Your Target Platform
* **Web (Recommended for Synthesis):** Press **`w`** in the terminal (or run `npm run web`). This opens the app in your default web browser.
* **Android:** Press **`a`** in the terminal (or run `npm run android`) to run in an Android Emulator or connected device.
* **iOS:** Press **`i`** in the terminal (or run `npm run ios`) to run in the iOS Simulator.
* **Expo Go (Physical Device):** Scan the QR code displayed in the terminal using the Expo Go app (Android) or the native Camera app (iOS).

---

## 🔌 Connecting to the Backend Server

The frontend streams signal data and receives generated REMI music tokens via a WebSocket connection to the Maestro backend inference server.

* **Default Connection:** The app defaults to connecting to `ws://localhost:8000`.
* **Physical Device Setup:** If running on a physical phone via Expo Go, the device **must** be on the same Wi-Fi network as your computer. You will need to change the WebSocket URL in the app's connection settings panel to use your computer's local IP address (e.g., `ws://192.168.1.50:8000`).

### Running the Backend Server
To spin up the WebSocket backend server, run the following command in your backend directory:
```bash
uvicorn src.core.inference_ws_server:app --host 0.0.0.0 --port 8000
```

---

## 🛠️ Key Features & Components

* **Affective Music Synthesis (`src/services/webAudioSynth.ts`):** A custom polyphonic synthesizer built using the browser's Web Audio API. It features detuned oscillators, ADSR envelopes, velocity-mapped lowpass filters, synthetic convolution reverb, and master compression. Note: playback is optimized for Web browsers.
* **Signal CSV Streaming (`src/services/csvParser.ts`):** Allows uploading files containing raw physiological signal streams (Blood Volume Pulse (BVP), Galvanic Skin Response (GSR), Skin Temperature (SKT) @ 1000Hz) to simulate patient/user streaming.
* **Demo Simulator (`src/services/signalSimulator.ts`):** Generates synthetic physiological signals directly on-device so you can test the application pipeline without a file or active server.
* **Russell's Circumplex Chart (`src/components/circumplex/CircumplexChart.tsx`):** A dynamic UI visualization displaying current valence and arousal coordinate estimations in 2D affective space.
* **Zustand State Stores (`src/store`):**
  * `musicStore.ts`: Manages playback state and the buffer of active REMI music tokens.
  * `inferenceStore.ts`: Tracks latest mood prediction coordinate outputs.
  * `connectionStore.ts`: Manages WebSocket connection state to the uvicorn backend.

---

## 📂 Directory Structure

```text
maestro-frontend/
├── maestro-app/
│   ├── assets/              # Static media assets, icons, and hero illustrations
│   ├── src/
│   │   ├── components/      # UI components (circumplex chart, buttons, layout cards)
│   │   ├── navigation/      # React Navigation setup (Home ↔ Calibrate ↔ Music)
│   │   ├── screens/         # Screen containers (HomeScreen, CalibrateScreen, MusicScreen)
│   │   ├── services/        # WebAudio synthesizer, REMI decoder, CSV parser
│   │   ├── store/           # Zustand stores for state management
│   │   └── theme/           # Theming context (dark/light mood adaptive styling)
│   ├── App.tsx              # Application entry point
│   ├── app.json             # Expo configuration file
│   └── package.json         # Scripts and project dependencies
└── README.md                # Root project documentation (this file)
```

---

## ⚠️ Notes & Troubleshooting

1. **Audio Autoplay Blocked:** Modern web browsers block audio from playing automatically before the user interacts with the page. Click anywhere on the screen or press the **"Start Engine" / "Play"** buttons to resume the AudioContext.
2. **Web Audio support on native:** The Web Audio synthesizer runs natively on the web. On native iOS/Android builds, Web Audio APIs are unavailable, so it runs as a no-op placeholder. Use the Web platform for audio playback capabilities.
3. **TypeScript Build Info:** If you run into build errors related to cache configurations or TypeScript version mismatches, clear the Expo cache by running `npx expo start -c`.

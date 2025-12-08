# SafeTrace X Frontend

A beautiful, modern React frontend for the SafeTrace X intelligent safety routing system.

## Features

- 🗺️ Interactive map with route visualization
- 🛡️ Multiple routing modes (Safe, Balanced, Stealth, Escort)
- ⚠️ Real-time safety monitoring and alerts
- 🆘 Emergency SOS with guardian sharing
- 📱 Responsive design
- 🎨 Modern UI with Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Build

```bash
npm run build
```

## Configuration

The frontend expects the backend API to be running at `http://localhost:8000` by default. You can override this by setting the `VITE_API_URL` environment variable.

## Project Structure

```
frontend/
├── src/
│   ├── components/     # Reusable React components
│   ├── pages/          # Page components
│   ├── services/       # API service layer
│   └── App.tsx         # Main app component
├── public/             # Static assets
└── package.json
```


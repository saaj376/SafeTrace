# SafeTrace X - Intelligent Safety Routing System

A comprehensive safety routing application with real-time hazard monitoring, emergency SOS features, and intelligent route planning.

## 🚀 Features

- **Intelligent Route Planning**: Multiple routing modes (Safe, Balanced, Stealth, Escort)
- **Real-time Safety Monitoring**: Continuous hazard detection and route deviation alerts
- **Emergency SOS System**: Live location sharing with guardian dashboard
- **Interactive Map**: Beautiful map interface with route visualization
- **Modern UI**: Responsive design with Tailwind CSS

## 📁 Project Structure

```
.
├── backend/          # FastAPI backend service
├── frontend/         # React + TypeScript frontend
└── README.md
```

## 🛠️ Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install Python dependencies (recommended: use a virtual environment):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install fastapi uvicorn pydantic
# Install other dependencies as needed
```

3. Ensure data files are present:
   - `data/safe_graph.gpickle`
   - `data/hourly_risk_data.csv`

4. Start the backend server:
```bash
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## 🎯 Usage

1. **Plan a Route**:
   - Set your start and end points (or use current location)
   - Select a routing mode
   - Click "Calculate Route" to see the safest path

2. **Monitor Safety**:
   - Once a route is active, the system automatically monitors for hazards
   - Alerts will appear if hazards are detected or you deviate from the route

3. **Emergency SOS**:
   - Click "Activate SOS" to start emergency tracking
   - Share the guardian link with trusted contacts
   - They can view your real-time location on the guardian dashboard

## 🔧 Configuration

### Backend
- API endpoints are configured in `backend/routes/`
- Routing modes and weights can be adjusted in `backend/config.py`

### Frontend
- API URL can be configured via `VITE_API_URL` environment variable
- Default: `http://localhost:8000`

## 📝 API Endpoints

- `POST /route/{mode}` - Calculate a route
- `POST /alerts/check-status` - Check for safety alerts
- `POST /alerts/reroute` - Recalculate route
- `POST /sos/activate` - Activate SOS session
- `POST /sos/location-update` - Update location
- `GET /sos/status/{token}` - Get guardian status
- `POST /sos/deactivate` - Deactivate SOS

## 🎨 Tech Stack

### Backend
- FastAPI
- Python 3.8+

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Leaflet (maps)
- React Router

## 📄 License

This project is part of the SafeTrace X system.


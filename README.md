# FieldMaster App

FieldMaster is a React Native application designed for accurate and efficient land measurement and management. It provides tools for mapping, fencing, plantation planning, and more.

## Features

- **Map Templates**: Save and manage map templates with detailed information.
- **Land Measurement**: Calculate area and perimeter using GPS points.
- **Fencing Setup**: Plan and visualize fencing with gate details.
- **Plantation Management**: Configure plantation details like plant type, spacing, and density.
- **Clear Land**: Manage land clearing efforts with detailed calculations.
- **Responsive Design**: Optimized for various screen sizes using `react-native-responsive-dimensions`.

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MongoDB (for backend)
- Expo CLI (for frontend development)

## Setup Instructions

### Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   - Create a `.env` file in the `backend` directory.
   - Add the following variables:
     ```
     MONGO_URI=<your-mongodb-connection-string>
     PORT=5000
     ```
4. Start the server:
   ```bash
   npm start
   ```

### Frontend

1. Navigate to the frontend directory:
   ```bash
   cd frontend/app
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Expo development server:
   ```bash
   expo start
   ```

## Folder Structure

```
fieldmaster-app/
├── backend/
│   ├── models/
│   ├── routes/
│   ├── server.js
│   └── ...
├── frontend/
│   ├── app/
│   │   ├── src/
│   │   │   ├── screens/
│   │   │   ├── components/
│   │   │   ├── styles/
│   │   │   └── ...
│   │   ├── App.js
│   │   └── ...
│   └── ...
└── README.md
```

## Key Technologies

- **Frontend**: React Native, Expo, React Navigation
- **Backend**: Node.js, Express.js, MongoDB
- **Styling**: React Native Paper, Responsive Dimensions
- **Mapping**: `react-native-maps`, Turf.js

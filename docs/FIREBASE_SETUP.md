# Firebase Project Configuration Guide

This guide walks you through setting up Firebase Authentication for the CALIPAR platform.

## Prerequisites

- A Google account
- Access to [Firebase Console](https://console.firebase.google.com/)

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" (or "Add project")
3. Enter project name: `calipar-lamc` (or your preferred name)
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project" and wait for completion

## Step 2: Enable Email/Password Authentication

1. In your Firebase project, navigate to **Build > Authentication**
2. Click "Get started" if this is your first time
3. Go to the **Sign-in method** tab
4. Click on **Email/Password**
5. Enable the first toggle: "Email/Password"
6. (Optional) Enable "Email link (passwordless sign-in)" for passwordless auth
7. Click **Save**

## Step 3: Get Frontend Configuration (Web App)

1. In your Firebase project, click the **gear icon** next to "Project Overview"
2. Select **Project settings**
3. Scroll down to "Your apps" section
4. Click the web icon (`</>`) to add a web app
5. Register your app with nickname: `calipar-frontend`
6. (Optional) Check "Also set up Firebase Hosting"
7. Click **Register app**
8. Copy the Firebase configuration object:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

## Step 4: Get Backend Configuration (Service Account)

1. In Firebase Console, go to **Project settings** (gear icon)
2. Navigate to the **Service accounts** tab
3. Click **Generate new private key**
4. Click **Generate key** in the confirmation dialog
5. A JSON file will download - this is your `serviceAccountKey.json`

**IMPORTANT: Security Warning**
- Never commit `serviceAccountKey.json` to version control
- Store it securely and treat it like a password
- The file is already added to `.gitignore`

## Step 5: Configure Environment Variables

### Backend (.env)

Create or update your `.env` file in the project root:

```bash
# Firebase Backend Configuration
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_SERVICE_ACCOUNT_PATH=./backend/serviceAccountKey.json
```

Place the downloaded `serviceAccountKey.json` in the `backend/` directory.

### Frontend Environment Variables

Add these to your `.env` file (or `.env.local` for Next.js):

```bash
# Firebase Frontend Configuration (NEXT_PUBLIC_ prefix required)
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Optional: Use Firebase Auth Emulator for local development
# NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL=http://localhost:9099
```

## Step 6: Service Account Key Template

The `serviceAccountKey.json` file has this structure:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "key-id-here",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project-id.iam.gserviceaccount.com"
}
```

## Step 7: Security Rules Configuration

### Firestore Security Rules (if using Firestore)

While CALIPAR primarily uses PostgreSQL, if you use Firestore for any features, configure these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only authenticated users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Program reviews - accessible by authenticated users in same org
    match /reviews/{reviewId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
                      request.auth.token.role in ['Faculty', 'Chair', 'Dean', 'Admin'];
    }

    // Default deny all
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Firebase Storage Security Rules (if using Storage)

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Only authenticated users can upload
    match /uploads/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // Publicly readable assets
    match /public/{allPaths=**} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

## Step 8: Create Test Users

### Via Firebase Console

1. Go to **Authentication > Users** in Firebase Console
2. Click **Add user**
3. Enter email and password
4. Create users for each role:

| Role | Email | Purpose |
|------|-------|---------|
| Admin | admin@college.edu | System administrator |
| Dean | dean@college.edu | Academic dean |
| Chair | chair@college.edu | Department chair |
| Faculty | faculty@college.edu | Faculty member |
| PROC | proc@college.edu | Program Review Oversight Committee |

### Via Backend Seed Script

With Firebase configured, run the backend seed script:

```bash
cd backend
python seed.py
```

This will create corresponding user records in the PostgreSQL database linked to Firebase UIDs.

## Step 9: Verify Configuration

### Check Frontend Firebase Status

1. Start the frontend: `npm run dev`
2. Open browser console
3. Look for successful Firebase initialization (no errors)
4. Check the login page loads without errors

### Check Backend Firebase Status

1. Start the backend: `uvicorn main:app --reload`
2. Check startup logs for: "Firebase Admin SDK initialized successfully"
3. If you see "Running in development mode", Firebase is not configured

### Test Authentication Flow

1. Navigate to `/login`
2. Enter test user credentials
3. Verify successful login redirects to dashboard
4. Check backend logs for successful token verification

## Troubleshooting

### "Firebase app already exists" Error

This usually means Firebase is being initialized multiple times. The code handles this by checking `getApps()` before initialization.

### "Invalid API key" Error

- Verify the API key in your environment variables matches Firebase Console
- Ensure the key is properly quoted in `.env` file
- Restart the development server after changes

### "Token verification failed" Error

- Check that `serviceAccountKey.json` is in the correct location
- Verify the service account has proper permissions
- Ensure the project ID matches between frontend and backend

### CORS Errors

The backend is configured to allow requests from `http://localhost:3000`. If using a different port:

1. Update `main.py` CORS configuration
2. Add your frontend URL to `allow_origins`

## Development Mode (Without Firebase)

The CALIPAR backend supports running without Firebase for local development:

1. Don't configure Firebase environment variables
2. Backend will log: "Running in development mode"
3. Authentication will be bypassed for development
4. **Warning**: Never deploy without proper Firebase authentication

## Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Auth Web SDK](https://firebase.google.com/docs/auth/web/start)
- [Firebase Admin SDK Python](https://firebase.google.com/docs/admin/setup)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)

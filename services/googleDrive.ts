// --- GOOGLE DRIVE SERVICE (REAL IMPLEMENTATION) ---
import { storageService } from './storage';

// Declare gapi on window
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

export const googleDriveService = {
  isInitialized: false,
  cachedSettings: null as { clientId: string, apiKey: string } | null,

  // Load settings once and cache them
  loadSettings: async () => {
    if (googleDriveService.cachedSettings) return googleDriveService.cachedSettings;
    const settings = await storageService.getAppSettings();
    if (settings.googleDriveClientId && settings.googleDriveApiKey) {
        googleDriveService.cachedSettings = {
            clientId: settings.googleDriveClientId,
            apiKey: settings.googleDriveApiKey
        };
    }
    return googleDriveService.cachedSettings;
  },

  initClient: async (): Promise<boolean> => {
    // 1. If already fully initialized, return true immediately
    if (googleDriveService.isInitialized && window.gapi?.auth2?.getAuthInstance()) {
        return true;
    }

    console.log("Google Drive Service: Initializing...");

    // 2. Fetch Credentials (use cache if available to be fast)
    const creds = await googleDriveService.loadSettings();
    
    if (!creds) {
        console.warn("Google Drive Service: Missing Client ID or API Key in Settings.");
        return false; 
    }

    if (!window.gapi) {
        console.error("Google API Script not loaded.");
        return false;
    }

    return new Promise((resolve) => {
        window.gapi.load('client:auth2', async () => {
            try {
                await window.gapi.client.init({
                    apiKey: creds.apiKey,
                    clientId: creds.clientId,
                    discoveryDocs: DISCOVERY_DOCS,
                    scope: SCOPES,
                    plugin_name: "ZoomClone"
                });
                
                googleDriveService.isInitialized = true;
                console.log("Google Drive Service: GAPI Initialized.");
                resolve(true);
            } catch (error: any) {
                console.error("Error initializing GAPI client", error);
                if (error.details) console.error(error.details);
                // Common error: "idpiframe_initialization_failed" happens if 3rd party cookies blocked
                resolve(false);
            }
        });
    });
  },

  signIn: async (): Promise<boolean> => {
    // Fast check if already signed in
    if (googleDriveService.isInitialized) {
         const auth = window.gapi.auth2.getAuthInstance();
         if (auth && auth.isSignedIn.get()) return true;
    }

    // Initialize if needed (this might take time and trigger popup blocker if called late)
    if (!googleDriveService.isInitialized) {
        const success = await googleDriveService.initClient();
        if (!success) {
            console.error("Sign-in aborted: Initialization failed.");
            return false;
        }
    }

    const GoogleAuth = window.gapi.auth2.getAuthInstance();
    
    try {
        await GoogleAuth.signIn({ prompt: 'select_account' });
        return true;
    } catch (error) {
        console.error("Sign in error/cancelled", error);
        return false;
    }
  },

  uploadVideo: async (blob: Blob, filename: string): Promise<string> => {
    // Note: signIn() must be called manually BEFORE this function in the UI event handler
    // to ensure popup is not blocked. We check again here just in case.
    const signedIn = await googleDriveService.signIn();
    if (!signedIn) throw new Error("User not signed in to Google.");

    console.log(`Google Drive Service: Uploading ${filename}...`);

    const authInstance = window.gapi.auth2.getAuthInstance();
    const currentUser = authInstance.currentUser.get();
    
    // Force refresh token to ensure valid session
    const authResponse = await currentUser.reloadAuthResponse(); 
    const accessToken = authResponse.access_token;

    if (!accessToken) {
        throw new Error("Could not retrieve valid Google Access Token.");
    }
    
    const metadata = {
        name: filename,
        mimeType: 'video/webm'
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);

    try {
        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
            method: 'POST',
            headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
            body: form
        });
        
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        
        return data.webViewLink;
    } catch (error) {
        console.error("Upload Error:", error);
        throw error;
    }
  }
};
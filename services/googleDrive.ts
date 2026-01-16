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
  tokenClient: null as any,

  initClient: async (): Promise<boolean> => {
    console.log("Google Drive Service: Initializing...");
    
    // 1. Fetch Credentials from App Settings
    const settings = await storageService.getAppSettings();
    
    if (!settings.googleDriveClientId || !settings.googleDriveApiKey) {
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
                    apiKey: settings.googleDriveApiKey,
                    clientId: settings.googleDriveClientId,
                    discoveryDocs: DISCOVERY_DOCS,
                    scope: SCOPES,
                    plugin_name: "ZoomClone" // Required for some GAPI versions
                });
                
                googleDriveService.isInitialized = true;
                console.log("Google Drive Service: GAPI Initialized.");
                resolve(true);
            } catch (error) {
                console.error("Error initializing GAPI client", error);
                resolve(false);
            }
        });
    });
  },

  signIn: async (): Promise<boolean> => {
    if (!googleDriveService.isInitialized) {
        const success = await googleDriveService.initClient();
        if (!success) return false;
    }

    const GoogleAuth = window.gapi.auth2.getAuthInstance();
    
    if (GoogleAuth.isSignedIn.get()) {
        return true;
    } else {
        try {
            await GoogleAuth.signIn();
            return true;
        } catch (error) {
            console.error("Sign in error", error);
            return false;
        }
    }
  },

  uploadVideo: async (blob: Blob, filename: string): Promise<string> => {
    // Ensure signed in
    const signedIn = await googleDriveService.signIn();
    if (!signedIn) throw new Error("User not signed in to Google.");

    console.log(`Google Drive Service: Uploading ${filename}...`);

    const accessToken = window.gapi.auth.getToken().access_token;
    
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
        
        console.log("Upload Success:", data);
        return data.webViewLink; // Returns the link to view the file on Drive
    } catch (error) {
        console.error("Upload Error:", error);
        throw error;
    }
  }
};
import * as admin from "firebase-admin";
import Config from "./config";

// We only want to initialize the firebase admin once
let initialized = false;
export function getFirebaseAdmin() {
    if (!initialized) {
        // Ref: https://firebase.google.com/docs/admin/setup#initialize_the_sdk_in_non-google_environments
        // We prefer to use a json file since the cert is downloaded as such & can be directly placed into any environment
        // Separate env variables would be harder to manage
        admin.initializeApp({
            credential: admin.credential.cert(Config.FIREBASE_ADMIN_CERT_PATH),
        });
        initialized = true;
    }

    return admin;
}

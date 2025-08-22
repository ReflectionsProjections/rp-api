import * as admin from "firebase-admin";
import * as dotenv from "dotenv";

dotenv.config();

const serviceAccount = require("../reflections-projections-firebase-adminsdk-fbsvc-333621fea7.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

export { admin };



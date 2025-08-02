import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config();

admin.initializeApp();

export { admin };
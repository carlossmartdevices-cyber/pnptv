/**
 * Firebase/Firestore Configuration
 */

import admin from 'firebase-admin';
import logger from '../utils/logger.js';

let db = null;

/**
 * Initialize Firebase Admin SDK
 */
export async function initializeFirebase() {
  try {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });

    db = admin.firestore();

    // Configure Firestore settings for better performance
    db.settings({
      ignoreUndefinedProperties: true,
    });

    logger.info('Firebase initialized successfully');
    return db;
  } catch (error) {
    logger.error('Failed to initialize Firebase:', error);
    throw error;
  }
}

/**
 * Get Firestore database instance
 */
export function getDb() {
  if (!db) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  }
  return db;
}

/**
 * Collection references for better type safety and reusability
 */
export const collections = {
  users: () => getDb().collection('users'),
  plans: () => getDb().collection('plans'),
  payments: () => getDb().collection('payments'),
  liveStreams: () => getDb().collection('liveStreams'),
  zoomRooms: () => getDb().collection('zoomRooms'),
  broadcasts: () => getDb().collection('broadcasts'),
  supportTickets: () => getDb().collection('supportTickets'),
  radioRequests: () => getDb().collection('radioRequests'),
  membershipHistory: () => getDb().collection('membership_history'),
  planActivations: () => getDb().collection('plan_activations'),
  inviteLinks: () => getDb().collection('invite_links'),
};

/**
 * Firestore batch operations helper
 */
export async function batchWrite(operations) {
  const batch = getDb().batch();
  operations.forEach((op) => {
    switch (op.type) {
      case 'set':
        batch.set(op.ref, op.data, op.options || {});
        break;
      case 'update':
        batch.update(op.ref, op.data);
        break;
      case 'delete':
        batch.delete(op.ref);
        break;
    }
  });
  return await batch.commit();
}

/**
 * Create necessary Firestore indexes
 * Note: Run this once during deployment
 */
export async function createIndexes() {
  logger.info('Firestore indexes should be created via Firebase Console or firebase.indexes.json');
  logger.info('Required indexes:');
  logger.info('- users: planExpiry (ASC), subscriptionStatus (ASC)');
  logger.info('- users: location (GEO), subscriptionStatus (ASC)');
  logger.info('- payments: userId (ASC), createdAt (DESC)');
  logger.info('- liveStreams: isActive (ASC), createdAt (DESC)');
}

export default {
  initializeFirebase,
  getDb,
  collections,
  batchWrite,
  createIndexes,
};

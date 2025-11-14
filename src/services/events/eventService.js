/**
 * Event Service
 * Manages all types of events (Zoom calls, streams, broadcasts)
 */

import { collections } from '../../config/firebase.js';
import logger from '../../utils/logger.js';
import admin from 'firebase-admin';

/**
 * Create event
 */
export async function createEvent(eventData) {
  try {
    const event = {
      ...eventData,
      status: 'scheduled',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await collections.events().add(event);

    logger.info(`Event created: ${docRef.id} - ${eventData.title}`);

    return {
      success: true,
      eventId: docRef.id,
    };
  } catch (error) {
    logger.error('Error creating event:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get event by ID
 */
export async function getEventById(eventId) {
  try {
    const doc = await collections.events().doc(eventId).get();

    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      ...doc.data(),
    };
  } catch (error) {
    logger.error('Error getting event:', error);
    return null;
  }
}

/**
 * Get user events
 */
export async function getUserEvents(userId, filter = 'upcoming') {
  try {
    let query = collections.events().where('creatorId', '==', userId);

    if (filter === 'upcoming') {
      const now = admin.firestore.Timestamp.now();
      query = query.where('startTime', '>=', now);
    } else if (filter === 'past') {
      const now = admin.firestore.Timestamp.now();
      query = query.where('startTime', '<', now);
    }

    query = query.orderBy('startTime', filter === 'past' ? 'desc' : 'asc');

    const snapshot = await query.get();

    const events = [];
    snapshot.forEach((doc) => {
      events.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return events;
  } catch (error) {
    logger.error('Error getting user events:', error);
    return [];
  }
}

/**
 * Update event
 */
export async function updateEvent(eventId, updates) {
  try {
    await collections.events().doc(eventId).update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info(`Event updated: ${eventId}`);

    return { success: true };
  } catch (error) {
    logger.error('Error updating event:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete event
 */
export async function deleteEvent(eventId) {
  try {
    await collections.events().doc(eventId).update({
      status: 'cancelled',
      cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info(`Event cancelled: ${eventId}`);

    return { success: true };
  } catch (error) {
    logger.error('Error deleting event:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get upcoming community events
 */
export async function getUpcomingEvents(limit = 10) {
  try {
    const now = admin.firestore.Timestamp.now();

    const snapshot = await collections.events()
      .where('status', '==', 'scheduled')
      .where('startTime', '>=', now)
      .where('isPublic', '==', true)
      .orderBy('startTime', 'asc')
      .limit(limit)
      .get();

    const events = [];
    snapshot.forEach((doc) => {
      events.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return events;
  } catch (error) {
    logger.error('Error getting upcoming events:', error);
    return [];
  }
}

export default {
  createEvent,
  getEventById,
  getUserEvents,
  updateEvent,
  deleteEvent,
  getUpcomingEvents,
};

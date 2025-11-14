/**
 * Playlist Service
 * Manages user playlists and favorites
 */

import { collections } from '../../config/firebase.js';
import { cache } from '../../config/redis.js';
import logger from '../../utils/logger.js';
import admin from 'firebase-admin';

/**
 * Create playlist
 */
export async function createPlaylist(userId, playlistData) {
  try {
    const playlist = {
      userId,
      name: playlistData.name,
      description: playlistData.description || '',
      trackIds: [],
      isPublic: playlistData.isPublic || false,
      isCollaborative: playlistData.isCollaborative || false,
      collaborators: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await collections.playlists().add(playlist);

    logger.info(`Playlist created: ${docRef.id} by user ${userId}`);

    return {
      success: true,
      playlistId: docRef.id,
    };
  } catch (error) {
    logger.error('Error creating playlist:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get user playlists
 */
export async function getUserPlaylists(userId) {
  try {
    const snapshot = await collections.playlists()
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    const playlists = [];
    snapshot.forEach((doc) => {
      playlists.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return playlists;
  } catch (error) {
    logger.error('Error getting user playlists:', error);
    return [];
  }
}

/**
 * Get playlist by ID
 */
export async function getPlaylistById(playlistId) {
  try {
    const doc = await collections.playlists().doc(playlistId).get();

    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      ...doc.data(),
    };
  } catch (error) {
    logger.error('Error getting playlist:', error);
    return null;
  }
}

/**
 * Add track to playlist
 */
export async function addTrackToPlaylist(playlistId, trackId, userId) {
  try {
    const playlist = await getPlaylistById(playlistId);

    if (!playlist) {
      return { success: false, error: 'Playlist not found' };
    }

    // Check permissions
    if (playlist.userId !== userId && !playlist.collaborators.includes(userId)) {
      return { success: false, error: 'Permission denied' };
    }

    // Check if track already in playlist
    if (playlist.trackIds.includes(trackId)) {
      return { success: false, error: 'Track already in playlist' };
    }

    await collections.playlists().doc(playlistId).update({
      trackIds: admin.firestore.FieldValue.arrayUnion(trackId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info(`Track ${trackId} added to playlist ${playlistId}`);

    return { success: true };
  } catch (error) {
    logger.error('Error adding track to playlist:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Remove track from playlist
 */
export async function removeTrackFromPlaylist(playlistId, trackId, userId) {
  try {
    const playlist = await getPlaylistById(playlistId);

    if (!playlist) {
      return { success: false, error: 'Playlist not found' };
    }

    // Check permissions
    if (playlist.userId !== userId && !playlist.collaborators.includes(userId)) {
      return { success: false, error: 'Permission denied' };
    }

    await collections.playlists().doc(playlistId).update({
      trackIds: admin.firestore.FieldValue.arrayRemove(trackId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info(`Track ${trackId} removed from playlist ${playlistId}`);

    return { success: true };
  } catch (error) {
    logger.error('Error removing track from playlist:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete playlist
 */
export async function deletePlaylist(playlistId, userId) {
  try {
    const playlist = await getPlaylistById(playlistId);

    if (!playlist) {
      return { success: false, error: 'Playlist not found' };
    }

    // Only owner can delete
    if (playlist.userId !== userId) {
      return { success: false, error: 'Permission denied' };
    }

    await collections.playlists().doc(playlistId).delete();

    logger.info(`Playlist ${playlistId} deleted by user ${userId}`);

    return { success: true };
  } catch (error) {
    logger.error('Error deleting playlist:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Add track to favorites
 */
export async function addToFavorites(userId, trackId) {
  try {
    const favoriteId = `${userId}_${trackId}`;

    const doc = await collections.favorites().doc(favoriteId).get();

    if (doc.exists) {
      return { success: false, error: 'Already in favorites' };
    }

    await collections.favorites().doc(favoriteId).set({
      userId,
      trackId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info(`Track ${trackId} added to favorites by user ${userId}`);

    return { success: true };
  } catch (error) {
    logger.error('Error adding to favorites:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Remove from favorites
 */
export async function removeFromFavorites(userId, trackId) {
  try {
    const favoriteId = `${userId}_${trackId}`;

    await collections.favorites().doc(favoriteId).delete();

    logger.info(`Track ${trackId} removed from favorites by user ${userId}`);

    return { success: true };
  } catch (error) {
    logger.error('Error removing from favorites:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get user favorites
 */
export async function getUserFavorites(userId) {
  try {
    const snapshot = await collections.favorites()
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    const trackIds = [];
    snapshot.forEach((doc) => {
      trackIds.push(doc.data().trackId);
    });

    return trackIds;
  } catch (error) {
    logger.error('Error getting user favorites:', error);
    return [];
  }
}

/**
 * Check if track is favorited
 */
export async function isTrackFavorited(userId, trackId) {
  try {
    const favoriteId = `${userId}_${trackId}`;
    const doc = await collections.favorites().doc(favoriteId).get();

    return doc.exists;
  } catch (error) {
    logger.error('Error checking if track is favorited:', error);
    return false;
  }
}

/**
 * Get recently played tracks for user
 */
export async function getRecentlyPlayed(userId, limit = 20) {
  try {
    const snapshot = await collections.trackPlays()
      .where('userId', '==', userId)
      .orderBy('playedAt', 'desc')
      .limit(limit)
      .get();

    const trackIds = [];
    snapshot.forEach((doc) => {
      const trackId = doc.data().trackId;
      // Avoid duplicates
      if (!trackIds.includes(trackId)) {
        trackIds.push(trackId);
      }
    });

    return trackIds;
  } catch (error) {
    logger.error('Error getting recently played:', error);
    return [];
  }
}

export default {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  deletePlaylist,
  addToFavorites,
  removeFromFavorites,
  getUserFavorites,
  isTrackFavorited,
  getRecentlyPlayed,
};

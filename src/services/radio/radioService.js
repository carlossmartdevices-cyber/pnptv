/**
 * PNPtv! Radio Service
 * Manages music library, tracks, play counts, and trending
 */

import { collections } from '../../config/firebase.js';
import { cache, cacheKeys } from '../../config/redis.js';
import logger from '../../utils/logger.js';
import admin from 'firebase-admin';

/**
 * Get total track count
 */
export async function getTrackCount() {
  try {
    const cacheKey = cacheKeys.radioTrackCount || 'radio:track_count';

    // Check cache first
    let count = await cache.get(cacheKey);

    if (count === null) {
      const snapshot = await collections.music()
        .where('isActive', '==', true)
        .count()
        .get();

      count = snapshot.data().count;

      // Cache for 5 minutes
      await cache.set(cacheKey, count, 300);
    }

    return count;
  } catch (error) {
    logger.error('Error getting track count:', error);
    return 0;
  }
}

/**
 * Get tracks with filters and pagination
 */
export async function getTracksWithFilters(filters = {}, page = 0, limit = 10) {
  try {
    let query = collections.music().where('isActive', '==', true);

    // Apply filters
    if (filters.genre) {
      query = query.where('genre', '==', filters.genre);
    }

    if (filters.type) {
      query = query.where('type', '==', filters.type);
    }

    // Apply sorting
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'desc';
    query = query.orderBy(sortBy, sortOrder);

    // Get total count
    const countSnapshot = await query.count().get();
    const totalCount = countSnapshot.data().count;

    // Apply pagination
    query = query.offset(page * limit).limit(limit);

    const snapshot = await query.get();

    const tracks = [];
    snapshot.forEach((doc) => {
      tracks.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return {
      tracks,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
    };
  } catch (error) {
    logger.error('Error getting tracks with filters:', error);
    return { tracks: [], totalCount: 0, page: 0, totalPages: 0 };
  }
}

/**
 * Get track by ID
 */
export async function getTrackById(trackId) {
  try {
    const doc = await collections.music().doc(trackId).get();

    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      ...doc.data(),
    };
  } catch (error) {
    logger.error('Error getting track by ID:', error);
    return null;
  }
}

/**
 * Track a play
 */
export async function trackPlay(trackId, userId) {
  try {
    const trackRef = collections.music().doc(trackId);
    const track = await trackRef.get();

    if (!track.exists) {
      return { success: false, error: 'Track not found' };
    }

    // Increment play count
    await trackRef.update({
      playCount: admin.firestore.FieldValue.increment(1),
      lastPlayedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Record play in track_plays collection
    await collections.trackPlays().add({
      trackId,
      userId,
      playedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Invalidate cache
    const cacheKey = `track:${trackId}`;
    await cache.del(cacheKey);

    const newPlayCount = (track.data().playCount || 0) + 1;

    logger.info(`Track ${trackId} played by user ${userId}. New play count: ${newPlayCount}`);

    return {
      success: true,
      track: track.data(),
      newPlayCount,
    };
  } catch (error) {
    logger.error('Error tracking play:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get trending tracks
 */
export async function getTrendingTracks(limit = 10, timeframe = 'week') {
  try {
    const cacheKey = `trending:${timeframe}:${limit}`;

    // Check cache
    let trending = await cache.get(cacheKey);

    if (trending) {
      return trending;
    }

    // Calculate date threshold
    const now = new Date();
    let daysAgo = 7; // week

    if (timeframe === 'day') daysAgo = 1;
    if (timeframe === 'month') daysAgo = 30;

    const threshold = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    // Get tracks with recent plays
    const playsSnapshot = await collections.trackPlays()
      .where('playedAt', '>=', admin.firestore.Timestamp.fromDate(threshold))
      .get();

    // Count plays per track
    const playsByTrack = {};
    playsSnapshot.forEach((doc) => {
      const data = doc.data();
      playsByTrack[data.trackId] = (playsByTrack[data.trackId] || 0) + 1;
    });

    // Sort by play count
    const sortedTrackIds = Object.entries(playsByTrack)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([trackId]) => trackId);

    // Get track details
    const tracks = [];
    for (const trackId of sortedTrackIds) {
      const track = await getTrackById(trackId);
      if (track) {
        tracks.push({
          ...track,
          recentPlays: playsByTrack[trackId],
        });
      }
    }

    // Cache for 10 minutes
    await cache.set(cacheKey, tracks, 600);

    return tracks;
  } catch (error) {
    logger.error('Error getting trending tracks:', error);
    return [];
  }
}

/**
 * Get recently added tracks
 */
export async function getRecentlyAddedTracks(limit = 10) {
  try {
    const snapshot = await collections.music()
      .where('isActive', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const tracks = [];
    snapshot.forEach((doc) => {
      tracks.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return tracks;
  } catch (error) {
    logger.error('Error getting recently added tracks:', error);
    return [];
  }
}

/**
 * Search tracks
 */
export async function searchTracks(searchTerm, limit = 10) {
  try {
    const searchLower = searchTerm.toLowerCase();

    // Get all active tracks (in production, use Algolia or similar for better search)
    const snapshot = await collections.music()
      .where('isActive', '==', true)
      .get();

    const tracks = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const titleMatch = data.title?.toLowerCase().includes(searchLower);
      const artistMatch = data.artist?.toLowerCase().includes(searchLower);
      const genreMatch = data.genre?.toLowerCase().includes(searchLower);

      if (titleMatch || artistMatch || genreMatch) {
        tracks.push({
          id: doc.id,
          ...data,
        });
      }
    });

    return tracks.slice(0, limit);
  } catch (error) {
    logger.error('Error searching tracks:', error);
    return [];
  }
}

/**
 * Add track (admin only)
 */
export async function addTrack(trackData) {
  try {
    const track = {
      ...trackData,
      playCount: 0,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await collections.music().add(track);

    // Invalidate cache
    await cache.del('radio:track_count');

    logger.info(`Track added: ${docRef.id}`);

    return {
      success: true,
      trackId: docRef.id,
    };
  } catch (error) {
    logger.error('Error adding track:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update track (admin only)
 */
export async function updateTrack(trackId, updates) {
  try {
    await collections.music().doc(trackId).update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Invalidate cache
    await cache.del(`track:${trackId}`);

    logger.info(`Track updated: ${trackId}`);

    return { success: true };
  } catch (error) {
    logger.error('Error updating track:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete track (admin only)
 */
export async function deleteTrack(trackId) {
  try {
    // Soft delete
    await collections.music().doc(trackId).update({
      isActive: false,
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Invalidate cache
    await cache.del(`track:${trackId}`);
    await cache.del('radio:track_count');

    logger.info(`Track deleted: ${trackId}`);

    return { success: true };
  } catch (error) {
    logger.error('Error deleting track:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get available genres
 */
export async function getAvailableGenres() {
  try {
    const cacheKey = 'radio:genres';

    let genres = await cache.get(cacheKey);

    if (genres) {
      return genres;
    }

    const snapshot = await collections.music()
      .where('isActive', '==', true)
      .get();

    const genreSet = new Set();
    snapshot.forEach((doc) => {
      const genre = doc.data().genre;
      if (genre) {
        genreSet.add(genre);
      }
    });

    genres = Array.from(genreSet).sort();

    // Cache for 1 hour
    await cache.set(cacheKey, genres, 3600);

    return genres;
  } catch (error) {
    logger.error('Error getting available genres:', error);
    return [];
  }
}

export default {
  getTrackCount,
  getTracksWithFilters,
  getTrackById,
  trackPlay,
  getTrendingTracks,
  getRecentlyAddedTracks,
  searchTracks,
  addTrack,
  updateTrack,
  deleteTrack,
  getAvailableGenres,
};

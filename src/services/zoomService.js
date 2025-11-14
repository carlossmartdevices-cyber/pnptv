/**
 * Zoom Service
 * Handles Zoom API integration with Server-to-Server OAuth
 */

import axios from 'axios';
import logger from '../utils/logger.js';
import { cache, cacheKeys } from '../config/redis.js';

const ZOOM_API_BASE = 'https://api.zoom.us/v2';

/**
 * Get Zoom access token using Server-to-Server OAuth
 */
async function getAccessToken() {
  try {
    const cacheKey = 'zoom:access_token';

    // Check cache first
    let accessToken = await cache.get(cacheKey);

    if (accessToken) {
      return accessToken;
    }

    // Get new token
    const credentials = Buffer.from(
      `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
    ).toString('base64');

    const response = await axios.post(
      'https://zoom.us/oauth/token',
      null,
      {
        params: {
          grant_type: 'account_credentials',
          account_id: process.env.ZOOM_ACCOUNT_ID,
        },
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    accessToken = response.data.access_token;
    const expiresIn = response.data.expires_in || 3600;

    // Cache token (expires in 1 hour, cache for 55 minutes to be safe)
    await cache.set(cacheKey, accessToken, Math.min(expiresIn - 300, 3300));

    logger.info('Zoom access token obtained successfully');

    return accessToken;
  } catch (error) {
    logger.error('Error getting Zoom access token:', error.response?.data || error.message);
    throw new Error('Failed to authenticate with Zoom');
  }
}

/**
 * Make authenticated request to Zoom API
 */
async function makeZoomRequest(method, endpoint, data = null) {
  try {
    const accessToken = await getAccessToken();

    const config = {
      method,
      url: `${ZOOM_API_BASE}${endpoint}`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    logger.error(`Zoom API ${method} ${endpoint} error:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Create instant Zoom meeting
 */
export async function createInstantMeeting(options = {}) {
  try {
    const meetingData = {
      topic: options.topic || `${options.hostName}'s Instant Room`,
      type: 1, // Instant meeting
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: true,
        mute_upon_entry: false,
        watermark: false,
        use_pmi: false,
        approval_type: 0, // Automatically approve
        audio: 'both',
        auto_recording: options.autoRecording || 'none',
        waiting_room: options.waitingRoom !== undefined ? options.waitingRoom : false,
        ...options.settings,
      },
    };

    // Set password if provided
    if (options.password) {
      meetingData.password = options.password;
    } else {
      // Generate random 6-digit password
      meetingData.password = Math.floor(100000 + Math.random() * 900000).toString();
    }

    const response = await makeZoomRequest('POST', '/users/me/meetings', meetingData);

    logger.info(`Instant Zoom meeting created: ${response.id}`);

    return {
      id: response.id,
      join_url: response.join_url,
      start_url: response.start_url,
      password: response.password,
      topic: response.topic,
      created_at: response.created_at,
      duration: response.duration,
    };
  } catch (error) {
    logger.error('Error creating instant Zoom meeting:', error);
    throw error;
  }
}

/**
 * Schedule Zoom meeting
 */
export async function scheduleZoomMeeting(options) {
  try {
    const {
      topic,
      startTime, // ISO 8601 format
      duration, // Minutes
      timezone = 'America/Bogota',
      agenda,
      password,
      waitingRoom = true,
      autoRecording = 'none',
      hostVideo = true,
      participantVideo = true,
    } = options;

    const meetingData = {
      topic,
      type: 2, // Scheduled meeting
      start_time: startTime,
      duration,
      timezone,
      agenda: agenda || '',
      settings: {
        host_video: hostVideo,
        participant_video: participantVideo,
        join_before_host: true,
        mute_upon_entry: false,
        watermark: false,
        use_pmi: false,
        approval_type: 0,
        audio: 'both',
        auto_recording: autoRecording,
        waiting_room: waitingRoom,
      },
    };

    // Set password
    if (password) {
      meetingData.password = password;
    } else {
      meetingData.password = Math.floor(100000 + Math.random() * 900000).toString();
    }

    const response = await makeZoomRequest('POST', '/users/me/meetings', meetingData);

    logger.info(`Scheduled Zoom meeting created: ${response.id} at ${startTime}`);

    return {
      id: response.id,
      join_url: response.join_url,
      start_url: response.start_url,
      password: response.password,
      topic: response.topic,
      start_time: response.start_time,
      duration: response.duration,
      timezone: response.timezone,
      created_at: response.created_at,
    };
  } catch (error) {
    logger.error('Error scheduling Zoom meeting:', error);
    throw error;
  }
}

/**
 * Get meeting details
 */
export async function getMeetingDetails(meetingId) {
  try {
    const response = await makeZoomRequest('GET', `/meetings/${meetingId}`);

    return {
      id: response.id,
      topic: response.topic,
      type: response.type,
      status: response.status,
      start_time: response.start_time,
      duration: response.duration,
      timezone: response.timezone,
      join_url: response.join_url,
      password: response.password,
    };
  } catch (error) {
    logger.error(`Error getting meeting details for ${meetingId}:`, error);
    throw error;
  }
}

/**
 * Update meeting
 */
export async function updateMeeting(meetingId, updates) {
  try {
    await makeZoomRequest('PATCH', `/meetings/${meetingId}`, updates);

    logger.info(`Zoom meeting ${meetingId} updated successfully`);

    return { success: true };
  } catch (error) {
    logger.error(`Error updating meeting ${meetingId}:`, error);
    throw error;
  }
}

/**
 * Delete meeting
 */
export async function deleteMeeting(meetingId) {
  try {
    await makeZoomRequest('DELETE', `/meetings/${meetingId}`);

    logger.info(`Zoom meeting ${meetingId} deleted successfully`);

    return { success: true };
  } catch (error) {
    logger.error(`Error deleting meeting ${meetingId}:`, error);
    throw error;
  }
}

/**
 * List user meetings
 */
export async function listUserMeetings(options = {}) {
  try {
    const params = new URLSearchParams({
      type: options.type || 'scheduled', // scheduled, live, upcoming
      page_size: options.pageSize || 30,
      page_number: options.pageNumber || 1,
    });

    const response = await makeZoomRequest('GET', `/users/me/meetings?${params}`);

    return {
      meetings: response.meetings,
      page_count: response.page_count,
      page_number: response.page_number,
      page_size: response.page_size,
      total_records: response.total_records,
    };
  } catch (error) {
    logger.error('Error listing user meetings:', error);
    throw error;
  }
}

/**
 * Create meeting invitation message
 */
export function createInvitationMessage(meeting, lang = 'en') {
  const message = lang === 'es'
    ? `📹 **Invitación a Zoom**\n\n` +
      `**${meeting.topic}**\n\n` +
      `🕐 **Hora:** ${meeting.start_time ? new Date(meeting.start_time).toLocaleString('es-ES') : 'Ahora'}\n` +
      `⏱️ **Duración:** ${meeting.duration} minutos\n` +
      `🔒 **Contraseña:** ${meeting.password}\n\n` +
      `**Enlace de unión:**\n${meeting.join_url}\n\n` +
      `💡 Haz clic en el enlace para unirte a la reunión.`
    : `📹 **Zoom Meeting Invitation**\n\n` +
      `**${meeting.topic}**\n\n` +
      `🕐 **Time:** ${meeting.start_time ? new Date(meeting.start_time).toLocaleString('en-US') : 'Now'}\n` +
      `⏱️ **Duration:** ${meeting.duration} minutes\n` +
      `🔒 **Password:** ${meeting.password}\n\n` +
      `**Join URL:**\n${meeting.join_url}\n\n` +
      `💡 Click the link to join the meeting.`;

  return message;
}

export default {
  getAccessToken,
  createInstantMeeting,
  scheduleZoomMeeting,
  getMeetingDetails,
  updateMeeting,
  deleteMeeting,
  listUserMeetings,
  createInvitationMessage,
};

const { google } = require('googleapis');
const PlatformConnection = require('../models/PlatformConnection');

function createYoutubeService(connection) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({
    access_token: connection.accessToken,
    refresh_token: connection.refreshToken
  });
  return google.youtube({ version: 'v3', auth: oauth2Client });
}

async function refreshYoutubeToken(connection) {
  if (!connection.refreshToken) return false;
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({
      refresh_token: connection.refreshToken
    });
    const { credentials } = await oauth2Client.refreshAccessToken();
    connection.accessToken = credentials.access_token;
    if (credentials.expiry_date) {
      connection.expiresAt = new Date(credentials.expiry_date);
    }
    await connection.save();
    return true;
  } catch (err) {
    console.error('Failed to refresh YouTube token:', err.message);
    return false;
  }
}

async function fetchUserPlaylists(youtubeService) {
  const response = await youtubeService.playlists.list({
    part: 'snippet,contentDetails',
    mine: true,
    maxResults: 50
  });

  return (response.data.items || []).map(playlist => ({
    id: playlist.id,
    title: playlist.snippet.title,
    description: (playlist.snippet.description || '').substring(0, 200),
    video_count: playlist.contentDetails.itemCount,
    thumbnail_url: playlist.snippet.thumbnails?.medium?.url || null,
    created_at: playlist.snippet.publishedAt
  }));
}

async function fetchPlaylistTracks(youtubeService, playlistId) {
  const allTracks = [];
  let nextPageToken = null;

  do {
    const response = await youtubeService.playlistItems.list({
      part: 'snippet,contentDetails',
      playlistId,
      maxResults: 50,
      pageToken: nextPageToken || undefined
    });

    const tracks = (response.data.items || []).map(item => ({
      id: item.contentDetails.videoId,
      title: item.snippet.title,
      artist: item.snippet.videoOwnerChannelTitle || item.snippet.channelTitle,
      duration: null, // We'll fetch durations separately
      thumbnail_url: item.snippet.thumbnails?.medium?.url || null,
      video_url: `https://www.youtube.com/watch?v=${item.contentDetails.videoId}`,
      position: item.snippet.position
    }));

    allTracks.push(...tracks);
    nextPageToken = response.data.nextPageToken;
  } while (nextPageToken);

  // Fetch durations in batches of 50
  const videoIds = allTracks.map(t => t.id);
  const durations = await fetchVideoDurations(youtubeService, videoIds);

  for (const track of allTracks) {
    track.duration = durations[track.id] || 'Unknown';
  }

  return allTracks.sort((a, b) => a.position - b.position);
}

async function fetchVideoDurations(youtubeService, videoIds) {
  const durations = {};
  // Process in batches of 50
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    try {
      const response = await youtubeService.videos.list({
        part: 'contentDetails',
        id: batch.join(',')
      });
      for (const item of (response.data.items || [])) {
        durations[item.id] = parseYoutubeDuration(item.contentDetails.duration);
      }
    } catch (err) {
      console.warn('Failed to fetch durations for batch:', err.message);
    }
  }
  return durations;
}

function parseYoutubeDuration(duration) {
  if (!duration) return 'Unknown';
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 'Unknown';

  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

module.exports = {
  createYoutubeService,
  refreshYoutubeToken,
  fetchUserPlaylists,
  fetchPlaylistTracks,
  parseYoutubeDuration
};

const express = require('express');
const router = express.Router();
const PlatformConnection = require('../models/PlatformConnection');
const authenticate = require('../middleware/auth');
const {
  createYoutubeService,
  refreshYoutubeToken,
  fetchUserPlaylists,
  fetchPlaylistTracks
} = require('../services/youtubeService');

async function ensureYoutubeConnection(req, res, next) {
  const connection = await PlatformConnection.findOne({
    userId: req.currentUser._id,
    platform: 'youtube'
  });

  if (!connection) {
    return res.status(401).json({
      error: 'YouTube not connected',
      message: 'Please connect your YouTube account to access playlists',
      connect_url: '/auth/youtube'
    });
  }

  if (connection.tokenExpired()) {
    const refreshed = await refreshYoutubeToken(connection);
    if (!refreshed) {
      return res.status(401).json({
        error: 'YouTube token expired',
        message: 'Please reconnect your YouTube account',
        connect_url: '/auth/youtube'
      });
    }
  }

  req.youtubeConnection = connection;
  next();
}

// GET /api/youtube/check_access
router.get('/check_access', authenticate, async (req, res) => {
  const hasAccess = await PlatformConnection.exists({
    userId: req.currentUser._id,
    platform: 'youtube'
  });
  res.json({ has_youtube_access: !!hasAccess });
});

// GET /api/youtube/playlists
router.get('/playlists', authenticate, ensureYoutubeConnection, async (req, res) => {
  try {
    const youtubeService = createYoutubeService(req.youtubeConnection);
    const playlists = await fetchUserPlaylists(youtubeService);
    res.json({
      playlists,
      total: playlists.length,
      user: {
        platform_user_id: req.youtubeConnection.platformUserId,
        connected_at: req.youtubeConnection.connectedAt
      }
    });
  } catch (err) {
    console.error('YouTube API error:', err.message);
    res.status(503).json({
      error: 'YouTube API error',
      message: 'Failed to fetch playlists from YouTube',
      reconnect_url: '/auth/youtube'
    });
  }
});

// GET /api/youtube/playlists/:playlistId/tracks
router.get('/playlists/:playlistId/tracks', authenticate, ensureYoutubeConnection, async (req, res) => {
  try {
    const youtubeService = createYoutubeService(req.youtubeConnection);
    const tracks = await fetchPlaylistTracks(youtubeService, req.params.playlistId);
    res.json({
      tracks,
      playlist_id: req.params.playlistId,
      total: tracks.length
    });
  } catch (err) {
    console.error('YouTube API error:', err.message);
    res.status(503).json({
      error: 'YouTube API error',
      message: 'Failed to fetch playlist tracks',
      reconnect_url: '/auth/youtube'
    });
  }
});

module.exports = router;

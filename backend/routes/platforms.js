const express = require('express');
const router = express.Router();
const PlatformConnection = require('../models/PlatformConnection');
const authenticate = require('../middleware/auth');
const SpotifyClient = require('../services/spotifyClient');
const {
  createYoutubeService,
  refreshYoutubeToken,
  fetchUserPlaylists,
  fetchPlaylistTracks
} = require('../services/youtubeService');

function paginationParams(query, defaultPer, maxPer) {
  let page = parseInt(query.page) || 1;
  if (page < 1) page = 1;
  let perPage = parseInt(query.per_page) || defaultPer;
  if (perPage < 1) perPage = defaultPer;
  perPage = Math.min(perPage, maxPer);
  return { page, perPage };
}

function normalizePlaylist(raw) {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    thumbnail_url: raw.thumbnail_url,
    video_count: raw.video_count || raw.track_count
  };
}

function normalizeTrack(raw, platform) {
  return {
    id: raw.id,
    title: raw.title,
    artist: raw.artist,
    duration_ms: raw.duration_ms,
    thumbnail_url: raw.thumbnail_url,
    platform
  };
}

// Spotify-specific routes (must precede dynamic :platform routes)

// GET /api/platforms/spotify/playlists
router.get('/spotify/playlists', authenticate, async (req, res) => {
  try {
    const connection = await PlatformConnection.findOne({
      userId: req.currentUser._id,
      platform: 'spotify'
    });
    if (!connection) {
      return res.status(404).json({ error: 'Spotify connection not found' });
    }

    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.per_page) || 20;

    const client = new SpotifyClient(connection);
    const data = await client.playlists({ page, perPage });
    res.json({ playlists: data.items, total: data.total });
  } catch (err) {
    console.error('SpotifyController#playlists error:', err.message);
    res.status(500).json({ error: err.constructor.name, message: err.message });
  }
});

// GET /api/platforms/spotify/token
router.get('/spotify/token', authenticate, async (req, res) => {
  try {
    const connection = await PlatformConnection.findOne({
      userId: req.currentUser._id,
      platform: 'spotify'
    });
    if (!connection) {
      return res.status(404).json({ error: 'Spotify connection not found' });
    }

    const client = new SpotifyClient(connection);
    await client.refresh();
    res.json({ access_token: connection.accessToken, expires_at: connection.expiresAt });
  } catch (err) {
    console.error('SpotifyController#token error:', err.message);
    res.status(500).json({ error: err.constructor.name, message: 'Unable to provide token' });
  }
});

// GET /api/platforms/:platform/check_access
router.get('/:platform/check_access', authenticate, async (req, res) => {
  const platform = req.params.platform.toLowerCase();
  if (!PlatformConnection.SUPPORTED_PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: `Unsupported platform: ${platform}` });
  }
  const hasAccess = await PlatformConnection.exists({
    userId: req.currentUser._id,
    platform
  });
  res.json({ has_access: !!hasAccess });
});

// GET /api/platforms/:platform/playlists
router.get('/:platform/playlists', authenticate, async (req, res) => {
  const platform = req.params.platform.toLowerCase();
  if (!PlatformConnection.SUPPORTED_PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: `Unsupported platform: ${platform}` });
  }

  const { page, perPage } = paginationParams(req.query, 25, 50);

  try {
    if (platform === 'youtube') {
      const connection = await PlatformConnection.findOne({ userId: req.currentUser._id, platform: 'youtube' });
      if (!connection) return res.status(403).json({ error: 'YouTube not connected' });

      if (connection.tokenExpired()) {
        await refreshYoutubeToken(connection);
      }

      const service = createYoutubeService(connection);
      const rawPlaylists = await fetchUserPlaylists(service);
      const total = rawPlaylists.length;
      const sliced = rawPlaylists.slice((page - 1) * perPage, (page - 1) * perPage + perPage);

      return res.json({
        playlists: sliced.map(normalizePlaylist),
        page,
        per_page: perPage,
        total
      });
    }

    if (platform === 'spotify') {
      const connection = await PlatformConnection.findOne({ userId: req.currentUser._id, platform: 'spotify' });
      if (!connection) return res.status(403).json({ error: 'Spotify not connected' });

      const client = new SpotifyClient(connection);
      const data = await client.playlists({ page, perPage });

      return res.json({
        playlists: data.items.map(normalizePlaylist),
        page,
        per_page: perPage,
        total: data.total
      });
    }
  } catch (err) {
    console.error(`Platform playlists fetch error (${platform}):`, err.message);
    if (err.response && err.response.status === 401) {
      return res.status(401).json({ error: `${platform} authorization expired` });
    }
    res.status(503).json({ error: `Unable to fetch ${platform} playlists` });
  }
});

// GET /api/platforms/:platform/playlists/:id/tracks
router.get('/:platform/playlists/:id/tracks', authenticate, async (req, res) => {
  const platform = req.params.platform.toLowerCase();
  if (!PlatformConnection.SUPPORTED_PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: `Unsupported platform: ${platform}` });
  }

  const playlistId = req.params.id;
  const { page, perPage } = paginationParams(req.query, 50, 100);

  try {
    if (platform === 'youtube') {
      const connection = await PlatformConnection.findOne({ userId: req.currentUser._id, platform: 'youtube' });
      if (!connection) return res.status(403).json({ error: 'YouTube not connected' });

      if (connection.tokenExpired()) {
        await refreshYoutubeToken(connection);
      }

      const service = createYoutubeService(connection);
      const rawTracks = await fetchPlaylistTracks(service, playlistId);
      const total = rawTracks.length;
      const sliced = rawTracks.slice((page - 1) * perPage, (page - 1) * perPage + perPage);

      return res.json({
        tracks: sliced.map(t => normalizeTrack(t, platform)),
        page,
        per_page: perPage,
        total
      });
    }

    if (platform === 'spotify') {
      const connection = await PlatformConnection.findOne({ userId: req.currentUser._id, platform: 'spotify' });
      if (!connection) return res.status(403).json({ error: 'Spotify not connected' });

      const client = new SpotifyClient(connection);
      const data = await client.playlistTracks({ playlistId, page, perPage });

      return res.json({
        tracks: data.items.map(t => normalizeTrack(t, platform)),
        page,
        per_page: perPage,
        total: data.total
      });
    }
  } catch (err) {
    console.error(`Platform tracks fetch error (${platform}):`, err.message);
    if (err.response && err.response.status === 401) {
      return res.status(401).json({ error: `${platform} authorization expired` });
    }
    res.status(503).json({ error: `Unable to fetch ${platform} tracks` });
  }
});

module.exports = router;

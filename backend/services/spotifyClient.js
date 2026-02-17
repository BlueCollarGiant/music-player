const axios = require('axios');

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

class SpotifyClient {
  constructor(connection) {
    this.connection = connection;
  }

  async playlists({ page = 1, perPage = 20 } = {}) {
    await this.refresh();
    page = Math.max(parseInt(page) || 1, 1);
    perPage = Math.min(Math.max(parseInt(perPage) || 20, 1), 50);
    const offset = (page - 1) * perPage;

    const data = await this.getJson(`${SPOTIFY_API_BASE}/me/playlists`, { limit: perPage, offset });
    const items = (data.items || []).map(pl => this.normalizePlaylist(pl));
    return { items, total: data.total || items.length };
  }

  async playlistTracks({ playlistId, page = 1, perPage = 50 } = {}) {
    await this.refresh();
    page = Math.max(parseInt(page) || 1, 1);
    perPage = Math.min(Math.max(parseInt(perPage) || 50, 1), 100);
    const offset = (page - 1) * perPage;

    const data = await this.getJson(`${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks`, { limit: perPage, offset });
    const items = (data.items || []).map(it => {
      const track = it.track || {};
      const artists = track.artists || [];
      const albumImages = (track.album && track.album.images) || [];
      return {
        id: track.id,
        title: track.name,
        artist: artists[0] ? artists[0].name : artists.map(a => a.name).join(', '),
        duration_ms: track.duration_ms,
        thumbnail_url: albumImages[0] ? albumImages[0].url : null,
        platform: 'spotify',
        preview_url: track.preview_url,
        external_url: track.external_urls && track.external_urls.spotify
      };
    });
    return { items, total: data.total || items.length };
  }

  normalizePlaylist(pl) {
    const images = pl.images || [];
    const trackTotal = pl.tracks && pl.tracks.total;
    return {
      id: pl.id,
      title: pl.name,
      description: pl.description,
      thumbnail_url: images[0] ? images[0].url : null,
      track_count: trackTotal,
      video_count: trackTotal, // backward compat
      platform: 'spotify'
    };
  }

  async getJson(url, params = {}) {
    const response = await axios.get(url, {
      params,
      headers: { Authorization: `Bearer ${this.connection.accessToken}` }
    });
    return response.data;
  }

  async refresh() {
    if (!this.needsRefresh()) return;
    if (!this.connection.refreshToken) return;

    try {
      const basicAuth = Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString('base64');

      const response = await axios.post(SPOTIFY_TOKEN_URL,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.connection.refreshToken
        }).toString(),
        {
          headers: {
            Authorization: `Basic ${basicAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const data = response.data;
      if (data.access_token) {
        this.connection.accessToken = data.access_token;
        if (data.expires_in) {
          this.connection.expiresAt = new Date(Date.now() + data.expires_in * 1000);
        }
        await this.connection.save();
      }
    } catch (err) {
      console.warn('Spotify token refresh failed:', err.message);
    }
  }

  needsRefresh() {
    if (!this.connection.expiresAt) return false;
    const secondsUntilExpiry = (this.connection.expiresAt.getTime() - Date.now()) / 1000;
    return secondsUntilExpiry < 60;
  }
}

module.exports = SpotifyClient;

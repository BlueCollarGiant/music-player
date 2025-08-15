module SpotifyPlatform
  extend ActiveSupport::Concern

  require 'net/http'
  require 'uri'
  require 'json'
  require 'base64'

  SPOTIFY_API_BASE = 'https://api.spotify.com/v1'.freeze

  def spotify_connection(user = current_user)
    user.platform_connections.find_by(platform: 'spotify')
  end

  def spotify_access?(user)
    PlatformConnection.exists?(user_id: user.id, platform: 'spotify')
  end

  def refresh_spotify_token(connection = spotify_connection)
    return false unless connection&.supports_refresh?
    return true unless connection.token_expired?
    uri = URI.parse('https://accounts.spotify.com/api/token')
    req = Net::HTTP::Post.new(uri)
    req['Authorization'] = 'Basic ' + Base64.strict_encode64("#{ENV['SPOTIFY_CLIENT_ID']}:#{ENV['SPOTIFY_CLIENT_SECRET']}")
    req.set_form_data({
      grant_type: 'refresh_token',
      refresh_token: connection.refresh_token
    })
    res = Net::HTTP.start(uri.host, uri.port, use_ssl: true) { |http| http.request(req) }
    return false unless res.code.to_i == 200
    data = JSON.parse(res.body)
    connection.update!(
      access_token: data['access_token'],
      expires_at: Time.current + data.fetch('expires_in', 3600).seconds
    )
    true
  rescue => e
    Rails.logger.error "Failed to refresh Spotify token: #{e.message}"
    false
  end

  def spotify_get(connection, path, params = {})
    refresh_spotify_token(connection)
    uri = URI.parse(SPOTIFY_API_BASE + path)
    uri.query = URI.encode_www_form(params) if params.any?
    req = Net::HTTP::Get.new(uri)
    req['Authorization'] = "Bearer #{connection.access_token}"
    res = Net::HTTP.start(uri.host, uri.port, use_ssl: true) { |h| h.request(req) }
    raise "Spotify API error #{res.code}" unless res.code.to_i.between?(200,299)
    JSON.parse(res.body)
  end

  def fetch_spotify_playlists(connection, limit: 50)
    data = spotify_get(connection, '/me/playlists', { limit: limit })
    (data['items'] || []).map do |pl|
      {
        id: pl['id'],
        title: pl['name'],
        description: pl['description'],
        video_count: pl.dig('tracks','total'),
        thumbnail_url: pl.dig('images',0,'url')
      }
    end
  end

  def fetch_spotify_playlist_tracks(connection, playlist_id, limit: 100)
    data = spotify_get(connection, "/playlists/#{playlist_id}/tracks", { limit: limit })
    pos = -1
    (data['items'] || []).map do |item|
      track = item['track'] || {}
      pos += 1
      {
        id: track['id'],
        title: track['name'],
        artist: (track['artists'] || []).map { |a| a['name'] }.first,
  duration_ms: track['duration_ms'],
        duration: format_spotify_duration(track['duration_ms']),
        thumbnail_url: track.dig('album','images',0,'url'),
        position: pos
      }
    end
  end

  def format_spotify_duration(ms)
    return '0:00' unless ms
    total_seconds = ms.to_i / 1000
    minutes = total_seconds / 60
    seconds = total_seconds % 60
    sprintf('%d:%02d', minutes, seconds)
  end
end

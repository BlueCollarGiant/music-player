module Platforms
  class SpotifyClient
    SPOTIFY_API_BASE = 'https://api.spotify.com/v1'.freeze
    SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'.freeze

    def initialize(connection:)
      @connection = connection
    end

    # Fetch paginated playlists, auto-refreshing token if near expiry.
    # Returns { items: [...normalized...], total: Integer }
    def playlists(page:, per_page:)
      refresh! # ensure access token fresh (within 60s)
      page = [page.to_i, 1].max
      per_page = [[per_page.to_i, 1].max, 50].min
      offset = (page - 1) * per_page
      json = get_json("#{SPOTIFY_API_BASE}/me/playlists?#{URI.encode_www_form(limit: per_page, offset: offset)}")
      raw_items = (json['items'] || [])
      items = raw_items.map { |pl| normalize_playlist(pl) }
      total = json['total'] || items.size
      { items: items, total: total }
    end

    # Existing track support retained (not required by spec) for other callers.
    def playlist_tracks(playlist_id:, page:, per_page:)
      refresh!
      page = [page.to_i, 1].max
      per_page = [[per_page.to_i, 1].max, 100].min
      offset = (page - 1) * per_page
      json = get_json("#{SPOTIFY_API_BASE}/playlists/#{playlist_id}/tracks?#{URI.encode_www_form(limit: per_page, offset: offset)}")
      items = (json['items'] || []).map do |it|
        tr = it['track'] || {}
        artists = tr['artists'] || []
        album_images = tr.dig('album','images') || []
        best_image = album_images.first
        {
          id: tr['id'],
          title: tr['name'],
          artist: (artists.first && artists.first['name']) || artists.map { |a| a['name'] }.join(', '),
          duration_ms: tr['duration_ms'],
          thumbnail_url: best_image && best_image['url'],
          platform: 'spotify'
        }
      end
      total = json.dig('tracks','total') || json['total'] || items.size
      { items: items, total: total }
    end

    private

    def normalize_playlist(pl)
      images = pl['images'] || []
      best_image = images.first
      track_total = pl.dig('tracks', 'total')
      {
        id: pl['id'],
        title: pl['name'],
        description: pl['description'],
        thumbnail_url: best_image && best_image['url'],
        track_count: track_total,
        video_count: track_total, # backward compatibility for existing front-end expecting video_count
        platform: 'spotify'
      }
    end

    def get_json(url)
      uri = URI.parse(url)
      req = Net::HTTP::Get.new(uri)
      req['Authorization'] = "Bearer #{@connection.access_token}"
      res = Net::HTTP.start(uri.host, uri.port, use_ssl: true) { |h| h.request(req) }
      code = res.code.to_i
      raise Error, "Spotify API error #{code}: #{res.body}" unless code.between?(200, 299)
      JSON.parse(res.body) rescue {}
    end

    def refresh!
      return unless needs_refresh?
      return unless @connection.supports_refresh?
      uri = URI.parse(SPOTIFY_TOKEN_URL)
      req = Net::HTTP::Post.new(uri)
      basic = Base64.strict_encode64("#{ENV['SPOTIFY_CLIENT_ID']}:#{ENV['SPOTIFY_CLIENT_SECRET']}")
      req['Authorization'] = "Basic #{basic}"
      req.set_form_data({
        grant_type: 'refresh_token',
        refresh_token: @connection.refresh_token
      })
      res = Net::HTTP.start(uri.host, uri.port, use_ssl: true) { |h| h.request(req) }
      if res.code.to_i.between?(200,299)
        data = JSON.parse(res.body) rescue {}
        new_token = data['access_token']
        expires_in = data['expires_in']
        if new_token
          @connection.update(
            access_token: new_token,
            expires_at: expires_in ? Time.current + expires_in.to_i.seconds : @connection.expires_at
          )
        end
      else
        Rails.logger.warn "Spotify token refresh failed (status=#{res.code})"
      end
    rescue => e
      Rails.logger.warn "Spotify token refresh exception: #{e.class}: #{e.message}"
    end

    def needs_refresh?
      return false unless @connection.expires_at.present?
      (@connection.expires_at - Time.current) < 60
    end

    class Error < StandardError; end
  end
end


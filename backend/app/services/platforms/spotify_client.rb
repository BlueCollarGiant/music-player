module Platforms
  class SpotifyClient
    SPOTIFY_API_BASE = 'https://api.spotify.com/v1'.freeze

    def initialize(connection:)
      @connection = connection
    end

    def playlists(page:, per_page:)
      page = 1 if page < 1
      per_page = 1 if per_page < 1
      offset = (page - 1) * per_page
      json = get("/me/playlists", limit: per_page, offset: offset)
      items = (json['items'] || []).map do |pl|
        images = pl['images'] || []
        best_image = images.first
        {
          id: pl['id'],
          title: pl['name'],
          description: pl['description'],
          thumbnail_url: best_image && best_image['url'],
          video_count: pl.dig('tracks','total')
        }
      end
      total = json['total'] || items.size
      { items: items, total: total }
    end

    def playlist_tracks(playlist_id:, page:, per_page:)
      page = 1 if page < 1
      per_page = 1 if per_page < 1
      offset = (page - 1) * per_page
      json = get("/playlists/#{playlist_id}/tracks", limit: per_page, offset: offset)
      items = (json['items'] || []).map do |it|
        tr = it['track'] || {}
        artists = tr['artists'] || []
        album_images = tr.dig('album','images') || []
        best_image = album_images.first
        {
          id: tr['id'],
            title: tr['name'],
            artist: artists.first && artists.first['name'] || artists.map { |a| a['name'] }.join(', '),
            duration_ms: tr['duration_ms'],
            thumbnail_url: best_image && best_image['url'],
            platform: 'spotify'
        }
      end
      total = json.dig('tracks','total') || json['total'] || items.size
      { items: items, total: total }
    end

    private

    def get(path, params = {})
      uri = URI.parse(SPOTIFY_API_BASE + path)
      uri.query = URI.encode_www_form(params) if params.any?
      req = Net::HTTP::Get.new(uri)
      req['Authorization'] = "Bearer #{@connection.access_token}"
      res = Net::HTTP.start(uri.host, uri.port, use_ssl: true) { |h| h.request(req) }
      if res.code.to_i == 401
        raise UnauthorizedError, 'Spotify token expired or invalid'
      end
      unless res.code.to_i.between?(200,299)
        raise Error, "Spotify API error #{res.code}: #{res.body}"
      end
      JSON.parse(res.body)
    end

    class Error < StandardError; end
    class UnauthorizedError < Error; end
  end
end

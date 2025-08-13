module Api
  module Platforms
    class BrowseController < ApplicationController
      include YoutubePlatform
      before_action :authenticate_user!

      # GET /api/platforms/:platform/playlists
      def playlists
        platform = params[:platform].to_s.downcase
        return unsupported_platform!(platform) unless supported_platform?(platform)
        page, per_page = pagination_params(default_per: 25, max_per: 50)

        if platform == 'youtube'
          connection = youtube_connection
          return render(json: { error: 'YouTube not connected' }, status: :forbidden) unless connection
          refresh_youtube_token(connection) if connection.token_expired?
          service = create_youtube_service(connection)
          raw_playlists = fetch_user_playlists(service)
          total = raw_playlists.length
          sliced = raw_playlists.slice((page - 1) * per_page, per_page) || []
          return render json: {
            playlists: sliced.map { |pl| normalize_playlist(pl) },
            page: page,
            per_page: per_page,
            total: total
          }
        end
      end

      # GET /api/platforms/:platform/playlists/:id/tracks
      def tracks
        platform = params[:platform].to_s.downcase
        return unsupported_platform!(platform) unless supported_platform?(platform)
        playlist_id = params[:id]
        page, per_page = pagination_params(default_per: 50, max_per: 100)

        if platform == 'youtube'
          connection = youtube_connection
          return render(json: { error: 'YouTube not connected' }, status: :forbidden) unless connection
          refresh_youtube_token(connection) if connection.token_expired?
          service = create_youtube_service(connection)
          raw_tracks = fetch_playlist_tracks(service, playlist_id)
          total = raw_tracks.length
          sliced = raw_tracks.slice((page - 1) * per_page, per_page) || []
          return render json: {
            tracks: sliced.map { |t| normalize_track(t, platform) },
            page: page,
            per_page: per_page,
            total: total
          }
        end
      end

      private

      def pagination_params(default_per:, max_per:)
        page = params[:page].to_i
        page = 1 if page < 1
        per_page = params[:per_page].to_i
        per_page = default_per if per_page < 1
        per_page = [per_page, max_per].min
        [page, per_page]
      end
      
      def supported_platform?(platform)
        PlatformConnection::SUPPORTED_PLATFORMS.include?(platform)
      end

      def unsupported_platform!(platform)
        render json: { error: "Unsupported platform: #{platform}" }, status: :bad_request
      end

      # Normalization
    def normalize_playlist(raw)
        {
          id: raw[:id],
          title: raw[:title],
      description: raw[:description],
          thumbnail_url: raw[:thumbnail_url],
          video_count: raw[:video_count]
        }
      end

      def normalize_track(raw, platform)
        {
          id: raw[:id],
          title: raw[:title],
          artist: raw[:artist],
          duration_ms: nil, # placeholder per contract
          thumbnail_url: raw[:thumbnail_url],
          platform: platform
        }
      end
    end
  end
end

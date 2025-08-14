module Api
  module Platforms
    class BrowseController < ApplicationController
  include YoutubePlatform
  include SpotifyPlatform
      before_action :authenticate_user!

      # GET /api/platforms/:platform/playlists
      def playlists
        platform = params[:platform].to_s.downcase
        return unsupported_platform!(platform) unless supported_platform?(platform)
        page, per_page = pagination_params(default_per: 25, max_per: 50)

        case platform
        when 'youtube'
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
        when 'spotify'
          connection = spotify_connection
          return render(json: { error: 'Spotify not connected' }, status: :forbidden) unless connection
          client = Platforms::SpotifyClient.new(connection: connection)
          begin
            data = client.playlists(page: page, per_page: per_page)
            return render json: {
              playlists: data[:items].map { |pl| normalize_playlist(pl) },
              page: page,
              per_page: per_page,
              total: data[:total]
            }
          rescue Platforms::SpotifyClient::UnauthorizedError
            render json: { error: 'Spotify authorization expired' }, status: :unauthorized
          rescue => e
            Rails.logger.error("Spotify playlists fetch error: #{e.message}")
            render json: { error: 'Unable to fetch Spotify playlists' }, status: :service_unavailable
          end
        end
      end

      # GET /api/platforms/:platform/playlists/:id/tracks
      def tracks
        platform = params[:platform].to_s.downcase
        return unsupported_platform!(platform) unless supported_platform?(platform)
        playlist_id = params[:id]
        page, per_page = pagination_params(default_per: 50, max_per: 100)

        case platform
        when 'youtube'
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
        when 'spotify'
          connection = spotify_connection
          return render(json: { error: 'Spotify not connected' }, status: :forbidden) unless connection
          client = Platforms::SpotifyClient.new(connection: connection)
          begin
            data = client.playlist_tracks(playlist_id: playlist_id, page: page, per_page: per_page)
            return render json: {
              tracks: data[:items].map { |t| normalize_track(t, platform) },
              page: page,
              per_page: per_page,
              total: data[:total]
            }
          rescue Platforms::SpotifyClient::UnauthorizedError
            render json: { error: 'Spotify authorization expired' }, status: :unauthorized
          rescue => e
            Rails.logger.error("Spotify tracks fetch error: #{e.message}")
            render json: { error: 'Unable to fetch Spotify tracks' }, status: :service_unavailable
          end
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
          duration_ms: raw[:duration_ms],
          thumbnail_url: raw[:thumbnail_url],
          platform: platform
        }
      end
    end
  end
end

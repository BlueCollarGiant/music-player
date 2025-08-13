module Api
  module Platforms
    class BrowseController < ApplicationController
      before_action :authenticate_user!

      # GET /api/platforms/:platform/playlists
      def playlists
        platform = params[:platform].to_s.downcase
        page, per_page = pagination_params(default_per: 25, max_per: 50)

        case platform
        when 'youtube'
          connection = current_user.youtube_connection
          return render(json: { error: 'YouTube not connected' }, status: :forbidden) unless connection

          service = create_youtube_service(connection)
          raw_playlists = fetch_user_playlists(service)
          total = raw_playlists.length
          sliced = raw_playlists.slice((page - 1) * per_page, per_page) || []

          render json: {
            playlists: sliced.map { |pl| normalize_playlist(pl) },
            page: page,
            per_page: per_page,
            total: total
          }
        else
          render json: { error: "Unsupported platform: #{platform}" }, status: :bad_request
        end
      end

      # GET /api/platforms/:platform/playlists/:id/tracks
      def tracks
        platform = params[:platform].to_s.downcase
        playlist_id = params[:id]
        page, per_page = pagination_params(default_per: 50, max_per: 100)

        case platform
        when 'youtube'
          connection = current_user.youtube_connection
          return render(json: { error: 'YouTube not connected' }, status: :forbidden) unless connection

          service = create_youtube_service(connection)
          raw_tracks = fetch_playlist_tracks(service, playlist_id)
          total = raw_tracks.length
          sliced = raw_tracks.slice((page - 1) * per_page, per_page) || []

          render json: {
            tracks: sliced.map { |t| normalize_track(t, platform) },
            page: page,
            per_page: per_page,
            total: total
          }
        else
          render json: { error: "Unsupported platform: #{platform}" }, status: :bad_request
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

      # YouTube helpers (localized copy of existing logic)
      def create_youtube_service(connection)
        require 'google/apis/youtube_v3'
        require 'googleauth'

        youtube = Google::Apis::YoutubeV3::YouTubeService.new
        youtube.authorization = Google::Auth::UserRefreshCredentials.new(
          client_id: ENV['YOUTUBE_CLIENT_ID'],
          client_secret: ENV['YOUTUBE_CLIENT_SECRET'],
          refresh_token: connection.refresh_token,
          access_token: connection.access_token
        )
        youtube
      end

      def fetch_user_playlists(youtube_service)
        response = youtube_service.list_playlists(
          'snippet,contentDetails',
          mine: true,
          max_results: 50
        )

        response.items.map do |playlist|
          {
            id: playlist.id,
            title: playlist.snippet.title,
            description: playlist.snippet.description&.truncate(200),
            video_count: playlist.content_details.item_count,
            thumbnail_url: playlist.snippet&.thumbnails&.medium&.url,
            created_at: playlist.snippet.published_at
          }
        end
      end

      def fetch_playlist_tracks(youtube_service, playlist_id)
        all_tracks = []
        next_page_token = nil

        loop do
          response = youtube_service.list_playlist_items(
            'snippet,contentDetails',
            playlist_id: playlist_id,
            max_results: 50,
            page_token: next_page_token
          )

            tracks = response.items.map do |item|
              video_snippet = item.snippet
              {
                id: item.content_details.video_id,
                title: video_snippet.title,
                artist: video_snippet.video_owner_channel_title || video_snippet.channel_title,
                duration: nil, # duration_ms to be populated in future optimization
                thumbnail_url: video_snippet&.thumbnails&.medium&.url,
                video_url: "https://www.youtube.com/watch?v=#{item.content_details.video_id}",
                position: item.snippet.position
              }
            end

            all_tracks.concat(tracks)
            next_page_token = response.next_page_token
            break unless next_page_token
        end

        all_tracks.sort_by { |track| track[:position] }
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

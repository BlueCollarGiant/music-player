module Api
  module Platforms
    class SpotifyController < ApplicationController
      before_action :authenticate_user!

      def playlists
        connection = current_user.platform_connections.find_by(platform: 'spotify')
        return render json: { error: 'Spotify connection not found' }, status: :not_found unless connection

        page = params.fetch(:page, 1).to_i
        per_page = params.fetch(:per_page, 20).to_i

        client = ::Platforms::SpotifyClient.new(connection: connection)
        data = client.playlists(page: page, per_page: per_page)
        render json: { playlists: data[:items], total: data[:total] }
      rescue StandardError => e
        Rails.logger.error("SpotifyController#playlists error: #{e.class}: #{e.message}\n#{e.backtrace&.first(5)&.join("\n")}")
        render json: { error: e.class.name, message: e.message }, status: :internal_server_error
      end

      # GET /api/platforms/spotify/token
      # Exposes short-lived access token for Web Playback SDK (client playback). Refreshes if near expiry.
      def token
        connection = current_user.platform_connections.find_by(platform: 'spotify')
        return render json: { error: 'Spotify connection not found' }, status: :not_found unless connection
        # Attempt refresh via service refresh! logic
        client = ::Platforms::SpotifyClient.new(connection: connection)
        client.send(:refresh!) # safe even if not needed
        render json: { access_token: connection.access_token, expires_at: connection.expires_at }
      rescue StandardError => e
        Rails.logger.error("SpotifyController#token error: #{e.class}: #{e.message}")
        render json: { error: e.class.name, message: 'Unable to provide token' }, status: :internal_server_error
      end
    end
  end
end

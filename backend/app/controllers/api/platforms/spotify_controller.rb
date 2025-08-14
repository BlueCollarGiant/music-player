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
    end
  end
end

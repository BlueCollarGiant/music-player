module Api
  module Platforms
    class ConnectionsController < ApplicationController
      include YoutubePlatform
      before_action :authenticate_user!

      def check_access
        platform = params[:platform].to_s.downcase
        return unsupported_platform!(platform) unless supported_platform?(platform)
        has_access = PlatformConnection.exists?(user_id: current_user.id, platform: platform)
        render json: { has_access: has_access }
      end

      private

      def supported_platform?(platform)
        PlatformConnection::SUPPORTED_PLATFORMS.include?(platform)
      end

      def unsupported_platform!(platform)
        render json: { error: "Unsupported platform: #{platform}" }, status: :bad_request
      end
    end
  end
end

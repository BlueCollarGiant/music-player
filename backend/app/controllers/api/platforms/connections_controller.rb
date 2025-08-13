module Api
  module Platforms
    class ConnectionsController < ApplicationController
      before_action :authenticate_user!

      def check_access
        platform = params[:platform].to_s.downcase
        has_access = PlatformConnection.exists?(user_id: current_user.id, platform: platform)
        render json: { has_access: has_access }
      end
    end
  end
end

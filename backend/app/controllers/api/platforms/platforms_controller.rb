# app/controllers/api/platforms_controller.rb
class Api::PlatformsController < ApplicationController
  before_action :authenticate_user!

  # GET /api/platforms/:platform/check_access
  def check_access
    has_access = PlatformConnection.by_platform(params[:platform])
                                   .where(user: current_user)
                                   .active
                                   .exists?

    render json: { platform: params[:platform], has_access: has_access }
  end

  # GET /api/platforms/:platform/playlists
  def playlists
    connection = PlatformConnection.by_platform(params[:platform])
                                   .find_by(user: current_user)

    unless connection&.active?
      return render json: { error: 'Platform not connected or token expired' }, status: :unauthorized
    end

    case params[:platform]
    when 'youtube'
      playlists = YoutubeClient.new(connection).fetch_playlists
    else
      return render json: { error: 'Unsupported platform' }, status: :bad_request
    end

    render json: { platform: params[:platform], playlists: playlists }
  end
end
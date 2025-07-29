class UserProfilesController < ApplicationController
  before_action :authenticate_user!
  before_action :set_user_profile, only: [:show, :update, :destroy, :username_history, :upload_avatar, :avatar_history]
  before_action only: [:show, :update, :destroy, :username_history, :upload_avatar] do
    authorize_self_or_admin!(@user_profile.user_id)
  end
  before_action only: [:avatar_history] do
    authorize_admin!
  end
  
  def show
    render json: {
      id: @user_profile.id,
      username: @user_profile.username,
      created_at: @user_profile.created_at,
      updated_at: @user_profile.updated_at,
      avatar_url: avatar_url(@user_profile.avatar),
      user: {
        id: @user_profile.user.id,
        email: @user_profile.user.email
      }
    }
  end

  def username_history
    limit = sanitized_limit
    change_logs = @user_profile.user_name_change_logs.recent.limit(limit)
    
    formatted_logs = change_logs.map { |log| format_username_log(log) }
    
    render json: {
      user_id: @user_profile.user.id,
      username: @user_profile.username,
      total_changes: formatted_logs.length,
      limit_applied: limit,
      changes: formatted_logs
    }
  end

  def update
    if @user_profile.update(user_profile_params)
      render json: @user_profile
    else
      render json: { errors: @user_profile.errors.full_messages}, status: :unprocessable_entity
    end
  end

  def destroy
    @user_profile.destroy
    head :no_content
  end

  # POST /user_profiles/:id/upload_avatar
  def upload_avatar
    if user_profile_params[:avatar].present?
      @user_profile.avatar.attach(user_profile_params[:avatar])
      if @user_profile.save
        render json: {
          message: "Avatar uploaded successfully",
          avatar_url: avatar_url(@user_profile.avatar)
        }
      else
        render json: { errors: @user_profile.errors.full_messages }, status: :unprocessable_entity
      end
    else
      render json: { error: "No avatar file provided" }, status: :bad_request
    end
  end

  # GET /user_profiles/:id/avatar_history (Admin only)
  def avatar_history
    limit = sanitized_limit
    history = @user_profile.user_avatars.recent.limit(limit)
    
    formatted_history = history.map { |log| format_avatar_log(log) }

    render json: {
      user_id: @user_profile.user.id,
      username: @user_profile.username,
      total_changes: formatted_history.length,
      limit_applied: limit,
      changes: formatted_history
    }
  end

  # GET /user_profiles/youtube_connection
  def youtube_connection
    connection = current_user.youtube_connection
    
    if connection
      render json: {
        youtube_connection: {
          id: connection.id,
          connected_at: connection.connected_at,
          expires_at: connection.expires_at,
          is_active: connection.active?,
          supports_refresh: connection.supports_refresh?
        }
      }
    else
      render json: {
        youtube_connection: nil,
        message: "No YouTube connection found"
      }
    end
  end

  # DELETE /user_profiles/youtube_connection
  def unlink_youtube
    connection = current_user.youtube_connection
    
    if connection
      connection.destroy
      render json: { 
        message: "YouTube connection removed successfully" 
      }, status: :ok
    else
      render json: { 
        error: "No YouTube connection found" 
      }, status: :not_found
    end
  end

  # GET /user_profiles/platform_connections
  def platform_connections
    connections = current_user.platform_connections.includes(:user)
    
    formatted_connections = connections.map do |connection|
      {
        id: connection.id,
        platform: connection.platform,
        platform_user_id: connection.platform_user_id,
        connected_at: connection.connected_at,
        expires_at: connection.expires_at,
        is_active: connection.expires_at.nil? || connection.expires_at > Time.current,
        scopes: connection.scopes
      }
    end

    render json: {
      platform_connections: formatted_connections
    }
  end

  private

  def set_user_profile
    @user_profile = UserProfile.find(params[:id])
  rescue ActiveRecord::RecordNotFound
    render json: {errors: ['Profile not found']}, status: :not_found
  end

  def user_profile_params
    params.require(:user_profile).permit(:username, :avatar)
  end

  def avatar_url(avatar)
    return nil unless avatar.attached?
    Rails.application.routes.url_helpers.rails_blob_url(
      avatar, 
      host: ENV.fetch("BASE_URL", "http://localhost:3000")
    )
  end

  def format_username_log(log)
    {
      id: log.id,
      old_username: log.old_username,
      current_username: log.current_username,
      change_date: log.change_date,
      formatted_date: log.change_date.strftime("%B %d, %Y at %I:%M %p")
    }
  end

  def format_avatar_log(log)
    {
      id: log.id,
      current_avatar: log.current_avatar,
      change_date: log.change_date,
      formatted_date: log.change_date.strftime("%B %d, %Y at %I:%M %p")
    }
  end

  # Helper method to prevent DoS attacks via excessive limit requests
  def sanitized_limit(default: 25, max: 100)
    requested = params[:limit].to_i
    return default if requested <= 0
    [requested, max].min
  end
end

class UserProfilesController < ApplicationController
  before_action :authenticate_user!
  before_action :sert_user_profile, only: [:show, :update, :destroy]
  before_action only: [:show, :update, :destroy] do
    authorize_self_or_admin!(@user_profile.user_id)
  end
  
  
  ##
  # Renders the current user profile as a JSON response.
  def show
    render json: @user_profile
  end

  ##
  # Updates the user profile with permitted parameters.
  # Renders the updated profile as JSON on success, or error messages with an unprocessable entity status on failure.
  def update
    if @user_profile.update(user_profile_params)
      render json: @user_profile
    else
      render json: { errors: @user_profile.errors.full_messages}, status: :unprocessable_entry
    end
  end

  ##
  # Deletes the specified user profile and returns a 204 No Content response.
  def destroy
    @user_profile.destroy
    head :no_content
  end

  private

  ##
  # Finds and sets the user profile based on the provided ID parameter.
  # If the profile is not found, returns a JSON error response with a 404 status.
  def sert_user_profile
    @user_profile = UserProfile.find(params[:id])
  rescue ActiveRecord:: RecordNotFound
    render json: {errors: ['Profile not found']}, status: :not_found
  end

  ##
  # Returns the permitted parameters for updating or creating a user profile.
  # Only allows `username`, `avatar`, `spotify_linked`, `soundcloud_linked`, and `youtube_linked` attributes.
  # @return [ActionController::Parameters] The filtered parameters for a user profile.
  def user_profile_params
    params.require(:user_profile).permit(:username, :avatar, :spotify_linked, :soundcloud_linked, :youtube_linked )
  end
end

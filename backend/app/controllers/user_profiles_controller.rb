class UserProfilesController < ApplicationController
  before_action :authenticate_user!
  before_action :set_user_profile, only: [:show, :update, :destroy]
  before_action only: [:show, :update, :destroy] do
    authorize_self_or_admin!(@user_profile.user_id)
  end
  
  
  def show
    render json: @user_profile
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

  private

  def set_user_profile
    @user_profile = UserProfile.find(params[:id])
  rescue ActiveRecord::RecordNotFound
    render json: {errors: ['Profile not found']}, status: :not_found
  end

  def user_profile_params
    params.require(:user_profile).permit(:username, :avatar, :spotify_linked, :soundcloud_linked, :youtube_linked )
  end
end

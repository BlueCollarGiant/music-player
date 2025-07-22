class OauthController < ApplicationController
  skip_before_action :authenticate_user!, only: [:callback, :failure]

  # GET /auth/:provider/callback - unified handling for multiple OAuth providers
  def callback
    auth = request.env['omniauth.auth']
    provider = params[:provider]
    
    # Handle different OAuth providers
    case provider
    when 'google_oauth2'
      handle_google_oauth(auth)
    when 'spotify'
      handle_spotify_oauth(auth)
    when 'soundcloud'
      handle_soundcloud_oauth(auth)
    else
      render json: { 
        error: "Unsupported OAuth provider", 
        provider: provider 
      }, status: :bad_request
    end
  end

  # GET /auth/failure
  def failure
    error_message = params[:message] || "OAuth authentication failed"
    render json: { 
      error: "OAuth authentication failed", 
      message: error_message 
    }, status: :unauthorized
  end

  private

  def handle_google_oauth(auth)
    user = User.from_omniauth(auth)
    
    if user.persisted?
      render_oauth_success(user, 'Google')
    else
      render_oauth_error(user)
    end
  end

  def handle_spotify_oauth(auth)
    # Future implementation for Spotify OAuth
    user = User.from_omniauth(auth)
    
    if user.persisted?
      render_oauth_success(user, 'Spotify')
    else
      render_oauth_error(user)
    end
  end

  def handle_soundcloud_oauth(auth)
    # Future implementation for SoundCloud OAuth
    user = User.from_omniauth(auth)
    
    if user.persisted?
      render_oauth_success(user, 'SoundCloud')
    else
      render_oauth_error(user)
    end
  end

  def render_oauth_success(user, provider_name)
    # Generate JWT token (same as manual login)
    token = JsonWebToken.encode(user_id: user.id)
    
    render json: {
      message: "#{provider_name} OAuth login successful",
      token: token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        oauth_provider: user.provider
      },
      user_profile: {
        id: user.user_profile.id,
        username: user.user_profile.username
      }
    }, status: :ok
  end

  def render_oauth_error(user)
    render json: { 
      errors: user.errors.full_messages 
    }, status: :unprocessable_entity
  end
end

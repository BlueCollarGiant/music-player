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
    when 'youtube'
      handle_youtube_oauth(auth)
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
    # Standard Google OAuth for user authentication (not music platform)
    user = User.from_omniauth(auth)
    
    if user.persisted?
      # Store user in session for subsequent platform connections
      session[:current_user_id] = user.id
      render_oauth_success(user, 'Google')
    else
      render_oauth_error(user)
    end
  end

  def handle_youtube_oauth(auth)
    # YouTube music platform connection
    current_user = authenticate_user_for_platform_connection
    return unless current_user
    
    platform_connection = create_or_update_platform_connection(
      current_user, 'youtube', auth
    )
    
    if platform_connection.persisted?
      render_platform_connection_success(platform_connection, 'YouTube')
    else
      render_platform_connection_error(platform_connection)
    end
  end

  def handle_spotify_oauth(auth)
    # Spotify music platform connection
    current_user = authenticate_user_for_platform_connection
    return unless current_user
    
    platform_connection = create_or_update_platform_connection(
      current_user, 'spotify', auth
    )
    
    if platform_connection.persisted?
      render_platform_connection_success(platform_connection, 'Spotify')
    else
      render_platform_connection_error(platform_connection)
    end
  end

  def handle_soundcloud_oauth(auth)
    # SoundCloud music platform connection
    current_user = authenticate_user_for_platform_connection
    return unless current_user
    
    platform_connection = create_or_update_platform_connection(
      current_user, 'soundcloud', auth
    )
    
    if platform_connection.persisted?
      render_platform_connection_success(platform_connection, 'SoundCloud')
    else
      render_platform_connection_error(platform_connection)
    end
  end

  def render_oauth_success(user, provider_name)
    # Generate JWT token (same as manual login)
    token = JsonWebToken.encode(user_id: user.id)
    
    # Return JSON response with token and user info
    render json: {
      message: "#{provider_name} OAuth login successful",
      token: token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        oauth_provider: user.provider,
        user_profile_id: user.user_profile.id
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

  # Platform connection helpers
  def authenticate_user_for_platform_connection
    # For platform connections during OAuth flow, we need to get the user from session
    # or from a temporary token stored during the Google login flow
    
    # Try to get user from session (set during Google OAuth - this is the primary method
    # for platform connections immediately following Google authentication)
    if session[:current_user_id]
      current_user = User.find_by(id: session[:current_user_id])
      return current_user if current_user
    end
    
    # Try to get user from Authorization header (for API calls from frontend)
    token = request.headers['Authorization']&.gsub('Bearer ', '')
    
    if token.present?
      decoded_token = JsonWebToken.decode(token)
      current_user = User.find(decoded_token[:user_id]) if decoded_token
      return current_user if current_user
    end
    
    # If no user found, this might be a first-time OAuth flow
    # In this case, we should redirect to Google OAuth first
    unless current_user
      render json: { 
        error: "Authentication required. Please login with Google first.",
        login_url: "/auth/google_oauth2"
      }, status: :unauthorized
      return nil
    end
    
    current_user
  end

  def create_or_update_platform_connection(user, platform, auth)
    # Find existing connection or create new one
    connection = user.platform_connections.find_or_initialize_by(platform: platform)
    
    # Extract token information from auth object
    credentials = auth.credentials
    
    connection.assign_attributes(
      platform_user_id: auth.uid,
      access_token: credentials.token,
      refresh_token: credentials.refresh_token,
      expires_at: credentials.expires_at ? Time.at(credentials.expires_at) : nil,
      connected_at: Time.current
    )
    
    connection.save
    connection
  end

  def render_platform_connection_success(connection, platform_name)
    # Return JSON response for platform connection success
    render json: {
      message: "#{platform_name} platform connected successfully",
      platform_connection: {
        id: connection.id,
        platform: connection.platform,
        connected_at: connection.connected_at,
        expires_at: connection.expires_at,
        supports_refresh: connection.supports_refresh?,
        long_lived_token: connection.long_lived_token?
      }
    }, status: :ok
  end

  def render_platform_connection_error(connection)
    render json: { 
      error: "Failed to connect platform",
      errors: connection.errors.full_messages 
    }, status: :unprocessable_entity
  end
end

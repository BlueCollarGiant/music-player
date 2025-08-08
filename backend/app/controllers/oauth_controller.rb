#class OauthController < ApplicationController
  #skip_before_action :authenticate_user!, only: [:callback, :failure]

  # GET /auth/:provider/callback - handles Google login and YouTube connection
  #def callback
    #auth = request.env['omniauth.auth']
    #provider = params[:provider]
    
    #case provider
    #when 'google_oauth2'
      #handle_google_login(auth)
    #when 'youtube'
      #handle_youtube_connection(auth)
    #else
      #render json: { 
        #error: "Unsupported OAuth provider", 
        #provider: provider 
      #}, status: :bad_request
    #end
  #end

  # GET /auth/failure
  #def failure
    #error_message = params[:message] || "OAuth authentication failed"
    #render json: { 
      #error: "OAuth authentication failed", 
      #message: error_message 
    #}, status: :unauthorized
  #end

  #private

  #def handle_google_login(auth)
    # Standard Google OAuth for user authentication
    #user = User.from_omniauth(auth)
    
    #if user.persisted?
      # Store user in session for subsequent YouTube connection
      #session[:current_user_id] = user.id
      #render_login_success(user)
    #else
      #render_login_error(user)
    #end
  #end

  #def handle_youtube_connection(auth)
    # YouTube connection for playlist access
    #current_user = find_authenticated_user
    #return unless current_user

    #youtube_connection = create_or_update_youtube_connection(current_user, auth)

    #if youtube_connection.persisted?
      #render_youtube_connection_success(youtube_connection)
    #else
      #render_youtube_connection_error(youtube_connection)
    #end
  #end

  #def render_login_success(user)
    # Generate JWT token for user authentication
    #token = JsonWebToken.encode(user_id: user.id)
    
    # Redirect to frontend with token
    #frontend_url = Rails.env.development? ? 'http://localhost:4200' : ENV['FRONTEND_URL']
    #redirect_url = "#{frontend_url}/auth/callback?token=#{token}&type=login"

    #redirect_to redirect_url, allow_other_host: true
  #end

  #def render_login_error(user)
    #render json: { 
      #error: "Login failed",
      #errors: user.errors.full_messages 
    #}, status: :unprocessable_entity
  #end

  #def find_authenticated_user
    # Try to get user from session (set during Google login)
    #if session[:current_user_id]
      #user = User.find_by(id: session[:current_user_id])
      #return user if user
    #end

    # Try to get user from Authorization header (for API calls)
    #token = extract_jwt_token
    #if token.present?
      #begin
        #decoded = JsonWebToken.decode(token)
        #user = User.find_by(id: decoded[:user_id])
        #return user if user
      #rescue JWT::DecodeError, ActiveRecord::RecordNotFound
        # Token invalid, continue to error
      #end
    #end
    
    # No authenticated user found
    #render json: { 
      #error: "Authentication required", 
      #message: "Please login with Google first",
      #login_url: "/auth/google_oauth2"
    #}, status: :unauthorized

    #nil
  #end

  #def create_or_update_youtube_connection(user, auth)
    # Find existing YouTube connection or create new one
    #connection = user.youtube_connections.find_or_initialize_by(
      #platform: 'youtube'
    #)

    #credentials = auth.credentials

    #connection.assign_attributes(
      #youtube_user_id: auth.uid,
      #access_token: credentials.token,
      #refresh_token: credentials.refresh_token,
      #token_expires_at: credentials.expires_at ? Time.at(credentials.expires_at) : nil,
      #connected_at: Time.current,
      # Store additional YouTube-specific data
      #channel_id: auth.extra&.raw_info&.channel_id,
      #channel_name: auth.info&.name
    #)
    
    #connection.save
    #connection
  #end

  #def render_youtube_connection_success(connection)
    # Redirect to frontend with success status
    #frontend_url = Rails.env.development? ? 'http://localhost:4200' : ENV['FRONTEND_URL']
    #redirect_url = "#{frontend_url}/auth/callback?type=youtube&status=connected&channel=#{connection.channel_name}"

    #redirect_to redirect_url, allow_other_host: true
  #end

  #def render_youtube_connection_error(connection)
    #render json: { 
      #error: "Failed to connect YouTube account",
      #errors: connection.errors.full_messages 
    #}, status: :unprocessable_entity
  #end

  #def extract_jwt_token
    #header = request.headers['Authorization']
    #return nil unless header.present?

    #header.start_with?('Bearer ') ? header.split(' ').last : header
  #end
#end
class SessionsController < ApplicationController
  skip_before_action :authenticate_user!, only: [:create, :omniauth, :failure]

  def create
    user = User.find_by(email: params[:email])

    if user.nil?
      render json: { errors: [ "Invalid email or password"] }, status: :unauthorized
      return
    end

    if user.is_locked
      render json: { errors: ["Account is locked. Please reset your password."]}, status: :forbidden
      return
    end

    if user.authenticate(params[:password])
      user.update(failed_login_attempts: 0)
      token = JsonWebToken.encode(user_id: user.id)
      render json: {message: "Logged in successfully", user: { id: user.id, email: user.email }, token: token }, status: :ok
    else
      user.increment!(:failed_login_attempts)

      if user.failed_login_attempts >= 3
        user.update(is_locked: true)
        render json: {errors: ["Account locked after too many failed attempts. Please reset your password."] }, status: :forbidden
      else
        render json: {errors: ["Invalid email or password"]}, status: :unauthorized
      end
    end
  end

  # DELETE /logout
  def destroy
    session[:current_user_id] = nil
    render json: { message: "Logged out successfully" }, status: :ok
  end

  # Handles OAuth callback from Google
  def omniauth
    auth = request.env['omniauth.auth']
    user = User.from_omniauth(auth)

    if user
      # Create or update YouTube connection with OAuth tokens
      youtube_connection = user.youtube_connection || user.build_youtube_connection
      
      youtube_connection.update!(
        access_token: auth.credentials.token,
        refresh_token: auth.credentials.refresh_token,
        expires_at: Time.at(auth.credentials.expires_at),
        connected_at: Time.current,
        provider_uid: auth.uid,
        provider_info: {
          name: auth.info.name,
          email: auth.info.email,
          image: auth.info.image
        }
      )

      token = JsonWebToken.encode(user_id: user.id)
      
      # Check if user has YouTube connection for frontend routing
      has_youtube = youtube_connection.persisted? && youtube_connection.active?
      
      redirect_to "http://localhost:4200/landing?token=#{token}&youtube_connected=#{has_youtube}"
    else
      Rails.logger.error "OAuth authentication failed for provider: #{auth&.provider}"
      redirect_to "http://localhost:4200/landing?error=auth_failed"
    end
  rescue => e
    Rails.logger.error "OAuth callback error: #{e.message}"
    redirect_to "http://localhost:4200/landing?error=server_error"
  end

  # Handles OAuth failures
  def failure
    error_msg = params[:message] || 'unknown_error'
    Rails.logger.error "OAuth failure: #{error_msg}"
    redirect_to "http://localhost:4200/landing?error=oauth_failure&details=#{error_msg}"
  end

  private

  def frontend_base_url
    ENV.fetch('FRONTEND_URL', 'http://localhost:4200')
  end
end
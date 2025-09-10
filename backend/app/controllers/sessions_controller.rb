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

  # Handles OAuth callback from Google or YouTube
  def omniauth
    auth = request.env['omniauth.auth']
    provider = auth&.provider
    user = User.from_omniauth(auth)

    if user
      token = JsonWebToken.encode(user_id: user.id)

      # Normalize fields defensively
      raw_expires_at = (auth.credentials.expires_at rescue nil)
      expires_at = case raw_expires_at
                   when Integer then Time.at(raw_expires_at)
                   when String  then Time.at(raw_expires_at.to_i) rescue nil
                   else nil
                   end
      if expires_at.nil? && auth.credentials.respond_to?(:expires) && auth.credentials.expires
        expires_at = Time.current + 1.hour
      end

      # scopes may be array or string
      scopes = case auth.credentials.scope
               when Array  then auth.credentials.scope.join(' ')
               when String then auth.credentials.scope
               else nil
               end

      case provider
      when 'youtube'
        connection = user.platform_connections.find_or_initialize_by(platform: 'youtube')
        connection.update!(
          platform_user_id: auth.uid,
          access_token: auth.credentials.token,
          refresh_token: auth.credentials.refresh_token,
          expires_at: auth.credentials.expires_at ? Time.at(auth.credentials.expires_at) : nil,
          connected_at: Time.current,
          scopes: auth.credentials.scope
        )
        redirect_to "#{frontend_base_url}/landing?token=#{token}&youtube_connected=true", allow_other_host: true
      when 'spotify'
        conn = user.platform_connections.find_or_initialize_by(platform: 'spotify')
        conn.update!(
          platform_user_id: auth.uid,
          access_token: auth.credentials.token,
          refresh_token: auth.credentials.refresh_token,
          expires_at: expires_at,
          connected_at: conn.connected_at || Time.current,
          scopes: scopes
        )
        redirect_to "#{frontend_base_url}/landing?token=#{token}&platform=spotify&status=success", allow_other_host: true
      else
        Rails.logger.warn "Unhandled OAuth provider: #{provider.inspect}"
        redirect_to "#{frontend_base_url}/landing?token=#{token}", allow_other_host: true
      end
    else
      Rails.logger.error "OAuth authentication failed for provider: #{auth&.provider}"
      redirect_to "#{frontend_base_url}/landing?error=auth_failed"
    end
  rescue => e
    Rails.logger.error "OAuth callback error: #{e.message}"
    redirect_to "#{frontend_base_url}/landing?error=server_error", allow_other_host: true
  end

  # Handles OAuth failures
  def failure
    error_msg = params[:message] || 'unknown_error'
    Rails.logger.error "OAuth failure: #{error_msg}"
  redirect_to "#{frontend_base_url}/landing?error=oauth_failure&details=#{error_msg}", allow_other_host: true
  end

  private

  def frontend_base_url
    ENV.fetch('FRONTEND_URL', 'http://localhost:4200')
  end
end

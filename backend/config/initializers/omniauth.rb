# OmniAuth configuration for Rails 7.x with proper CSRF protection
#
# Spotify Redirect URI notes:
# In the Spotify Developer Dashboard add BOTH exact redirect URIs:
#   http://127.0.0.1:3000/auth/spotify/callback
#   https://your-api-host/auth/spotify/callback
# We use 127.0.0.1 (not localhost) because Spotify rejects 'localhost' for some flows.
# PKCE is enabled below for Authorization Code w/ PKCE.

# Dynamic full_host (scoped): Only coerce host to 127.0.0.1 for Spotify; let other providers use incoming host
OmniAuth.config.full_host = lambda do |env|
  req = Rack::Request.new(env)
  if req.path.start_with?('/auth/spotify')
    if Rails.env.development?
      'http://127.0.0.1:3000'
    else
      ENV.fetch('BACKEND_BASE_URL', 'https://your-api-host')
    end
  else
    "#{req.scheme}://#{req.host_with_port}"
  end
end
Rails.application.config.middleware.use OmniAuth::Builder do
  # Configure OmniAuth with proper CSRF protection
  configure do |config|
    config.allowed_request_methods = [:post, :get]
    config.silence_get_warning = true
    config.logger = Rails.logger
  end

  provider :google_oauth2,
    ENV['GOOGLE_CLIENT_ID'],
    ENV['GOOGLE_CLIENT_SECRET'],
    {
      scope: 'email profile',
      prompt: 'select_account',
      image_aspect_ratio: 'square',
      image_size: 50,
      access_type: 'online',
      skip_jwt: true,
      client_options: {
        ssl: { verify: false } # Only for development
      }
    }

  provider :google_oauth2,
    ENV['YOUTUBE_CLIENT_ID'],
    ENV['YOUTUBE_CLIENT_SECRET'],
    {
      name: 'youtube',
      scope: 'email profile https://www.googleapis.com/auth/youtube.readonly',
      prompt: 'select_account',
      access_type: 'offline',
      approval_prompt: 'auto',
      include_granted_scopes: true,
      skip_jwt: true,
      client_options: {
        ssl: { verify: false } # Only for development
      }
    }

  provider :spotify,
    ENV['SPOTIFY_CLIENT_ID'],
    ENV['SPOTIFY_CLIENT_SECRET'],
    {
      scope: 'streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state playlist-read-private playlist-read-collaborative',
      callback_path: '/auth/spotify/callback',
      provider_ignores_state: false,
      pkce: true,
      # Derive redirect_uri from BACKEND_BASE_URL in production to avoid mismatches
      redirect_uri: (
        if Rails.env.development?
          'http://127.0.0.1:3000/auth/spotify/callback'
        else
          File.join(ENV.fetch('BACKEND_BASE_URL', 'https://your-api-host'), 'auth/spotify/callback')
        end
      )
    }
end

if Rails.env.production?
  OmniAuth.config.allowed_request_methods = [:post]
else
    OmniAuth.config.allowed_request_methods = [:post, :get]
end

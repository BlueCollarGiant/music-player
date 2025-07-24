# Configure OmniAuth settings
OmniAuth.config.allowed_request_methods = [:post, :get]
OmniAuth.config.silence_get_warning = true

# Disable CSRF protection for OmniAuth in development
if Rails.env.development?
  OmniAuth.config.request_validation_phase = nil
  OmniAuth.config.before_request_phase do |env|
    env['omniauth.origin'] = nil
  end
end

# Fix CSRF issues in development
Rails.application.config.middleware.use OmniAuth::Builder do
  provider :google_oauth2,
    ENV['GOOGLE_CLIENT_ID'],
    ENV['GOOGLE_CLIENT_SECRET'],
    {
      scope: 'email profile',
      prompt: 'select_account',
      image_aspect_ratio: 'square',
      image_size: 50,
      access_type: 'online'
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
      include_granted_scopes: true
    }

  provider :spotify,
    ENV['SPOTIFY_CLIENT_ID'],
    ENV['SPOTIFY_CLIENT_SECRET'],
    {
      scope: 'user-read-private user-read-email playlist-read-private playlist-read-collaborative'
    }
end

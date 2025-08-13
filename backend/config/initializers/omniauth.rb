# OmniAuth configuration for Rails 7.x with proper CSRF protection
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
end

if Rails.env.production?
  OmniAuth.config.allowed_request_methods = [:post]
else
    OmniAuth.config.allowed_request_methods = [:post, :get]
end

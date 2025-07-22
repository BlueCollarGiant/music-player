Rails.application.config.middleware.use OmniAuth::Builder do
  # Google OAuth for user authentication
  provider :google_oauth2, 
    ENV['GOOGLE_CLIENT_ID'], 
    ENV['GOOGLE_CLIENT_SECRET'],
    {
      scope: 'email,profile',
      prompt: 'select_account',
      image_aspect_ratio: 'square',
      image_size: 50
    }

  # Spotify OAuth for music platform integration
  provider :spotify,
    ENV['SPOTIFY_CLIENT_ID'],
    ENV['SPOTIFY_CLIENT_SECRET'],
    {
      scope: 'user-read-private user-read-email playlist-read-private playlist-read-collaborative user-library-read'
    }

  # YouTube OAuth for music platform integration (using Google provider with YouTube scopes)
  provider :google_oauth2,
    ENV['YOUTUBE_CLIENT_ID'],
    ENV['YOUTUBE_CLIENT_SECRET'],
    {
      name: 'youtube',
      scope: 'email,profile,https://www.googleapis.com/auth/youtube.readonly',
      prompt: 'select_account',
      access_type: 'offline',
      approval_prompt: 'force'
    }

  # SoundCloud OAuth for music platform integration
  provider :soundcloud,
    ENV['SOUNDCLOUD_CLIENT_ID'],
    ENV['SOUNDCLOUD_CLIENT_SECRET'],
    {
      scope: 'non-expiring'
    }
end

# Configure OmniAuth settings
OmniAuth.config.allowed_request_methods = [:post, :get]
OmniAuth.config.silence_get_warning = true

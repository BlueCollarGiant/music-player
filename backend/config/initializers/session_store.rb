# Configure session store for OAuth compatibility
Rails.application.config.session_store :cookie_store,
  key: '_music_player_session',
  same_site: :lax,  # Allows external redirects (like Google OAuth)
  secure: Rails.env.production?,  # HTTPS only in production
  httponly: true  # Prevent XSS attacks

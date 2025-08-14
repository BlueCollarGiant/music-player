Rails.application.routes.draw do
  # Health check (public)
  get "/health", to: proc { [200, { "Content-Type" => "text/plain" }, ["ok"]] }
  root to: proc { [200, { "Content-Type" => "text/plain" }, ["ok"]] }
  # Auth routes
  post "/login", to: "sessions#create"
  delete "/logout", to: "sessions#destroy"

  #check if youtube connection 
  get "/api/youtube/check_access", to: "youtube#check_access"
  # OAuth routes - unified callback handling for multiple providers
  get '/auth/:provider/callback', to: 'sessions#omniauth'
  get '/auth/failure', to: 'sessions#failure'

  # User routes
  resources :users, only: [:create, :show]
  
  # API routes
  scope '/api' do
    get '/current_user', to: 'users#current'
    
    # YouTube API routes
    get '/youtube/playlists', to: 'youtube#playlists'
    get '/youtube/playlists/:playlist_id/tracks', to: 'youtube#playlist_tracks'
    # Platform-agnostic (initially YouTube-only) endpoints
    namespace :platforms, module: 'api/platforms' do
  # Specific Spotify controller endpoint (must precede dynamic :platform route to override)
  get 'spotify/playlists', to: 'spotify#playlists'
      # Access / connection checks
      get    ':platform/check_access',          to: 'connections#check_access'

      # Normalized browsing endpoints
      get    ':platform/playlists',             to: 'browse#playlists'
      get    ':platform/playlists/:id/tracks',  to: 'browse#tracks'
    end
  end
  # Password reset
  resources :password_resets, only: [:create]

  # User Profile routes (automatically handles show, update, destroy, etc.)
  resources :user_profiles, only: [:show, :update, :destroy] do
    member do
      get :username_history
      post :upload_avatar
      get :avatar_history
    end
    collection do
      get :current                      # GET /user_profiles/current
      get :youtube_connection           # GET /user_profiles/youtube_connection
      delete :youtube_connection, action: :unlink_youtube  # DELETE /user_profiles/youtube_connection (calls unlink_youtube action)
  # Spotify connection management
  get :spotify_connection           # GET /user_profiles/spotify_connection
  delete :spotify_connection, action: :unlink_spotify  # DELETE /user_profiles/spotify_connection
      get :platform_connections        # GET /user_profiles/platform_connections
    end
  end

  # Admin routes
  scope '/admin' do
    get 'dashboard', to: 'admin#dashboard'
    get 'users', to: 'admin#users'
    get 'users/search', to: 'admin#search_users'
    post 'users/:id/promote', to: 'admin#promote_user'
    post 'users/:id/demote', to: 'admin#demote_user'
  end

  get '*path', to: 'application#frontend_index', constraints: ->(req) do
     !req.xhr? && req.format.html?
   end
end

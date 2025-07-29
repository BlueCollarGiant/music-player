Rails.application.routes.draw do
  # Auth routes
  post "/login", to: "sessions#create"
  delete "/logout", to: "sessions#destroy"

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
      delete :youtube_connection        # DELETE /user_profiles/youtube_connection (calls unlink_youtube action)
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

Rails.application.routes.draw do
  # Auth routes
  post "/login", to: "sessions#create"
  delete "/logout", to: "sessions#destroy"

  # OAuth routes - unified callback handling for multiple providers
  get '/auth/:provider/callback', to: 'oauth#callback'
  get '/auth/failure', to: 'oauth#failure'

  # User routes
  resources :users, only: [:create, :show]

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
      get :platform_connections
      delete 'platform_connections/:platform', action: :unlink_platform
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
end

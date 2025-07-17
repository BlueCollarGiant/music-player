Rails.application.routes.draw do
  # Auth routes
  post "/signup", to: "auth#signup"
  post "/login", to: "sessions#create"

  # User routes
  resources :users, only: [:create, :show]

  # Password reset
  resources :password_resets, only: [:create]

  # User Profile routes (automatically handles show, update, destroy, etc.)
  resources :user_profiles, only: [:show, :update, :destroy]
end

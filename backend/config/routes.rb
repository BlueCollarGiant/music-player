Rails.application.routes.draw do
  # Auth routes
  
  post "/login", to: "sessions#create"

  # User routes
  resources :users, only: [:create, :show] do
    member do
      get :username_history
    end
  end

  # Password reset
  resources :password_resets, only: [:create]

  # User Profile routes (automatically handles show, update, destroy, etc.)
  resources :user_profiles, only: [:show, :update, :destroy] do
    member do
      get :username_history
    end
  end
end

Rails.application.routes.draw do
  get "user_profiles/show"
  get "user_profiles/update"
  get "user_profiles/destroy"
  resources :users, only: [:create, :show]
  post "/login", to: "sessions#create"
  resources :password_resets, only: [:create]
end

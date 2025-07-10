Rails.application.routes.draw do
  resources :users, only: [:create]
  post "/login", to: "sessions#create"
  resources :password_resets, only: [:create]
end

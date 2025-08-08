Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    # Allow local dev and, if present, your deployed frontend
    origins 'http://localhost:4200', ENV['FRONTEND_URL']

    resource '*',
      headers: :any,                                # allow Authorization, Content-Type, etc.
      methods: [:get, :post, :put, :patch, :delete, :options, :head],
      expose:  ['Authorization']                    # expose Authorization header for JWT tokens
      
  end
end
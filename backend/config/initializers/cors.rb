allowed_origins = ['http://localhost:4200']
allowed_origins << ENV['FRONTEND_URL'] if ENV['FRONTEND_URL'].present?

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins(*allowed_origins)
    resource '*',
      headers: :any,                                # allow Authorization, Content-Type, etc.
      methods: [:get, :post, :put, :patch, :delete, :options, :head],
      expose:  ['Authorization']                    # expose Authorization header for JWT tokens
      
  end
end
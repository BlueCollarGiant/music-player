Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    if Rails.env.development?
      origins 'http://localhost:4200'
    else
      origins ENV['FRONTEND_URL'] || 'https://yourmusicapp.com'  # Your Angular app domain
    end

    resource '*',
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head],
      credentials: true
  end
end
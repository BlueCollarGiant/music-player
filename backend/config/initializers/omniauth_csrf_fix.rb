# Comprehensive CSRF protection bypass for OmniAuth in Rails 7.x
# This ensures OAuth callbacks work properly without CSRF token validation

Rails.application.config.to_prepare do
  # Override the CSRF protection method for OAuth routes
  ActionController::Base.class_eval do
    def protect_against_forgery?
      # Skip CSRF protection for all OAuth-related routes
      return false if request.path.start_with?('/auth/')
      return false if request.path.include?('oauth')
      return false if request.path.include?('callback')
      
      # Use default behavior for all other routes
      super
    end
  end

  # Also patch the API controller if it exists
  if defined?(ActionController::API)
    ActionController::API.class_eval do
      def protect_against_forgery?
        # API controllers typically don't need CSRF protection
        false
      end
    end
  end
end

# Additional OmniAuth configuration to bypass CSRF
OmniAuth.configure do |config|
  config.allowed_request_methods = [:post, :get]
  config.silence_get_warning = true
  config.request_validation_phase = nil
  config.before_request_phase = nil
  
  # Disable CSRF protection completely for OmniAuth
  config.test_mode = false unless Rails.env.test?
end

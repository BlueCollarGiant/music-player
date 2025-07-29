class ApplicationController < ActionController::Base
  # CSRF exemption for OAuth and API routes
  skip_before_action :verify_authenticity_token, if: -> {
    request.path.start_with?("/auth/") || 
    request.path.start_with?("/api/") ||
    request.format.json?
  }

  # Handle exceptions globally
  rescue_from StandardError, with: :handle_standard_error
  rescue_from ActiveRecord::RecordNotFound, with: :handle_not_found
  rescue_from ActiveRecord::RecordInvalid, with: :handle_validation_error

  # Authenticate all routes by default
  before_action :authenticate_user!

  # Skip auth for frontend catch-all route and public endpoints
  skip_before_action :authenticate_user!, only: [:frontend_index, :health_check]

  # Health check endpoint for deployment monitoring
  def health_check
    render json: { status: 'ok', timestamp: Time.current }
  end

  # Serve Angular frontend
  def frontend_index
    # Check if Angular build exists
    index_path = Rails.root.join('public', 'browser', 'index.html')
    
    if File.exist?(index_path)
      render file: index_path, layout: false
    else
      render json: { 
        error: 'Frontend not built', 
        message: 'Run ng build to generate Angular frontend' 
      }, status: :service_unavailable
    end
  end

  attr_reader :current_user

  private

  def authenticate_user!
    @current_user = authenticate_with_jwt_token
    
    unless @current_user
      render json: { 
        error: 'Authentication required',
        message: 'Please provide a valid authorization token' 
      }, status: :unauthorized
    end
  end

  def authenticate_with_jwt_token
    header = request.headers['Authorization']
    return nil unless header.present?

    # Support both "Bearer token" and "token" formats
    token = header.start_with?('Bearer ') ? header.split(' ').last : header
    return nil unless token.present?

    begin
      decoded = JsonWebToken.decode(token)
      user = User.find_by(id: decoded[:user_id])
      
      # Optional: Check if user is still active
      user if user&.active?
    rescue JWT::ExpiredSignature
      Rails.logger.warn "Expired JWT token attempted"
      nil
    rescue JWT::DecodeError => e
      Rails.logger.warn "Invalid JWT token: #{e.message}"
      nil
    rescue ActiveRecord::RecordNotFound
      Rails.logger.warn "JWT token references non-existent user"
      nil
    end
  end

  def authorize_admin!
    unless @current_user&.role == 'admin'
      render json: { 
        error: 'Admin access required',
        message: 'This action requires administrator privileges' 
      }, status: :forbidden
    end
  end

  def authorize_self_or_admin!(resource_owner_id)
    unless @current_user&.id == resource_owner_id || @current_user&.role == 'admin'
      render json: { 
        error: 'Access denied',
        message: 'You can only access your own resources' 
      }, status: :forbidden
    end
  end

  # Check if user owns a resource or is admin
  def authorize_resource_owner!(resource)
    resource_owner_id = resource.respond_to?(:user_id) ? resource.user_id : resource.id
    authorize_self_or_admin!(resource_owner_id)
  end

  # Global exception handlers
  def handle_not_found(exception)
    Rails.logger.warn "Record not found: #{exception.message}"
    render json: { 
      error: 'Resource not found',
      message: 'The requested resource could not be found' 
    }, status: :not_found
  end

  def handle_validation_error(exception)
    Rails.logger.warn "Validation error: #{exception.message}"
    render json: { 
      error: 'Validation failed',
      message: exception.record.errors.full_messages.join(', '),
      details: exception.record.errors
    }, status: :unprocessable_entity
  end

  def handle_standard_error(exception)
    Rails.logger.error "Unhandled error: #{exception.class} - #{exception.message}"
    Rails.logger.error exception.backtrace.join("\n") if Rails.env.development?
    
    # Don't expose internal errors in production
    if Rails.env.production?
      render json: { 
        error: 'Internal server error',
        message: 'Something went wrong. Please try again later.' 
      }, status: :internal_server_error
    else
      render json: { 
        error: 'Internal server error',
        message: exception.message,
        backtrace: exception.backtrace.first(10)
      }, status: :internal_server_error
    end
  end

  # Helper method to check if request is from API
  def api_request?
    request.path.start_with?('/api/') || request.format.json?
  end

  # Rate limiting helper (if you add rack-attack later)
  def rate_limit_key
    @current_user ? "user:#{@current_user.id}" : request.ip
  end
end
class ApplicationController < ActionController::API
    
    before_action :authenticate_user!

    attr_reader :current_user
    
    private

    ##
    # Authenticates the user based on a JWT token in the Authorization header.
    #
    # Sets the current user if the token is valid and corresponds to an existing user.
    # Renders a 401 Unauthorized response if authentication fails.
    def authenticate_user!
        header = request.headers['Authorization']
        token = header.split('').last if header.present?

        begin
            decoded = JsonWebToken.decode(token)
            @current_user = User.find_by(id: decoded[:user_id]) 
        rescue JWT::DecodeError, ActiveRecord::RecordNotFound
            @current_user = nil
        end

        render json: { errors: ['Not Authorized']}, status: :unauthorized unless @current_user
    end

    ##
    # Restricts access to actions to users with the 'admin' role.
    # Renders a 403 Forbidden response if the current user is not an admin.
    def authorize_admin!
        render json: {errors: ['Forbidden: Admins only']}, status: :forbidden unless @current_user&.role == 'admin'
    end

    ##
    # Ensures the current user is either the owner of the resource or an admin.
    # Renders a 403 Forbidden response if the user is neither the resource owner nor an admin.
    # @param [Integer] resource_owner_id The ID of the resource owner to check against the current user.
    def authorize_self_or_admin!(resource_owner_id)
        unless @current_user&.id == resource_owner_id || @current_user&.role == 'admin'
            render json: {errors: ['Forbidden: Not your resource']}, status: :forbidden
        end
    end
end

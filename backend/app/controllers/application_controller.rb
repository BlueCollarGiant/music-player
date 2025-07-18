class ApplicationController < ActionController::API
    
    before_action :authenticate_user!

    attr_reader :current_user
    
    private

    def authenticate_user!
        header = request.headers['Authorization']
        token = header.split(' ').last if header.present?
        
        if token.present?
            begin
                decoded = JsonWebToken.decode(token)
                @current_user = User.find_by(id: decoded[:user_id]) 
            rescue JWT::DecodeError, ActiveRecord::RecordNotFound
                @current_user = nil
            end
        else
            @current_user = nil
        end
        
        render json: { errors: ['Not Authorized']}, status: :unauthorized unless @current_user
    end


    #admin check
    def authorize_admin!
        render json: {errors: ['Forbidden: Admins only']}, status: :forbidden unless @current_user&.role == 'admin'
    end

    #owner or admin
    def authorize_self_or_admin!(resource_owner_id)
        unless @current_user&.id == resource_owner_id || @current_user&.role == 'admin'
            render json: {errors: ['Forbidden: Not your resource']}, status: :forbidden
        end
    end
end

class UsersController < ApplicationController
    skip_before_action :authenticate_user!, only: [:create]
    before_action :authenticate_user!, only: [:show, :current]

    # GET /api/current_user - Returns current authenticated user
    def current
        render json: {
            user: {
                id: @current_user.id,
                email: @current_user.email,
                role: @current_user.role,
                oauth_provider: @current_user.provider,
                is_admin: @current_user.is_admin?,
                is_locked: @current_user.is_locked?,
                #failed_attempts: @current_user.failed_attempts,
                created_at: @current_user.created_at,
                updated_at: @current_user.updated_at
            }
        }, status: :ok
    end

    # GET /users/:id
    def show
        if @current_user.id == params[:id].to_i
            render json: { id: @current_user.id, email: @current_user.email }
        else 
            render json: { error: 'Access denied'}, status: :forbidden
        end
    end

    # POST /users
    def create
        user = User.new(user_params)

        if user.save
            token = JsonWebToken.encode(user_id: user.id)
            render json: {message: "User created successfully", user: user }, status: :created
        else
            render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
        end
    end

    private

    def user_params
        params.require(:user).permit(:email, :password, :password_confirmation, :username)
    end
end

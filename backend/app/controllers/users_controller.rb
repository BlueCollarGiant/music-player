class UsersController < ApplicationController
    skip_before_action :authenticate_user!, only: [:create]
    before_action :authenticate_user!, only: [:show]

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

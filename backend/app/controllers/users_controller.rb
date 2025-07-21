class UsersController < ApplicationController
    skip_before_action :authenticate_user!, only: [:create]
    before_action :authenticate_user!, only: [:show, :username_history]
    before_action :authorize_admin!, only: [:username_history]

    #post /user

    #Get /users/:id
    def show
        if @current_user.id == params[:id].to_i
            render json: { id: @current_user.id, email: @current_user.email }
        else 
            render json: { error: 'Access denied'}, status: :forbidden
        end
    end

    # Admin only: Get username change history for any user
    def username_history
        user = User.find(params[:id])
        user_profile = user.user_profile

        if user_profile.nil?
            render json: { 
                user_id: user.id,
                email: user.email,
                message: "User has no profile created yet",
                changes: []
            }
            return
        end

        history = user_profile.user_name_change_logs.recent
        
        formatted_history = history.map do |log|
            {
                id: log.id,
                old_username: log.old_username,
                current_username: log.current_username,
                change_date: log.change_date,
                formatted_date: log.change_date.strftime("%B %d, %Y at %I:%M %p")
            }
        end

        render json: {
            user_id: user.id,
            email: user.email,
            current_username: user_profile.username,
            total_changes: formatted_history.length,
            changes: formatted_history
        }
    rescue ActiveRecord::RecordNotFound
        render json: { error: "User not found" }, status: :not_found
    end

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
        params.require(:user).permit(:email, :password, :password_confirmation)
        
    end
end

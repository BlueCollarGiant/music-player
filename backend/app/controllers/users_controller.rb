class UsersController < ApplicationController
    before_action :authenticate_user, only: [:show]

    #post /user

    ##
    # Displays the authenticated user's information if the requested user ID matches the current user.
    # Returns the user's ID and email as JSON on success, or a 403 Forbidden error if access is denied.
    def show
        if @current_user.id == parapms[:id].to_i
            render json: { id: @current_user.id, email: @current_user.email }
        else 
            render json: { error: 'Access denied'}, status: :forbidden
        end
    end

    ##
    # Creates a new user with the provided parameters.
    # Renders a success message and user data as JSON with status 201 if creation succeeds, or validation errors with status 422 if creation fails.
    def create
        user = User.new(user_params)

        if user.save
            render json: {message: "User created successfully", user: user }, status: :created
        else
            render json: { errors: user.errors.full_messages }, status: :unprocessable_entity

        end
    end

    private

    ##
    # Returns the permitted parameters for creating or updating a user.
    # Only allows `email`, `password`, and `password_confirmation` attributes.
    def user_params
        params.require(:user).permit(:email, :password, :password_confirmation)
        
    end
end

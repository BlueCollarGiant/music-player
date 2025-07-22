class SessionsController < ApplicationController
    skip_before_action :authenticate_user!, only: [:create]
    def create
        user = User.find_by(email: params[:email])

        if user.nil?
            render json: { errors: [ "Invalid email or password"] }, status: :unauthorized
            return
        end

        if user.is_locked
            render json: { errors: ["Account is locked. Please reset your password."]}, status: :forbidden
            return
        end

        if user.authenticate(params[:password])
            #if successful reset the counter
            user.update(failed_login_attempts: 0)
            token = JsonWebToken.encode(user_id: user.id)
            render json: {message: "Logged in successfully", user: { id: user.id, email: user.email }, token: token }, status: :ok
        else
            #if wrong password add one to count
            user.increment!(:failed_login_attempts)
            
            if user.failed_login_attempts >= 3
                user.update(is_locked: true)
                render json: {errors: ["Account locked after to many failed attempts. please reset your password"] }, status: :forbidden
            else
                render json: {errors: ["Invalid email or password"]}, status: :unauthorized
            end
            
        end
    end

    # DELETE /logout
    def destroy
        # Clear session data
        session[:current_user_id] = nil
        
        render json: { 
            message: "Logged out successfully" 
        }, status: :ok
    end
end

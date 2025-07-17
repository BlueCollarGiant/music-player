class SessionsController < ApplicationController
    ##
    # Handles user login by authenticating credentials and managing account lockout after multiple failed attempts.
    #
    # Responds with appropriate JSON messages and HTTP status codes based on authentication success, account lock status, or invalid credentials.
    # On successful login, returns a JWT token and user information. If failed attempts reach three, the account is locked and a relevant error is returned.
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
end

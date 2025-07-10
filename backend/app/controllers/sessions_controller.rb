class SessionsController < ApplicationController
    def create
        user = User.find_by(email: params[:email])

        if user&.authenticate(params[:password])
            render json: {message: "Logged in successfully", user: { id: user.id, email: user.email } }, status: :ok
        else
            render json: {errors: ["Invalid email or password"]}, status: :unauthorized
        end
    end
end

class AuthController < ApplicationController
  def signup
    user = User.new(user_params)
    if user.save
      token = JsonWebToken.encode(user_id: user.id)
      render json: { message: "User created successfully", token: token }, status: :created
    else
      render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def login
    user = User.find_by(email: params[:email])
    if user&.authenticate(params[:password])
      token = JsonWebToken.encode(user_id: user.id)
      render json: { message: "Logged in successfully", token: token }, status: :ok
    else
      render json: { errors: ["Invalid email or password"] }, status: :unauthorized
    end
  end

  private

  def user_params
    params.permit(:email, :password, :password_confirmation)
  end
end

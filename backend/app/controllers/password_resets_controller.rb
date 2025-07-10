class PasswordResetsController < ApplicationController
  def create
    user = User.find_by(email: params[:email])

    if user.nil?
      render json: { errors: ["Email not found"] }, status: :not_found
      return
    end

    # Generate secure random token
    token = SecureRandom.hex(20)
    expires_at = 2.hours.from_now

    # Create the password reset record
    PasswordReset.create!(
      user: user,
      reset_token: token,
      expires_at: expires_at
    )

    # Simulate email sending in logs
    Rails.logger.info "RESET EMAIL to #{user.email}:"
    Rails.logger.info "Use this reset link (FAKE): http://localhost:3000/password_resets/#{token}/edit"

    render json: { message: "Password reset instructions sent if email exists." }, status: :ok
  end
end


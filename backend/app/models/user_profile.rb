class UserProfile < ApplicationRecord
  # Define username pattern as a constant for clarity
  USERNAME_PATTERN = /\A[a-zA-Z0-9_]+\z/
  
  belongs_to :user
  has_many :user_name_change_logs, dependent: :destroy

  # Username validations
  validates :username, presence: true
  validates :username, uniqueness: true
  validates :username, length: { minimum: 3, maximum: 30 }
  validates :username, format: { 
    with: USERNAME_PATTERN, 
    message: "can only contain letters, numbers, and underscores" 
  }

  before_update :log_username_change, if: :username_changed?

  private

  def log_username_change
    if username_was.present?
      user_name_change_logs.build(
        old_username: username_was,
        current_username: username,
        change_date: Time.current
      )
    end
  end
end

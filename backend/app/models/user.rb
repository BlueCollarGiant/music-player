class User < ApplicationRecord
    has_secure_password

    has_one :user_profile, dependent: :destroy
    has_many :user_name_change_logs, through: :user_profile
    has_many :password_resets, dependent: :destroy
    
    validates :email, presence: true, uniqueness: true
    validates :password, presence: true, length: { minimum: 6}, if: :password

    # Virtual attribute for username during signup
    attr_accessor :username

    before_validation :set_default_role, on: :create
    after_create :create_user_profile_with_username

    private

    def set_default_role
        self.role ||= "user"
    end

    def create_user_profile_with_username
        profile = build_user_profile
        profile.username = @username if @username.present?
        profile.save!
    end
end

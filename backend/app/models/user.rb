class User < ApplicationRecord
    has_secure_password validations: false  # Allow OAuth users without passwords

    has_one :user_profile, dependent: :destroy
    has_many :user_name_change_logs, through: :user_profile
    has_many :user_avatars, through: :user_profile
    has_many :password_resets, dependent: :destroy
    has_many :platform_connections, dependent: :destroy
    
    validates :email, presence: true, uniqueness: true
    validates :password, presence: true, length: { minimum: 6}, if: :password_required?

    # Virtual attribute for username during signup
    attr_accessor :username

    before_validation :set_default_role, on: :create
    after_create :create_user_profile_with_username

    # OAuth class method to find or create user from OAuth data
    def self.from_omniauth(auth)
        # First, try to find existing user by email (manual signup user)
        existing_user = find_by(email: auth.info.email)
        
        if existing_user
            # Update existing user with OAuth info if not already set
            existing_user.update(
                provider: auth.provider,
                uid: auth.uid
            ) if existing_user.provider.blank?
            return existing_user
        end
        
        # Create new OAuth user
        where(provider: auth.provider, uid: auth.uid).first_or_create do |user|
            user.email = auth.info.email
            user.provider = auth.provider
            user.uid = auth.uid
            user.role = "user"
            # Extract username from email with defensive fallback
            user.username = auth.info.email&.split('@')&.first&.gsub(/[^a-zA-Z0-9_]/, '_') || "user_#{SecureRandom.hex(4)}"
        end
    end

    # Check if user is OAuth user
    def oauth_user?
        provider.present? && uid.present?
    end

    private

    def set_default_role
        self.role ||= "user"
    end

    def create_user_profile_with_username
        profile = build_user_profile
        profile.username = self.username if self.username.present?
        profile.save!
    end

    # Only require password for non-OAuth users
    def password_required?
        !oauth_user? && password_digest.blank?
    end
end

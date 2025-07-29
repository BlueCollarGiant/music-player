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
            # Try to find an existing user by email (manual or OAuth signup)
            user = find_by(email: auth.info.email)

            if user
                # If user exists but doesn't have provider/uid set (manual signup), update it
                if user.provider.blank? || user.uid.blank?
                user.update(provider: auth.provider, uid: auth.uid)
                end
            else
                # No existing user — create one via OAuth
                user = where(provider: auth.provider, uid: auth.uid).first_or_create do |u|
                u.email = auth.info.email
                u.provider = auth.provider
                u.uid = auth.uid
                u.role = "user"
                u.username = auth.info.email&.split('@')&.first&.gsub(/[^a-zA-Z0-9_]/, '_') || "user_#{SecureRandom.hex(4)}"
                end
            end

            # Ensure a user profile exists
            UserProfile.find_or_create_by(user_id: user.id)

            user
        end
    def is_admin?
        role == 'admin'
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

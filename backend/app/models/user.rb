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
            # Extract username from Google data
            username = auth.info.name || auth.info.email&.split('@')&.first || "user_#{SecureRandom.hex(4)}"
            username = username.gsub(/[^a-zA-Z0-9_\s]/, '_').strip
            
            # No existing user — create one via OAuth
            user = where(provider: auth.provider, uid: auth.uid).first_or_create do |u|
                u.email = auth.info.email
                u.provider = auth.provider
                u.uid = auth.uid
                u.role = "user"
                u.username = username
            end
        end

        # Ensure a user profile exists with proper username
        profile = UserProfile.find_or_create_by(user_id: user.id) do |p|
            # Use Google name if available, otherwise fall back to email-based username
            p.username = auth.info.name || auth.info.email&.split('@')&.first || "user_#{SecureRandom.hex(4)}"
        end
        
        # Update profile username if it's generic and we have better data from Google
        if profile.username.start_with?('user_') && auth.info.name.present?
            profile.update(username: auth.info.name)
        end

        user
    end
    def is_admin?
        role == 'admin'
    end

    # Check if user account is active (not locked)
    # TODO: Implement account locking feature in future version
    def active?
        true  # Always return true for now, locking feature disabled
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

class User < ApplicationRecord
    has_secure_password

    has_one :user_profile, dependent: :destroy
    has_many :user_name_change_logs, through: :user_profile
    
    validates :email, presence: true, uniqueness: true
    validates :password, presence: true, length: { minimum: 6}, if: :password

    before_validation :set_default_role, on: :create
    after_create :create_user_profile

    private

    def set_default_role
        self.role ||= "user"
    end

    def create_user_profile
        build_user_profile.save!
    end
end

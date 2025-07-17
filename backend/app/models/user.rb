class User < ApplicationRecord
    has_secure_password

    validates :email, presence: true, uniqueness: true
    validates :password, presence: true, length: { minimum: 6}, if: :password

    before_validation :set_default_role, on: :create

    private

    def set_default_role
        self.role ||= "user"
    end
end

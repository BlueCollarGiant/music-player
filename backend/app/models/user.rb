class User < ApplicationRecord
    has_secure_password

    validates :email, presence: true, uniqueness: true
    validates :password, presence: true, length: { minimum: 6}, if: :password

    before_validation :set_default_role, on: :create

    private

    ##
    # Sets the role attribute to "user" if it is not already assigned.
    def set_default_role
        self.role ||= "user"
    end
end

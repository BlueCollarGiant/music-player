class UserProfile < ApplicationRecord
  belongs_to :user
  has_many :user_name_change_logs, dependent: :destroy
end

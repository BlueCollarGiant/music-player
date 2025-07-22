class UserAvatar < ApplicationRecord
  belongs_to :user_profile

  validates :current_avatar, presence: true
  validates :change_date, presence: true

  scope :recent, -> { order(change_date: :desc) }
end

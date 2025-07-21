class UserNameChangeLog < ApplicationRecord
  belongs_to :user_profile

  validates :old_username, presence: true
  validates :current_username, presence: true
  validates :change_date, presence: true

  scope :recent, -> { order(change_date: :desc) }
end

class UserProfile < ApplicationRecord
  # Define username pattern as a constant for clarity
  USERNAME_PATTERN = /\A[a-zA-Z0-9_]+\z/
  
  belongs_to :user
  has_many :user_name_change_logs, dependent: :destroy
  has_many :user_avatars, dependent: :destroy
  
  # Active Storage avatar attachment
  has_one_attached :avatar

  # Username validations
  validates :username, presence: true
  validates :username, uniqueness: { case_sensitive: false }
  validates :username, length: { minimum: 3, maximum: 30 }
  validates :username, format: { 
    with: USERNAME_PATTERN, 
    message: "can only contain letters, numbers, and underscores" 
  }

  validate :avatar_constraints

  before_update :log_username_change, if: :username_changed?
  before_save :log_avatar_change
  after_create :attach_default_avatar

  private

  def log_username_change
    if username_was.present?
      user_name_change_logs.build(
        old_username: username_was,
        current_username: username,
        change_date: Time.current
      )
    end
  end

  def log_avatar_change
    return unless avatar.attached?
    
    # Only log if this is a new avatar attachment or change
    if avatar.attachment&.created_at&.> 1.second.ago
      user_avatars.build(
        current_avatar: avatar.filename.to_s,
        change_date: Time.current
      )
    end
  end

  def avatar_constraints
    return unless avatar.attached?

    if avatar.blob.byte_size > 5.megabytes
      errors.add(:avatar, "is too big. Max 5MB allowed.")
    end

    acceptable_types = ["image/jpeg", "image/png", "image/jpg"]
    unless acceptable_types.include?(avatar.blob.content_type)
      errors.add(:avatar, "must be a JPEG or PNG")
    end
  end

  def attach_default_avatar
    unless avatar.attached?
      default_avatar_path = Rails.root.join('public', 'assets', 'avatars', 'default-avatar.png')
      if File.exist?(default_avatar_path)
        avatar.attach(
          io: File.open(default_avatar_path),
          filename: 'default-avatar.png',
          content_type: 'image/png'
        )
      end
    end
  end
end

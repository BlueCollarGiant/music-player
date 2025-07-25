class UserProfile < ApplicationRecord
  # Define username pattern as a constant for clarity
  USERNAME_PATTERN = /\A[a-zA-Z0-9_]+\z/
  
  # Default avatar configuration
  DEFAULT_AVATAR_PATH = Rails.root.join('public', 'assets', 'avatars', 'default-avatar.png')
  DEFAULT_AVATAR_FILENAME = 'default-avatar.png'
  
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
    
    # Use Rails built-in change detection if available, otherwise fallback to timing
    avatar_changed = if avatar.respond_to?(:changed_for_autosave?)
                      avatar.changed_for_autosave?
                    else
                      avatar.attachment&.created_at&.> 1.second.ago
                    end
    
    # Only log user-initiated avatar changes (excludes default avatars assigned automatically)
    # Default avatar logging is handled separately in attach_default_avatar for admin tracking
    if avatar_changed && avatar.filename.to_s != DEFAULT_AVATAR_FILENAME
      log_avatar_change_entry(avatar.filename.to_s)
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
      if File.exist?(DEFAULT_AVATAR_PATH)
        File.open(DEFAULT_AVATAR_PATH) do |file|
          avatar.attach(
            io: file,
            filename: DEFAULT_AVATAR_FILENAME,
            content_type: 'image/png'
          )
        end
        
        # Log the default avatar assignment (for admin tracking purposes)
        begin
          log_avatar_change_entry(DEFAULT_AVATAR_FILENAME)
        rescue ActiveRecord::RecordInvalid => e
          Rails.logger.error "Failed to log default avatar assignment: #{e.message}"
        end
      else
        Rails.logger.warn "Default avatar not found at #{DEFAULT_AVATAR_PATH}"
      end
    end
  end

  # Helper method for consistent avatar change logging
  def log_avatar_change_entry(filename)
    user_avatars.build(
      current_avatar: filename,
      change_date: Time.current
    )
  end
end

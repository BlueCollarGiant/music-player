class PlatformConnection < ApplicationRecord
  belongs_to :user

  # Platform constants for validation and backwards compatibility
  SUPPORTED_PLATFORMS = %w[youtube].freeze

  # Platform enum for better readability and query syntax
  enum platform: {
    youtube: 'youtube'
    
  }

  # Validations
  validates :platform, presence: true, inclusion: { in: SUPPORTED_PLATFORMS }
  validates :platform_user_id, presence: true
  validates :access_token, presence: true
  validates :connected_at, presence: true
  
  # Ensure one connection per platform per user
  validates :platform, uniqueness: { scope: :user_id }

  # Scopes
  scope :active, -> { where('expires_at IS NULL OR expires_at > ?', Time.current) }
  scope :expired, -> { where('expires_at IS NOT NULL AND expires_at <= ?', Time.current) }
  scope :by_platform, ->(platform) { where(platform: platform) }
  scope :with_refresh_token, -> { where.not(refresh_token: [nil, '']) }

  # Token management with clarified expiration handling
  def expired?
    # Some platforms (like SoundCloud) provide long-lived tokens without expiration
    # Only consider expired if expires_at is explicitly set and in the past
    expires_at.present? && expires_at <= Time.current
  end

  def active?
    # Token is active if:
    # 1. No expiration date set (long-lived token), OR
    # 2. Expiration date is in the future
    !expired?
  end

  def supports_refresh?
    # Check if platform supports refresh tokens and we have one stored
    refresh_token.present? && youtube?
  end

  def long_lived_token?
    # Some platforms like SoundCloud provide tokens without expiration
    expires_at.nil?
  end
end

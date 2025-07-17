class AddLockFieldsToUsers < ActiveRecord::Migration[7.2]
  ##
  # Adds `failed_login_attempts` and `is_locked` columns to the users table.
  #
  # The `failed_login_attempts` column tracks the number of unsuccessful login attempts for each user, defaulting to 0.
  # The `is_locked` column indicates whether a user account is locked, defaulting to false.
  def change
    add_column :users, :failed_login_attempts, :integer, default: 0, null: false
    add_column :users, :is_locked, :boolean, default: false, null: false
  end
end

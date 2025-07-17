class CreatePasswordResets < ActiveRecord::Migration[7.2]
  ##
  # Creates the password_resets table with columns for user reference, reset token, usage status, expiration time, and timestamps.
  # Also adds a unique index on the reset_token column to ensure token uniqueness.
  def change
    create_table :password_resets do |t|
      t.references :user, null: false, foreign_key: true
      t.string :reset_token, null: false
      t.boolean :used, default: false, null: false
      t.datetime :expires_at

      t.timestamps
    end

    add_index :password_resets, :reset_token, unique: true
  end
end

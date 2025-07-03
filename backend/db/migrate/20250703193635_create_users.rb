# Creates the users table in the database
class CreateUsers < ActiveRecord::Migration[7.2]
  def change
    # Start defining the users table
    create_table :users do |t|
      
      # Add an email column of type string (VARCHAR) that is required (NOT NULL)
      t.string :email, null: false
      
      # Add an encrypted_password column of type string (VARCHAR) that is required
      t.string :encrypted_password, null: false
      
      # Add a user_name column of type string (VARCHAR), optional (can be null)
      t.string :user_name
      
      # Add a failed_login_attempts column of type integer, default value 0
      t.integer :failed_login_attempts, default: 0
      
      # Add an is_locked column of type boolean, default value false
      t.boolean :is_locked, default: false
      
      # Adds created_at and updated_at timestamp columns automatically
      t.timestamps
    end
    # Add a UNIQUE index to ensure email addresses are unique in the database
  add_index :users, :email, unique: true
  end
end
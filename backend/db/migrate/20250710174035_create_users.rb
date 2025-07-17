class CreateUsers < ActiveRecord::Migration[7.2]
  ##
  # Creates the `users` table with email and password digest columns, and adds a unique index on email to enforce uniqueness.
  def change
    create_table :users do |t|
      t.string :email, null: false
      t.string :password_digest, null: false

      t.timestamps
    end

    add_index :users, :email, unique: true
  end
end

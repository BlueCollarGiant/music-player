class AddRoleToUsers < ActiveRecord::Migration[7.2]
  ##
  # Adds a string column named 'role' to the users table.
  def change
    add_column :users, :role, :string
  end
end

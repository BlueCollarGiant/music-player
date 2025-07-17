class AddLockFieldsToUsers < ActiveRecord::Migration[7.2]
  def change
    add_column :users, :failed_login_attempts, :integer, default: 0, null: false
    add_column :users, :is_locked, :boolean, default: false, null: false
  end
end

class CreateUserNameChangeLogs < ActiveRecord::Migration[7.2]
  def change
    create_table :user_name_change_logs do |t|
      t.integer :user_profile_id, null: false
      t.string :old_username
      t.string :current_username
      t.timestamp :change_date

      t.timestamps
    end

    add_foreign_key :user_name_change_logs, :user_profiles, column: :user_profile_id
    add_index :user_name_change_logs, :user_profile_id
  end
end

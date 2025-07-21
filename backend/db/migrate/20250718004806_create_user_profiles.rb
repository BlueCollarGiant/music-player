class CreateUserProfiles < ActiveRecord::Migration[7.2]
  def change
    create_table :user_profiles do |t|
      t.integer :user_id, null: false
      t.timestamps
    end

    add_foreign_key :user_profiles, :users, column: :user_id
    add_index :user_profiles, :user_id
  end
end

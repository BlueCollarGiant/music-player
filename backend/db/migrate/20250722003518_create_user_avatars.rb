class CreateUserAvatars < ActiveRecord::Migration[7.2]
  def change
    create_table :user_avatars do |t|
      t.references :user_profile, null: false, foreign_key: true
      t.string :current_avatar
      t.timestamp :change_date

      t.timestamps
    end
  end
end

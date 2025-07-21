class AddUsernameToUserProfiles < ActiveRecord::Migration[7.2]
  def change
    add_column :user_profiles, :username, :string
  end
end

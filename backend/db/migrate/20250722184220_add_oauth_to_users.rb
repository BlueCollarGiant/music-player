class AddOauthToUsers < ActiveRecord::Migration[7.2]
  def change
    add_column :users, :provider, :string
    add_column :users, :uid, :string
    
    # Add index for efficient OAuth lookups
    add_index :users, [:provider, :uid], unique: true
  end
end

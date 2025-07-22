class CreatePlatformConnections < ActiveRecord::Migration[7.2]
  def change
    create_table :platform_connections do |t|
      t.references :user, null: false, foreign_key: true
      t.string :platform
      t.string :platform_user_id
      t.text :access_token
      t.text :refresh_token
      t.datetime :expires_at
      t.text :scopes
      t.datetime :connected_at

      t.timestamps
    end
  end
end

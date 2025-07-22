class AddUniqueIndexToPlatformConnections < ActiveRecord::Migration[7.2]
  def change
    add_index :platform_connections, [:user_id, :platform], unique: true, name: 'index_platform_connections_on_user_and_platform'
  end
end

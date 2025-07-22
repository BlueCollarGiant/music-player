class AddRefreshTokenToPlatformConnections < ActiveRecord::Migration[7.2]
  def change
    add_column :platform_connections, :refresh_token, :text
  end
end

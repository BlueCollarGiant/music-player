class CreatePasswordResets < ActiveRecord::Migration[7.2]
  def change
    create_table :password_resets do |t|
      t.references :user, null: false, foreign_key: true
      t.string :reset_token, null: false
      t.boolean :used, default: false, null: false
      t.datetime :expires_at

      t.timestamps
    end

    add_index :password_resets, :reset_token, unique: true
  end
end

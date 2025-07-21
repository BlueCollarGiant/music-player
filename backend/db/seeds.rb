# This file should contain all the record creation needed to seed the database with its default values.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
#
# Examples:
#
#   movies = Movie.create([{ name: 'Star Wars' }, { name: 'Lord of the Rings' }])
#   Character.create(name: 'Luke', movie: movies.first)

# Create default admin user if none exists
if User.where(role: 'admin').count == 0
  admin_email = ENV['ADMIN_EMAIL'] || 'admin@musicplayer.com'
  admin_password = ENV['ADMIN_PASSWORD'] || 'SecureAdmin123!'
  admin_username = ENV['ADMIN_USERNAME'] || 'admin'

  puts "Creating default admin user..."
  
  admin = User.create!(
    email: admin_email,
    password: admin_password,
    password_confirmation: admin_password,
    username: admin_username,
    role: 'admin'
  )
  
  puts "✅ Admin user created: #{admin.email} (username: #{admin.user_profile.username})"
  puts "⚠️  Change the default password in production!"
else
  puts "Admin user already exists, skipping creation."
end

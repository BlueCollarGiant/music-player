if User.where(role: 'admin').where(email: 'insanemito@gmail.com').count == 0
  admin_email = 'insanemito@gmail.com'
  admin_username = 'insanemito'

  puts "Creating default admin user..."
  
  begin
    admin = User.find_or_initialize_by(email: admin_email)
    
    # Check if ADMIN_PASSWORD is set in environment
    if ENV['ADMIN_PASSWORD'].present?
      admin_password = ENV['ADMIN_PASSWORD']
      admin.assign_attributes(
        password: admin_password,
        password_confirmation: admin_password,
        username: admin_username,
        role: 'admin',
        provider: nil, # allow manual login
        uid: nil
      )
    else
      # In development/test, create without password for OAuth-only access
      # Or require password to be set via environment variable
      if Rails.env.production?
        puts "❌ ADMIN_PASSWORD environment variable is required in production!"
        puts "Set it with: export ADMIN_PASSWORD='your_secure_password'"
        exit 1
      else
        # Development: Create user without password (OAuth only) or generate random one
        temp_password = SecureRandom.alphanumeric(16)
        admin.assign_attributes(
          password: temp_password,
          password_confirmation: temp_password,
          username: admin_username,
          role: 'admin',
          provider: nil,
          uid: nil
        )
        puts "🔐 Generated temporary password for development: #{temp_password}"
        puts "💡 Or just use Google OAuth to sign in!"
      end
    end
    
    admin.save!
    
    puts "✅ Admin user created or updated: #{admin.email} (username: #{admin.username})"
    
  rescue ActiveRecord::RecordInvalid => e
    puts "❌ Failed to create admin user: #{e.message}"
    puts "Please check your User model validations and try again."
    exit 1
  rescue => e
    puts "❌ Unexpected error creating admin user: #{e.message}"
    exit 1
  end
else
  admin_count = User.where(role: 'admin').count
  puts "Admin user already exists for insanemito@gmail.com, skipping creation."
end

# Add other seed data below as needed
# Example: Create default genres, playlists, etc.

puts "\n🌱 Seeding completed successfully!"
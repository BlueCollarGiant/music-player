class AdminController < ApplicationController
  before_action :authenticate_user!
  before_action :authorize_admin!

  # GET /admin/dashboard
  def dashboard
    render json: {
      total_users: User.count,
      total_profiles: UserProfile.count,
      total_username_changes: UserNameChangeLog.count,
      recent_users: recent_users_data,
      recent_username_changes: recent_username_changes_data,
      user_role_breakdown: user_role_breakdown_data
    }
  rescue => e
    Rails.logger.error "Admin dashboard error: #{e.message}"
    render json: { error: "Unable to load dashboard data" }, status: :internal_server_error
  end

  # GET /admin/users
  def users
    page = [params[:page].to_i, 1].max
    per_page = [[params[:per_page].to_i, 1].max, 100].min # Cap at 100

    users = User.includes(:user_profile)
                .order(created_at: :desc)
                .page(page)
                .per(per_page)

    render json: {
      users: users.map { |user| format_user_data(user) },
      pagination: {
        current_page: users.current_page,
        total_pages: users.total_pages,
        total_count: users.total_count,
        per_page: per_page
      }
    }
  rescue => e
    Rails.logger.error "Admin users list error: #{e.message}"
    render json: { error: "Unable to load users" }, status: :internal_server_error
  end

  # GET /admin/users/search?q=username_or_email
  def search_users
    query = params[:q]&.strip
    
    if query.blank?
      render json: { error: "Search query required" }, status: :bad_request
      return
    end

    # Prevent very short queries that might be too broad
    if query.length < 2
      render json: { error: "Search query must be at least 2 characters" }, status: :bad_request
      return
    end

    users = User.joins(:user_profile)
                .where(
                  "users.email ILIKE ? OR user_profiles.username ILIKE ?", 
                  "%#{sanitize_like_query(query)}%", 
                  "%#{sanitize_like_query(query)}%"
                )
                .includes(:user_profile)
                .limit(50)

    render json: {
      query: query,
      results: users.map { |user| format_user_data(user) },
      count: users.length
    }
  rescue => e
    Rails.logger.error "Admin user search error: #{e.message}"
    render json: { error: "Search failed" }, status: :internal_server_error
  end

  # POST /admin/users/:id/promote
  def promote_user
    user = User.find(params[:id])
    
    # Check if already admin
    if user.role == 'admin'
      render json: { error: "User is already an admin" }, status: :unprocessable_entity
      return
    end
    
    user.update!(role: 'admin')
    
    Rails.logger.info "Admin #{@current_user.email} promoted user #{user.email} to admin"
    
    render json: { 
      message: "User promoted to admin", 
      user: format_user_data(user) 
    }
  rescue ActiveRecord::RecordNotFound
    render json: { error: "User not found" }, status: :not_found
  rescue ActiveRecord::RecordInvalid => e
    render json: { error: "Failed to promote user: #{e.message}" }, status: :unprocessable_entity
  end

  # POST /admin/users/:id/demote
  def demote_user
    user = User.find(params[:id])
    
    # Prevent demoting yourself
    if user.id == @current_user.id
      render json: { error: "Cannot demote yourself" }, status: :forbidden
      return
    end

    # Check if already regular user
    if user.role == 'user'
      render json: { error: "User is already a regular user" }, status: :unprocessable_entity
      return
    end

    # Prevent demoting the last admin (optional safety check)
    if User.where(role: 'admin').count <= 1
      render json: { error: "Cannot demote the last admin" }, status: :forbidden
      return
    end

    user.update!(role: 'user')
    
    Rails.logger.info "Admin #{@current_user.email} demoted user #{user.email} to regular user"
    
    render json: { 
      message: "User demoted to regular user", 
      user: format_user_data(user) 
    }
  rescue ActiveRecord::RecordNotFound
    render json: { error: "User not found" }, status: :not_found
  rescue ActiveRecord::RecordInvalid => e
    render json: { error: "Failed to demote user: #{e.message}" }, status: :unprocessable_entity
  end

  private

  def recent_users_data
    User.includes(:user_profile)
        .order(created_at: :desc)
        .limit(5)
        .map { |user| format_user_data(user) }
  end

  def recent_username_changes_data
    UserNameChangeLog.includes(:user_profile)
                     .order(change_date: :desc)
                     .limit(10)
                     .map do |log|
      {
        id: log.id,
        old_username: log.old_username,
        current_username: log.current_username,
        change_date: log.change_date,
        formatted_date: log.change_date.strftime("%B %d, %Y at %I:%M %p"),
        user_email: log.user_profile&.user&.email # Safe navigation
      }
    end
  end

  def user_role_breakdown_data
    User.group(:role).count
  end

  def format_user_data(user)
    {
      id: user.id,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
      formatted_created_at: user.created_at.strftime("%B %d, %Y at %I:%M %p"),
      username: user.user_profile&.username,
      profile_id: user.user_profile&.id,
      username_changes_count: user.user_profile&.user_name_change_logs&.count || 0,
      provider: user.provider # Useful to see OAuth vs manual users
    }
  end

  # Sanitize LIKE queries to prevent SQL injection in ILIKE
  def sanitize_like_query(query)
    query.gsub(/[_%\\]/) { |match| "\\#{match}" }
  end

  def authorize_admin!
    unless @current_user&.role == 'admin'
      render json: { error: "Admin access required" }, status: :forbidden
    end
  end
end
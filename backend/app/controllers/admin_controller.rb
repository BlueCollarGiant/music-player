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
  end

  # GET /admin/users
  def users
    page = params[:page] || 1
    per_page = params[:per_page] || 25

    users = User.includes(:user_profile)
                .order(created_at: :desc)
                .page(page)
                .per(per_page)

    render json: {
      users: users.map { |user| format_user_data(user) },
      pagination: {
        current_page: users.current_page,
        total_pages: users.total_pages,
        total_count: users.total_count
      }
    }
  end

  # GET /admin/users/search?q=username_or_email
  def search_users
    query = params[:q]
    
    if query.blank?
      render json: { error: "Search query required" }, status: :bad_request
      return
    end

    users = User.joins(:user_profile)
                .where(
                  "users.email ILIKE ? OR user_profiles.username ILIKE ?", 
                  "%#{query}%", "%#{query}%"
                )
                .includes(:user_profile)
                .limit(50)

    render json: {
      query: query,
      results: users.map { |user| format_user_data(user) }
    }
  end

  # POST /admin/users/:id/promote
  def promote_user
    user = User.find(params[:id])
    user.update!(role: 'admin')
    
    render json: { 
      message: "User promoted to admin", 
      user: format_user_data(user) 
    }
  rescue ActiveRecord::RecordNotFound
    render json: { error: "User not found" }, status: :not_found
  end

  # POST /admin/users/:id/demote
  def demote_user
    user = User.find(params[:id])
    
    # Prevent demoting yourself
    if user.id == @current_user.id
      render json: { error: "Cannot demote yourself" }, status: :forbidden
      return
    end

    user.update!(role: 'user')
    
    render json: { 
      message: "User demoted to regular user", 
      user: format_user_data(user) 
    }
  rescue ActiveRecord::RecordNotFound
    render json: { error: "User not found" }, status: :not_found
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
        user_email: log.user_profile.user.email
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
      username: user.user_profile&.username,
      profile_id: user.user_profile&.id,
      username_changes_count: user.user_profile&.user_name_change_logs&.count || 0
    }
  end
end

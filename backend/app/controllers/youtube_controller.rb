class YoutubeController < ApplicationController
  before_action :authenticate_user!
  before_action :ensure_youtube_connection

  # GET /api/youtube/playlists
  def playlists
    begin
      youtube_service = create_youtube_service
      playlists = fetch_user_playlists(youtube_service)
      
      render json: {
        playlists: playlists,
        total: playlists.length
      }
    rescue => e
      Rails.logger.error "YouTube API Error: #{e.message}"
      render json: { 
        error: "Failed to fetch playlists", 
        message: e.message 
      }, status: :service_unavailable
    end
  end

  # GET /api/youtube/playlists/:playlist_id/tracks
  def playlist_tracks
    playlist_id = params[:playlist_id]
    
    begin
      youtube_service = create_youtube_service
      tracks = fetch_playlist_tracks(youtube_service, playlist_id)
      
      render json: {
        tracks: tracks,
        playlist_id: playlist_id,
        total: tracks.length
      }
    rescue => e
      Rails.logger.error "YouTube API Error: #{e.message}"
      render json: { 
        error: "Failed to fetch playlist tracks", 
        message: e.message 
      }, status: :service_unavailable
    end
  end

  private

  def ensure_youtube_connection
    @youtube_connection = current_user.platform_connections.find_by(platform: 'youtube')
    
    unless @youtube_connection&.active?
      render json: { 
        error: "YouTube not connected", 
        connect_url: "/auth/youtube"
      }, status: :unauthorized
      return
    end

    # Check if token needs refresh
    if @youtube_connection.token_expired?
      unless refresh_youtube_token
        render json: { 
          error: "YouTube token expired", 
          connect_url: "/auth/youtube"
        }, status: :unauthorized
        return
      end
    end
  end

  def create_youtube_service
    require 'google/apis/youtube_v3'
    require 'googleauth'

    youtube = Google::Apis::YoutubeV3::YouTubeService.new
    youtube.authorization = Google::Auth::UserRefreshCredentials.new(
      client_id: ENV['YOUTUBE_CLIENT_ID'],
      client_secret: ENV['YOUTUBE_CLIENT_SECRET'],
      refresh_token: @youtube_connection.refresh_token,
      access_token: @youtube_connection.access_token
    )
    
    youtube
  end

  def fetch_user_playlists(youtube_service)
    response = youtube_service.list_playlists(
      'snippet,contentDetails',
      mine: true,
      max_results: 50
    )

    response.items.map do |playlist|
      {
        id: playlist.id,
        title: playlist.snippet.title,
        description: playlist.snippet.description,
        video_count: playlist.content_details.item_count,
        thumbnail_url: playlist.snippet&.thumbnails&.medium&.url,
        created_at: playlist.snippet.published_at
      }
    end
  end

  def fetch_playlist_tracks(youtube_service, playlist_id)
    response = youtube_service.list_playlist_items(
      'snippet,contentDetails',
      playlist_id: playlist_id,
      max_results: 50
    )

    response.items.map do |item|
      video_snippet = item.snippet
      {
        id: item.content_details.video_id,
        title: video_snippet.title,
        artist: video_snippet.video_owner_channel_title || video_snippet.channel_title,
        duration: fetch_video_duration(youtube_service, item.content_details.video_id),
        thumbnail_url: video_snippet&.thumbnails&.medium&.url,
        video_url: "https://www.youtube.com/watch?v=#{item.content_details.video_id}"
      }
    end
  end

  def fetch_video_duration(youtube_service, video_id)
    begin
      response = youtube_service.list_videos(
        'contentDetails',
        id: video_id
      )
      
      if response.items.any?
        duration = response.items.first.content_details.duration
        parse_youtube_duration(duration)
      else
        "Unknown"
      end
    rescue
      "Unknown"
    end
  end

  def parse_youtube_duration(duration)
    # Parse ISO 8601 duration format (PT4M13S -> 4:13)
    match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    return "Unknown" unless match

    hours = match[1].to_i
    minutes = match[2].to_i
    seconds = match[3].to_i

    if hours > 0
      sprintf("%d:%02d:%02d", hours, minutes, seconds)
    else
      sprintf("%d:%02d", minutes, seconds)
    end
  end

  def refresh_youtube_token
    begin
      # Use Google's refresh token to get a new access token
      auth = Google::Auth::UserRefreshCredentials.new(
        client_id: ENV['YOUTUBE_CLIENT_ID'],
        client_secret: ENV['YOUTUBE_CLIENT_SECRET'],
        refresh_token: @youtube_connection.refresh_token
      )
      
      auth.fetch_access_token!
      
      # Update the connection with new token
      @youtube_connection.update!(
        access_token: auth.access_token,
        expires_at: Time.current + auth.expires_in.seconds
      )
      
      true
    rescue => e
      Rails.logger.error "Failed to refresh YouTube token: #{e.message}"
      false
    end
  end
end

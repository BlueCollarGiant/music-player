# Shared YouTube platform helpers for both legacy and platform-agnostic endpoints
module YoutubePlatform
  extend ActiveSupport::Concern

  require 'google/apis/youtube_v3'
  require 'googleauth'

  # Returns true if user has a YouTube PlatformConnection
  def youtube_access?(user)
    PlatformConnection.exists?(user_id: user.id, platform: 'youtube')
  end

  # Obtain the user's youtube connection (optionally pass user)
  def youtube_connection(user = current_user)
    user.youtube_connection
  end

  # Build YouTube service using a PlatformConnection
  def create_youtube_service(connection = youtube_connection)
    return nil unless connection
    youtube = Google::Apis::YoutubeV3::YouTubeService.new
    youtube.authorization = Google::Auth::UserRefreshCredentials.new(
      client_id: ENV['YOUTUBE_CLIENT_ID'],
      client_secret: ENV['YOUTUBE_CLIENT_SECRET'],
      refresh_token: connection.refresh_token,
      access_token: connection.access_token
    )
    youtube
  end

  # Attempt to refresh tokens; returns true/false
  def refresh_youtube_token(connection = youtube_connection)
    return false unless connection&.supports_refresh?
    begin
      auth = Google::Auth::UserRefreshCredentials.new(
        client_id: ENV['YOUTUBE_CLIENT_ID'],
        client_secret: ENV['YOUTUBE_CLIENT_SECRET'],
        refresh_token: connection.refresh_token
      )
      auth.fetch_access_token!
      connection.update!(
        access_token: auth.access_token,
        expires_at: Time.current + auth.expires_in.seconds
      )
      true
    rescue => e
      Rails.logger.error "Failed to refresh YouTube token: #{e.message}"
      false
    end
  end

  # Fetch playlists (max 50) and map to raw hash
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
        description: playlist.snippet.description&.truncate(200),
        video_count: playlist.content_details.item_count,
        thumbnail_url: playlist.snippet&.thumbnails&.medium&.url,
        created_at: playlist.snippet.published_at
      }
    end
  end

  # Fetch all tracks for a playlist (legacy full fetch) – returns array of raw hashes
  def fetch_playlist_tracks(youtube_service, playlist_id)
    all_tracks = []
    next_page_token = nil

    loop do
      response = youtube_service.list_playlist_items(
        'snippet,contentDetails',
        playlist_id: playlist_id,
        max_results: 50,
        page_token: next_page_token
      )

      tracks = response.items.map do |item|
        video_snippet = item.snippet
        {
          id: item.content_details.video_id,
          title: video_snippet.title,
          artist: video_snippet.video_owner_channel_title || video_snippet.channel_title,
          duration: nil, # placeholder until batching implemented
          thumbnail_url: video_snippet&.thumbnails&.medium&.url,
          video_url: "https://www.youtube.com/watch?v=#{item.content_details.video_id}",
          position: item.snippet.position
        }
      end

      all_tracks.concat(tracks)
      next_page_token = response.next_page_token
      break unless next_page_token
    end

    all_tracks.sort_by { |track| track[:position] }
  end
end

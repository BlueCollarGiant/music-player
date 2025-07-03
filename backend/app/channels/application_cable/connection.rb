module ApplicationCable
  class Connection < ActionCable::Connection::Base
    # We define an identifier for all ActionCable connections.
    # This makes sure each WebSocket has an associated "current_user".
    identified_by :current_user

    # The connect method runs automatically when a client connects via WebSocket.
    # Here, we enforce authentication by assigning current_user only if verified.
    def connect
      self.current_user = find_verified_user
    end

    private

    # This method defines how to verify and find the user connecting.
    # You will replace the placeholder logic below with your real auth check.
    #
    # Example of what you might do later:
    #   verified_user = User.find_by(id: cookies.signed[:user_id])
    #
    # If no user is found or validation fails, we reject the connection.
    def find_verified_user
      # TODO: Replace this nil with actual user lookup logic.
      verified_user = nil

      # This line will close the WebSocket connection if no user is verified.
      reject_unauthorized_connection unless verified_user

      # If a user is verified, return them to be assigned as current_user.
      verified_user
    end
  end
end
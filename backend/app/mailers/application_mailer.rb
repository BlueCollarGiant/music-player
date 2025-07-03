class ApplicationMailer < ActionMailer::Base
  default from: ENV.fetch('DEFAULT_SENDER_EMAIL', 'no-reply@example.com')
  layout 'mailer'
end

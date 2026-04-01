process.env.MANAGER_URL = 'http://manager'
process.env.DESIGNER_URL = 'http://designer'
process.env.PORT = '3006'
process.env.CDP_HTTPS_PROXY = ''
process.env.ENTITLEMENT_URL = 'http://entitlements'
process.env.SQS_ENDPOINT = 'http://localhost:4566'
process.env.EVENTS_SQS_QUEUE_URL =
  'http://sqs.eu-west-2.127.0.0.1:4566/000000000000/forms_notify_listener_events'
process.env.EVENTS_SQS_DLQ_ARN =
  'arn:aws:sqs:eu-west-2:000000000000:forms_notify_listener_events-deadletter'
process.env.OIDC_JWKS_URI =
  'https://login.microsoftonline.com/770a2450-0227-4c62-90c7-4e38537f1102/discovery/v2.0/keys'
process.env.NOTIFY_TEMPLATE_ID = '2d48d7f9-32ae-43be-9bf1-8bf5cd7bfc17'
process.env.NOTIFY_REPLY_TO_ID = '462e5ac0-28f1-4e51-9d8e-8d8c31f59f6a'
process.env.NOTIFY_API_KEY = 'dummy'
process.env.NOTIFY_CONFIRMATION_REPLY_TO_ID = 'dummy'
process.env.FILE_EXPIRY_IN_MONTHS = '9'
process.env.DEFAULT_MESSAGE_TIMEOUT = '30'

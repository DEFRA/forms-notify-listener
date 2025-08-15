import convict from 'convict'
import convictFormatWithValidator from 'convict-format-with-validator'

convict.addFormats(convictFormatWithValidator)

const isProduction = process.env.NODE_ENV === 'production'
const isDev = process.env.NODE_ENV !== 'production'
const isTest = process.env.NODE_ENV === 'test'

const DEFAULT_MESSAGE_TIMEOUT = 30

const config = convict({
  serviceVersion: {
    doc: 'The service version, this variable is injected into your docker container in CDP environments',
    format: String,
    nullable: true,
    default: null,
    env: 'SERVICE_VERSION'
  },
  host: {
    doc: 'The IP address to bind',
    format: 'ipaddress',
    default: '0.0.0.0',
    env: 'HOST'
  },
  port: {
    doc: 'The port to bind',
    format: 'port',
    default: 3001,
    env: 'PORT'
  },
  serviceName: {
    doc: 'Api Service Name',
    format: String,
    default: 'forms-notify-listener'
  },
  isProduction: {
    doc: 'If this application running in the production environment',
    format: Boolean,
    default: isProduction
  },
  isDevelopment: {
    doc: 'If this application running in the development environment',
    format: Boolean,
    default: isDev
  },
  isTest: {
    doc: 'If this application running in the test environment',
    format: Boolean,
    default: isTest
  },
  cdpEnvironment: {
    doc: 'The CDP environment the app is running in. With the addition of "local" for local development',
    format: [
      'local',
      'infra-dev',
      'management',
      'dev',
      'test',
      'perf-test',
      'ext-test',
      'prod'
    ],
    default: 'local',
    env: 'ENVIRONMENT'
  },
  log: {
    isEnabled: {
      doc: 'Is logging enabled',
      format: Boolean,
      default: !isTest,
      env: 'LOG_ENABLED'
    },
    level: {
      doc: 'Logging level',
      format: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
      default: 'info',
      env: 'LOG_LEVEL'
    },
    format: {
      doc: 'Format to output logs in',
      format: ['ecs', 'pino-pretty'],
      default: isProduction ? 'ecs' : 'pino-pretty',
      env: 'LOG_FORMAT'
    },
    redact: {
      doc: 'Log paths to redact',
      format: Array,
      default: isProduction
        ? ['req.headers.authorization', 'req.headers.cookie', 'res.headers']
        : ['req', 'res', 'responseTime']
    }
  },
  httpProxy: {
    doc: 'HTTP Proxy URL',
    format: String,
    nullable: true,
    default: null,
    env: 'HTTP_PROXY'
  },
  isMetricsEnabled: {
    doc: 'Enable metrics reporting',
    format: Boolean,
    default: isProduction,
    env: 'ENABLE_METRICS'
  },
  tracing: {
    header: {
      doc: 'CDP tracing header name',
      format: String,
      default: 'x-cdp-request-id',
      env: 'TRACING_HEADER'
    }
  },
  awsRegion: {
    doc: 'AWS region',
    format: String,
    default: 'eu-west-2',
    env: 'AWS_REGION'
  },
  sqsEndpoint: {
    doc: 'The SQS endpoint, if required (e.g. a local development dev service)',
    format: String,
    default: '',
    env: 'SQS_ENDPOINT'
  },
  sqsEventsQueueUrl: {
    doc: 'SQS queue URL',
    format: String,
    default: '',
    env: 'EVENTS_SQS_QUEUE_URL'
  },
  receiveMessageTimeout: {
    doc: 'The wait time between each poll in milliseconds',
    format: Number,
    default: DEFAULT_MESSAGE_TIMEOUT * 1000,
    env: 'RECEIVE_MESSAGE_TIMEOUT_MS'
  },
  maxNumberOfMessages: {
    doc: 'The maximum number of messages to be received from queue at a time',
    format: Number,
    default: 10,
    env: 'SQS_MAX_NUMBER_OF_MESSAGES'
  },
  visibilityTimeout: {
    doc: 'The number of seconds that a message is hidden from other consumers after being retrieved from the queue.',
    format: Number,
    default: 30,
    env: 'SQS_VISIBILITY_TIMEOUT'
  }
})

config.validate({ allowed: 'strict' })

export { config }

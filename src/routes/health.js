const OK_RESPONSE = 200

/**
 * @type {ServerRoute}
 */
export default {
  method: 'GET',
  path: '/health',
  handler(_request, h) {
    return h.response({ message: 'success' }).code(OK_RESPONSE)
  },
  options: {
    auth: false
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */

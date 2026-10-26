import { requestLogger } from '~/src/helpers/logging/request-logger.js'

describe('request-logger', () => {
  it('should log requests', () => {
    expect(
      requestLogger.options.customRequestCompleteMessage(
        {
          method: 'GET',
          path: '/audit/forms/12121212',
          raw: {
            res: {
              statusCode: 200
            }
          }
        },
        20
      )
    ).toBe('[response] GET /audit/forms/12121212 200 (20ms)')
  })
})

import { failAction } from '~/src/helpers/fail-action.js'

describe('failAction', () => {
  it('logs and throws the error if it is an instance of Error', () => {
    const err = new Error('Test error')
    const request = {
      logger: {
        error: jest.fn()
      }
    }
    // @ts-expect-error - no request
    expect(() => failAction(request, {}, err)).toThrow(err)
    expect(request.logger.error).toHaveBeenCalledWith(
      err,
      '[validationFailed] Request validation failed - Test error'
    )
  })
})

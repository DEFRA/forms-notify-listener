import {
  receiveEventMessages,
  receiveMessageTimeout
} from '~/src/messaging/event.js'
import { buildFormAdapterSubmissionMessage } from '~/src/service/__stubs__/event-builders.js'
import { handleEvent } from '~/src/service/index.js'
import { runTask, runTaskOnce } from '~/src/tasks/receive-messages.js'
jest.mock('~/src/messaging/event.js')
jest.mock('~/src/service/index.js')
jest.mock('~/src/helpers/logging/logger.js')

describe('receive-messages', () => {
  const message = /** @type {Message} */ ({
    MessageId: 'ea9c724f-2292-4ccd-93b2-86653dca9de2',
    ReceiptHandle: 'ReceiptHandleXFES',
    MD5OfBody: 'adflkjasdJLIm',
    Body: 'hello world',
    MessageAttributes: {}
  })

  /**
   * @returns {void}
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  function voidFn() {}

  describe('runTaskOnce', () => {
    it('should save and delete new messages', async () => {
      const receivedMessageResult = /** @type {ReceiveMessageResult} */ ({
        Messages: [message]
      })
      const submissionEventResult = {
        failed: [],
        saved: [buildFormAdapterSubmissionMessage()]
      }
      jest
        .mocked(receiveEventMessages)
        .mockResolvedValueOnce(receivedMessageResult)
      jest.mocked(handleEvent).mockResolvedValueOnce(submissionEventResult)
      await runTaskOnce()
      expect(handleEvent).toHaveBeenCalledWith([message])
    })

    it('should handle undefined messages', async () => {
      jest.mocked(receiveEventMessages).mockResolvedValueOnce({})
      await runTaskOnce()
      expect(handleEvent).not.toHaveBeenCalled()
    })
  })

  describe('runTask', () => {
    it('should keep running', async () => {
      const setTimeoutSpy = jest
        .spyOn(global, 'setTimeout')
        // @ts-expect-error - mocking timeout with void
        .mockImplementation(voidFn)

      jest.mocked(receiveEventMessages).mockResolvedValueOnce({
        Messages: []
      })
      jest.mocked(handleEvent).mockResolvedValueOnce({
        failed: [],
        saved: []
      })
      await runTask()
      expect(setTimeoutSpy).toHaveBeenCalledWith(runTask, receiveMessageTimeout)
    })

    it('should fail gracefully if runTaskOnce errors', async () => {
      const setTimeoutSpy = jest
        .spyOn(global, 'setTimeout')
        // @ts-expect-error - mocking timeout with void
        .mockImplementation(voidFn)
      jest
        .mocked(receiveEventMessages)
        .mockRejectedValue(new Error('any error'))
      await runTask()
      expect(setTimeoutSpy).toHaveBeenCalledWith(runTask, receiveMessageTimeout)
    })
  })
})

/**
 * @import { ReceiveMessageResult, Message } from '@aws-sdk/client-sqs'
 */

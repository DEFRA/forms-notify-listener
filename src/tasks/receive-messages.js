import { getErrorMessage } from '~/src/helpers/error-message.js'
import { createLogger } from '~/src/helpers/logging/logger.js'
import {
  receiveEventMessages,
  receiveMessageTimeout
} from '~/src/messaging/event.js'
import { handleEvent } from '~/src/service/index.js'

const logger = createLogger()

/**
 * @returns {Promise<void>}
 */
export async function runTaskOnce() {
  logger.info('Receiving queue messages')

  try {
    const result = await receiveEventMessages()
    const messages = result.Messages
    const messageCount = messages ? messages.length : 0

    logger.info(`Received ${messageCount} queue messages`)

    if (messages && messageCount) {
      logger.info('Handling form submission events')

      await handleEvent(messages)

      logger.info(`Handled form submission event`)
    }
  } catch (err) {
    logger.error(
      `[runTaskOnce] Receive messages task failed - ${getErrorMessage(err)}`
    )
  }
}

/**
 * Task to poll for messages and store the result in the DB
 * @returns {Promise<void>}
 */
export async function runTask() {
  await runTaskOnce()

  logger.info(`Adding task to stack in ${receiveMessageTimeout} milliseconds`)

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  setTimeout(runTask, receiveMessageTimeout)

  logger.info(`Added task to stack`)
}

const failingMessage = {
  MessageId: 'c51ba8d9-9f91-46ed-bf74-4e6824346764',
  ReceiptHandle:
    'AQEB/MLOhepDKw8ozPGaoOIeqjRxLCRT2W7LFMHrFjwB15+49MBnDhxD9MNhooHOO/XM68jstr7UyUIcKFRi3+h1M0SQd64vDTQLHLk/ckmoMaWNxTx8z4MHL9UEAkJddT6VyQZh/uytJCwZpaRjyS7GPt+6FM3qImFyGy7A6dzQlv1SI3WWIQtI4zW7wlkh6qLGjrb+M91F5igY8Elbuh3Tyc5VruwVgb7cukMFI+YQ95m6pJKeDyA2zoFzCmeqWouRvSlHTNMcq6iDlSn6+PNw9/fDcL+28KkJHcSgkCfivumzm7U96SWSpHuHQaKgRGgNlU/Cq4rfhv3+mFU07iNZHfr8cs3+02RDlrsJKZm13B8VTRl4vbQILeVGwlTNjF9ehfrYV+RY2ZQGfB0V1z1Ncmwn2SK9q2VloCri4OAkFkBg1NU8TomcGyHhU1/1G80a',
  MD5OfBody: '4393dba458a3cacfd2eb980115637e7d',
  Body: '{"meta":{"schemaVersion":1,"timestamp":"2025-09-12T15:15:02.996Z","referenceNumber":"9E6-AD3-030","formName":"Reporting information about your gamebird release","formId":"68a2e5861f1bbdbb6e507268","formSlug":"reporting-information-about-your-gamebird-release","status":"draft","isPreview":true,"notificationEmail":"newlsdigitalforms@naturalengland.org.uk"},"data":{"main":{"BcnFeX":true,"cDKVwY":"Jacob","rUNaSZ":"Pritchett","DJJMTK":"0000000","ClNrEa":"jacob.pritchett@naturalengland.org.uk","VoUkbj":"What is the name of the Special Area of Conservation (SAC) where your release(s) took place","gFHfUy":"Yes - I hold Consent"},"repeaters":{"aFNGKS":[{"hbgKUe":"Within the boundary of a SAC","KKwezM":"Common pheasant","wJnnrh":"XX 1234 5678","GHrHCD":{"day":21,"month":7,"year":2025},"AFJERx":"Soft release","AZXtMZ":20,"ubdPEm":"Hectares","bCaZSB":9}],"hldeya":[{"CgJMOC":"Name of the Site of Special Scientific Interest that your Consent relates to","XVjExf":"Provide the full name of the Consent holder","lGDOPb":{"day":21,"month":7,"year":2025},"QzpDLr":{"day":21,"month":7,"year":2026},"VzlKmc":"What is the file reference number on your consent? (optional)","zHYPDZ":9,"ZQChjA":9}]},"files":{}},"result":{"files":{"main":"2a38e482-e9de-4fa7-8d10-98a5c2283358","repeaters":{"aFNGKS":"af665c0e-b2c2-47bb-ae04-9b901afdf95c","hldeya":"76612dd3-00ef-4260-b2da-1d275df99f08"}}}}'
}

await handleEvent([failingMessage])

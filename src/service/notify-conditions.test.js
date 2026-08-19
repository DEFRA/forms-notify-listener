import {
  ConditionEvaluationOutcome,
  ConditionType,
  FormStatus,
  OperatorName
} from '@defra/forms-model'
import { buildDefinition, buildMetaData } from '@defra/forms-model/stubs'

import { logger } from '~/src/helpers/logging/logger.js'
import { getFormDefinition, getFormMetadata } from '~/src/lib/manager.js'
import { sendNotification } from '~/src/lib/notify.js'
import {
  buildFormAdapterSubmissionMessage,
  buildFormAdapterSubmissionMessageMetaStub
} from '~/src/service/__stubs__/event-builders.js'
import {
  definitionForEmail,
  definitionForFeedbackForm
} from '~/src/service/__stubs__/forms.js'
import {
  resolveSubmissionOutputs,
  sendNotifyEmailsForConditions
} from '~/src/service/notify-conditions.js'

jest.mock('~/src/helpers/logging/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
  }
}))
jest.mock('~/src/lib/notify.js')
jest.mock('~/src/lib/manager.js')

const FORM_ID = '68a8b0449ab460290c28940a'
const NOTIFICATION_EMAIL = 'team@example.uk'
const CASEWORK_INBOX = 'casework@example.uk'
const POLICY_INBOX = 'policy@example.uk'
const SUBMITTER_EMAIL = 'submitter@example.com'
const CONDITION_ID = 'd15aff7a-6224-40a2-8e5f-51a5af2f7910'
const OTHER_CONDITION_ID = 'd1f9fcc7-f098-47e7-9d31-4f5ee57ba985'

/**
 * @param {string} emailAddress
 * @param {string} [condition]
 * @returns {Output}
 */
function humanOutput(emailAddress, condition) {
  return {
    emailAddress,
    audience: 'human',
    version: '2',
    ...(condition !== undefined && { condition })
  }
}

/**
 * @param {string} conditionId
 * @param {ConditionEvaluationOutcome} outcome
 * @returns {SubmitConditionEvaluation}
 */
function evaluation(conditionId, outcome) {
  return { conditionId, outcome, references: [] }
}

/**
 * A condition on the form's "What is your name?" answer. The definition
 * schema only accepts an output conditioned on a condition the form actually
 * has, so every condition an output names has to exist here too.
 * @param {string} id
 * @param {string} itemId
 * @returns {ConditionWrapperV2}
 */
function conditionOnName(id, itemId) {
  return {
    id,
    displayName: `is Bob (${id})`,
    items: [
      {
        id: itemId,
        componentId: '1c7383aa-1081-4858-851e-126a79b721b4',
        operator: OperatorName.Is,
        value: 'Bob',
        type: ConditionType.StringValue
      }
    ]
  }
}

/**
 * @param {Partial<FormDefinition>} [partialDefinition]
 * @returns {FormDefinition}
 */
function emailDefinition(partialDefinition = {}) {
  return buildDefinition({
    ...definitionForEmail,
    conditions: [
      conditionOnName(CONDITION_ID, 'fea9f725-3879-426a-8125-75d0da6995ac'),
      conditionOnName(
        OTHER_CONDITION_ID,
        'c833b177-0cba-49de-b670-a297c6db45b8'
      )
    ],
    ...partialDefinition
  })
}

/**
 * @param {SubmitConditionEvaluation[]} conditionEvaluations
 * @param {Partial<FormAdapterSubmissionMessageMeta>} [partialMeta]
 * @returns {FormAdapterSubmissionMessage}
 */
function buildMessage(conditionEvaluations, partialMeta = {}) {
  return buildFormAdapterSubmissionMessage({
    meta: buildFormAdapterSubmissionMessageMetaStub({
      formId: FORM_ID,
      status: FormStatus.Live,
      notificationEmail: NOTIFICATION_EMAIL,
      ...partialMeta
    }),
    conditionEvaluations
  })
}

/**
 * The addresses handed to Notify, in call order
 * @returns {(string | undefined)[]}
 */
function sentTo() {
  return jest
    .mocked(sendNotification)
    .mock.calls.map(([options]) => options.emailAddress)
}

describe('notify-conditions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(getFormMetadata).mockResolvedValue(buildMetaData())
  })

  describe('resolveSubmissionOutputs', () => {
    /**
     * @param {Partial<FormDefinition>} partialDefinition
     * @param {SubmitConditionEvaluation[]} [conditionEvaluations]
     * @returns {Output[]}
     */
    const resolve = (partialDefinition, conditionEvaluations = []) =>
      resolveSubmissionOutputs(
        emailDefinition(partialDefinition),
        conditionEvaluations,
        NOTIFICATION_EMAIL,
        FORM_ID
      )

    it('should fall back to the notification email when the form has no outputs', () => {
      expect(resolve({})).toEqual([humanOutput(NOTIFICATION_EMAIL)])
    })

    it('should send the fallback in the format the definition asks for', () => {
      expect(
        resolve({ output: { audience: 'machine', version: '1' } })
      ).toEqual([
        { emailAddress: NOTIFICATION_EMAIL, audience: 'machine', version: '1' }
      ])
    })

    it('should replace the notification email once an output qualifies', () => {
      expect(resolve({ outputs: [humanOutput(CASEWORK_INBOX)] })).toEqual([
        humanOutput(CASEWORK_INBOX)
      ])
    })

    it('should include an output whose condition evaluated true', () => {
      expect(
        resolve({ outputs: [humanOutput(CASEWORK_INBOX, CONDITION_ID)] }, [
          evaluation(CONDITION_ID, ConditionEvaluationOutcome.True)
        ])
      ).toEqual([humanOutput(CASEWORK_INBOX)])
    })

    it.each([
      ConditionEvaluationOutcome.False,
      ConditionEvaluationOutcome.Error
    ])('should exclude an output whose condition evaluated %s', (outcome) => {
      expect(
        resolve({ outputs: [humanOutput(CASEWORK_INBOX, CONDITION_ID)] }, [
          evaluation(CONDITION_ID, outcome)
        ])
      ).toEqual([humanOutput(NOTIFICATION_EMAIL)])
    })

    it('should exclude an output whose condition was never evaluated, and log it', () => {
      expect(
        resolve({ outputs: [humanOutput(CASEWORK_INBOX, CONDITION_ID)] })
      ).toEqual([humanOutput(NOTIFICATION_EMAIL)])

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining(CONDITION_ID)
      )
    })

    it('should keep every output that qualifies', () => {
      const outputs = [
        humanOutput(CASEWORK_INBOX, CONDITION_ID),
        humanOutput(POLICY_INBOX, OTHER_CONDITION_ID),
        humanOutput('archive@example.uk')
      ]

      expect(
        resolve({ outputs }, [
          evaluation(CONDITION_ID, ConditionEvaluationOutcome.True),
          evaluation(OTHER_CONDITION_ID, ConditionEvaluationOutcome.False)
        ])
      ).toEqual([
        humanOutput(CASEWORK_INBOX),
        humanOutput('archive@example.uk')
      ])
    })

    it('should deduplicate outputs resolving to the same address and format', () => {
      const outputs = [
        humanOutput(CASEWORK_INBOX),
        humanOutput(CASEWORK_INBOX.toUpperCase(), CONDITION_ID)
      ]

      expect(
        resolve({ outputs }, [
          evaluation(CONDITION_ID, ConditionEvaluationOutcome.True)
        ])
      ).toEqual([humanOutput(CASEWORK_INBOX)])
    })

    it('should keep the same address asked for in two formats', () => {
      /** @type {Output} */
      const machineOutput = {
        emailAddress: CASEWORK_INBOX,
        audience: 'machine',
        version: '2'
      }

      expect(
        resolve({ outputs: [humanOutput(CASEWORK_INBOX), machineOutput] })
      ).toEqual([humanOutput(CASEWORK_INBOX), machineOutput])
    })

    it('should resolve to nothing when the form has neither outputs nor a notification email', () => {
      expect(
        resolveSubmissionOutputs(emailDefinition(), [], '', FORM_ID)
      ).toEqual([])
    })
  })

  describe('sendNotifyEmailsForConditions', () => {
    beforeEach(() => {
      jest.mocked(getFormDefinition).mockResolvedValue(
        emailDefinition({
          outputs: [
            humanOutput(CASEWORK_INBOX, CONDITION_ID),
            humanOutput(POLICY_INBOX, OTHER_CONDITION_ID)
          ]
        })
      )
    })

    it('should fetch the definition version the submission was made against', async () => {
      await sendNotifyEmailsForConditions(
        buildMessage([], {
          versionMetadata: {
            versionNumber: 9,
            createdAt: new Date('2025-09-10T12:03:05.042Z')
          }
        })
      )

      expect(getFormDefinition).toHaveBeenCalledWith(
        FORM_ID,
        FormStatus.Live,
        9
      )
    })

    it('should send only to the outputs whose conditions passed', async () => {
      await sendNotifyEmailsForConditions(
        buildMessage([
          evaluation(CONDITION_ID, ConditionEvaluationOutcome.True),
          evaluation(OTHER_CONDITION_ID, ConditionEvaluationOutcome.False)
        ])
      )

      expect(sentTo()).toEqual([CASEWORK_INBOX])
    })

    it('should send to the notification email only when no output qualifies', async () => {
      await sendNotifyEmailsForConditions(
        buildMessage([
          evaluation(CONDITION_ID, ConditionEvaluationOutcome.False),
          evaluation(OTHER_CONDITION_ID, ConditionEvaluationOutcome.False)
        ])
      )

      expect(sentTo()).toEqual([NOTIFICATION_EMAIL])
    })

    it('should send nothing for a feedback form', async () => {
      jest
        .mocked(getFormDefinition)
        .mockResolvedValue(definitionForFeedbackForm)

      await sendNotifyEmailsForConditions(
        buildMessage([], { custom: { userConfirmationEmail: SUBMITTER_EMAIL } })
      )

      expect(sendNotification).not.toHaveBeenCalled()
    })

    it('should send the submitter their confirmation email alongside', async () => {
      await sendNotifyEmailsForConditions(
        buildMessage(
          [evaluation(CONDITION_ID, ConditionEvaluationOutcome.True)],
          { custom: { userConfirmationEmail: SUBMITTER_EMAIL } }
        )
      )

      expect(sentTo()).toEqual([CASEWORK_INBOX, SUBMITTER_EMAIL])
    })

    it('should not load the form metadata when there is no confirmation email', async () => {
      await sendNotifyEmailsForConditions(
        buildMessage([
          evaluation(CONDITION_ID, ConditionEvaluationOutcome.True)
        ])
      )

      expect(getFormMetadata).not.toHaveBeenCalled()
    })

    it('should fail the whole submission when a single address fails', async () => {
      jest
        .mocked(sendNotification)
        .mockResolvedValueOnce(/** @type {any} */ ({}))
        .mockRejectedValueOnce(new Error('Notify is down'))

      await expect(
        sendNotifyEmailsForConditions(
          buildMessage([
            evaluation(CONDITION_ID, ConditionEvaluationOutcome.True),
            evaluation(OTHER_CONDITION_ID, ConditionEvaluationOutcome.True)
          ])
        )
      ).rejects.toThrow('[emailSendFailed] 1 of 2 notification email(s) failed')
    })

    it('should not retry an address that failed', async () => {
      jest
        .mocked(sendNotification)
        .mockRejectedValue(new Error('Notify is down'))

      await expect(
        sendNotifyEmailsForConditions(
          buildMessage([
            evaluation(CONDITION_ID, ConditionEvaluationOutcome.True)
          ])
        )
      ).rejects.toThrow('[emailSendFailed]')

      expect(sendNotification).toHaveBeenCalledTimes(1)
    })

    it('should not name an address in the failure it throws', async () => {
      jest
        .mocked(sendNotification)
        .mockRejectedValue(new Error('Notify is down'))

      const error = await sendNotifyEmailsForConditions(
        buildMessage([
          evaluation(CONDITION_ID, ConditionEvaluationOutcome.True)
        ])
      ).catch((/** @type {unknown} */ err) => err)

      expect(error).toBeInstanceOf(Error)
      expect(/** @type {Error} */ (error).message).not.toContain(CASEWORK_INBOX)
    })

    it('should send nothing when the form resolves to no recipients at all', async () => {
      jest.mocked(getFormDefinition).mockResolvedValue(
        emailDefinition({
          outputs: [humanOutput(CASEWORK_INBOX, CONDITION_ID)]
        })
      )

      await sendNotifyEmailsForConditions(
        buildMessage(
          [evaluation(CONDITION_ID, ConditionEvaluationOutcome.False)],
          { notificationEmail: '' }
        )
      )

      expect(sendNotification).not.toHaveBeenCalled()
    })
  })
})

/**
 * @import { ConditionWrapperV2, FormDefinition, Output, SubmitConditionEvaluation } from '@defra/forms-model'
 * @import { FormAdapterSubmissionMessage, FormAdapterSubmissionMessageMeta } from '@defra/forms-engine-plugin/engine/types.js'
 */

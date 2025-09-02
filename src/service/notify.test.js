import {
  ComponentType,
  ControllerType,
  Engine,
  FormStatus,
  SchemaVersion
} from '@defra/forms-model'
import { buildDefinition } from '@defra/forms-model/stubs'

import { getFormDefinition } from '~/src/lib/manager.js'
import { sendNotification } from '~/src/lib/notify.js'
import {
  buildFormAdapterSubmissionMessage,
  buildFormAdapterSubmissionMessageData,
  buildFormAdapterSubmissionMessageMetaStub,
  buildFormAdapterSubmissionMessageResult
} from '~/src/service/__stubs__/event-builders.js'
import { sendNotifyEmail } from '~/src/service/notify.js'

jest.mock('~/src/helpers/logging/logger.js', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn()
  })
}))
jest.mock('nunjucks', () => {
  const environment = {
    addFilter: jest.fn(),
    addGlobal: jest.fn()
  }
  return {
    configure: jest.fn(() => environment)
  }
})
jest.mock('~/src/lib/notify.js')
jest.mock('~/src/lib/manager.js')
jest.mock('~/src/config/index.js', () => ({
  config: {
    get: jest.fn((key) => {
      if (key === 'notifyTemplateId') return 'notify-template-id-1'
      return 'mock-value'
    })
  }
}))

describe('notify', () => {
  const formId = '68a8b0449ab460290c28940a'
  const referenceNumber = '576-225-943'
  const formSubmissionData = buildFormAdapterSubmissionMessageData({
    main: {
      JHCHVE: 'Julius Ceasar'
    },
    repeaters: {},
    files: {}
  })
  const formSubmissionMeta = buildFormAdapterSubmissionMessageMetaStub({
    formName: 'Machine readable form',
    formSlug: 'machine-readable-form',
    isPreview: false,
    status: FormStatus.Live,
    notificationEmail: 'notificationEmail@example.uk',
    referenceNumber,
    formId
  })

  const formSubmissionResult = buildFormAdapterSubmissionMessageResult()

  const formAdapterSubmissionMessage = buildFormAdapterSubmissionMessage({
    meta: formSubmissionMeta,
    data: formSubmissionData,
    result: formSubmissionResult
  })
  const baseDefinition = buildDefinition({
    name: 'Machine readable form',
    output: {
      audience: 'machine',
      version: '2'
    },
    engine: Engine.V2,
    schema: SchemaVersion.V2,
    startPage: '/summary',
    pages: [
      {
        title: '',
        path: '/what-is-your-name',
        components: [
          {
            type: ComponentType.TextField,
            title: 'What is your name?',
            name: 'JHCHVE',
            shortDescription: 'Your name',
            hint: '',
            options: {
              required: true
            },
            schema: {},
            id: 'b2e4a0f5-eb78-4faf-a56d-cfe2462405e9'
          }
        ],
        next: [],
        id: '3b6baff0-e694-428b-9823-63799c5f730a'
      },
      {
        id: '449a45f6-4541-4a46-91bd-8b8931b07b50',
        title: 'Summary',
        path: '/summary',
        controller: ControllerType.Summary
      }
    ],
    conditions: [],
    sections: [],
    lists: []
  })

  describe('sendNotifyEmail', () => {
    it('should send a v1 machine readable email', async () => {
      const definition = buildDefinition({
        ...baseDefinition,
        output: {
          audience: 'machine',
          version: '1'
        }
      })
      jest.mocked(getFormDefinition).mockResolvedValueOnce(definition)
      await sendNotifyEmail(formAdapterSubmissionMessage)

      const [sendNotificationCall] = jest.mocked(sendNotification).mock.calls[0]
      expect(sendNotificationCall).toEqual({
        templateId: 'notify-template-id-1',
        emailAddress: 'notificationEmail@example.uk',
        personalisation: {
          subject: 'Form submission: Machine readable form',
          body: expect.any(String)
        }
      })
      const sendNotificationBody = JSON.parse(
        Buffer.from(
          sendNotificationCall.personalisation.body,
          'base64'
        ).toString('utf-8')
      )
      expect(sendNotificationBody).toEqual({
        meta: {
          schemaVersion: '1',
          timestamp: expect.any(String),
          referenceNumber,
          definition
        },
        data: {
          ...formSubmissionData
        }
      })
    })

    it('should send a v2 machine readable email', async () => {
      jest.mocked(getFormDefinition).mockResolvedValueOnce(baseDefinition)
      await sendNotifyEmail(formAdapterSubmissionMessage)

      const [sendNotificationCall] = jest.mocked(sendNotification).mock.calls[0]
      expect(sendNotificationCall).toEqual({
        templateId: 'notify-template-id-1',
        emailAddress: 'notificationEmail@example.uk',
        personalisation: {
          subject: 'Form submission: Machine readable form',
          body: expect.any(String)
        }
      })
      const sendNotificationBody = JSON.parse(
        Buffer.from(
          sendNotificationCall.personalisation.body,
          'base64'
        ).toString('utf-8')
      )
      expect(new Date(sendNotificationBody.meta.timestamp)).not.toBeNaN()
      expect(sendNotificationBody).toEqual({
        meta: {
          schemaVersion: '2',
          timestamp: expect.any(String),
          referenceNumber,
          definition: baseDefinition
        },
        data: formSubmissionData
      })
    })

    it('should send a notification email', async () => {
      const definition = buildDefinition({
        name: 'Order a pizza',
        engine: Engine.V2,
        schema: 2,
        startPage: '/summary',
        pages: [
          {
            title: '',
            path: '/what-style-of-pizza-would-you-like',
            components: [
              {
                type: ComponentType.RadiosField,
                title: 'What style of pizza would you like?',
                name: 'QMwMir',
                shortDescription: 'Style of pizza',
                hint: '',
                options: {
                  required: true
                },
                list: '980b45c2-c928-4668-aede-66ee3ab0220a',
                id: 'bf699f54-a326-4375-bb0b-a597e7442348'
              }
            ],
            next: [],
            id: '32e62c6f-6ca2-471a-9ce5-4fcfde84ab79'
          },
          {
            title: '',
            path: '/what-size-of-pizza-would-you-like',
            components: [
              {
                type: ComponentType.RadiosField,
                title: 'What size of pizza would you like?',
                name: 'duOEvZ',
                shortDescription: 'Size of pizza',
                hint: '',
                options: {
                  required: true
                },
                list: '2c395e86-51ea-4a8f-9f33-a17b825d25ab',
                id: '75f55a52-4583-4d66-b99b-4cd9ce88c54d'
              }
            ],
            next: [],
            id: '173cb4df-1312-44ec-bb1b-e8d15adc2b1b'
          },
          {
            title: '',
            path: '/what-kind-of-cheeses-would-you-like',
            components: [
              {
                type: ComponentType.CheckboxesField,
                title: 'What kind of cheeses would you like?',
                name: 'DzEODf',
                shortDescription: 'Type of cheese',
                hint: 'Choose at least one',
                options: {
                  required: true
                },
                list: 'a5872e58-7b9d-4214-abb0-2f6fc6460430',
                id: '822c6925-ea67-42f0-95e6-46f5383f0c5d'
              }
            ],
            next: [],
            id: '16e15d43-eca9-46b1-8dfb-3caa7a391f92'
          },
          {
            title: '',
            path: '/which-toppings-would-you-like',
            components: [
              {
                type: ComponentType.CheckboxesField,
                title: 'Which toppings would you like?',
                name: 'juiCfC',
                shortDescription: 'Toppings',
                hint: '',
                options: {
                  required: true
                },
                list: '16a868c0-c4c2-4638-9fe7-990d192f045d',
                id: '405e0ed5-e666-4406-ab9a-5f8fb2e9865d'
              }
            ],
            next: [],
            id: '6b432ca9-d027-4c47-82c6-e852a89f5f2f'
          },
          {
            title: '',
            path: '/would-you-like-to-add-any-special-instructions',
            components: [
              {
                type: ComponentType.MultilineTextField,
                title: 'Would you like to add any special instructions?',
                name: 'YEpypP',
                shortDescription: 'Special instructions',
                hint: '',
                options: {
                  required: true
                },
                schema: {},
                id: '66d51c57-d0a0-44b7-88e3-3751e965d79d'
              }
            ],
            next: [],
            id: 'c1b5ed0d-adeb-49c7-ab29-00435e493a3f'
          },
          {
            title: 'Your delivery details',
            path: '/your-delivery-details',
            components: [
              {
                type: ComponentType.TextField,
                title: 'What is your name?',
                name: 'JumNVc',
                shortDescription: 'Your name',
                hint: '',
                options: {
                  required: true
                },
                schema: {},
                id: '1c7383aa-1081-4858-851e-126a79b721b4'
              },
              {
                type: ComponentType.TelephoneNumberField,
                title: 'What is your phone number?',
                name: 'ALNehP',
                shortDescription: 'Your phone number',
                hint: '',
                options: {
                  required: true
                },
                id: 'f4ddf3af-dfcd-4909-bbbf-a3f98a981280'
              },
              {
                type: ComponentType.UkAddressField,
                title: 'What is your address?',
                name: 'vAqTmg',
                shortDescription: 'Your address',
                hint: '',
                options: {
                  required: true
                },
                id: 'e2150dce-4d77-437d-9e8b-95d2c997557a'
              },
              {
                type: ComponentType.DatePartsField,
                title: 'When would you like your pizza delivered?',
                name: 'IbXVGY',
                shortDescription: 'Pizza delivery date',
                hint: '',
                options: {
                  required: true
                },
                id: 'a49e0eb1-0e36-45fe-9459-af3287fea87f'
              }
            ],
            next: [],
            id: 'cb0da6df-e2b6-4299-884b-6eec90214a6b'
          },
          {
            title: '',
            path: '/what-sauces-would-you-like',
            components: [
              {
                type: ComponentType.CheckboxesField,
                title: 'What sauces would you like?',
                name: 'HGBWLt',
                shortDescription: 'Sauces',
                hint: 'Select all that apply',
                options: {
                  required: false
                },
                list: '60c73085-feeb-4bc8-b106-4e38eaa19586',
                id: '5ffca8f4-fa56-4353-865f-0fc93dbb4005'
              }
            ],
            next: [],
            id: 'e3447964-bf54-49a4-a4cd-87768e017888'
          },
          {
            id: '449a45f6-4541-4a46-91bd-8b8931b07b50',
            title: 'Summary',
            path: '/summary',
            controller: ControllerType.Summary
          }
        ],
        conditions: [],
        sections: [],
        lists: [
          {
            name: 'SlAGvM',
            title: 'List for question QMwMir',
            type: 'string',
            items: [
              {
                id: 'b74b05a7-6c9d-46f3-a65a-73ffb0db048f',
                text: 'Detroit‑Style Pizza',
                hint: {
                  text: 'Thick, rectangular pan pizza with caramelized cheese edges',
                  id: '25ef2747-b77e-45e3-af08-92c431155266'
                },
                value: 'Detroit‑Style Pizza'
              },
              {
                id: 'ee06e725-0029-4fd7-a426-126cb6115c2e',
                text: 'New York‑Style Pizza',
                hint: {
                  text: 'Thin, hand-tossed, foldable slices',
                  id: 'f21827f7-140a-4803-ac1e-3b3fcc6ce406'
                },
                value: 'New York‑Style Pizza'
              },
              {
                id: 'fa5123f4-1118-4ecf-81ce-700dce35cd66',
                text: 'Neapolitan‑Style Pizza',
                hint: {
                  text: 'Classic Italian thin-crust, cooked in high-heat wood‑fired oven',
                  id: '81e83f53-4196-40d6-a7e0-4c45884a4ef3'
                },
                value: 'Neapolitan‑Style Pizza'
              },
              {
                id: '2354c6be-6c8c-49e6-bf0f-3ce382261ce1',
                text: 'Sicilian Pizza',
                hint: {
                  text: 'Thick, square crust—breadier, baked in a pan',
                  id: '05e5cef3-626d-41b6-92d8-9008f82c0e16'
                },
                value: 'Sicilian Pizza'
              },
              {
                id: 'ea78daf6-afe4-434d-ae77-09c510c6abb2',
                text: 'Chicago Deep‑Dish Pizza',
                hint: {
                  text: 'Deep, buttery crust with cheese layers and sauce on top',
                  id: '4e3acbce-b4a5-4d57-92aa-518f56a02697'
                },
                value: 'Chicago Deep‑Dish Pizza'
              },
              {
                id: '84f8804a-22f0-46f9-9231-362beee55bdd',
                text: 'New Haven‑Style “Apizza”',
                hint: {
                  text: 'Thin, charred, chewy crust—Neapolitan‑influenced',
                  id: 'c6641075-b948-4048-b593-1cf4fcf9668a'
                },
                value: 'New Haven‑Style “Apizza”'
              },
              {
                id: 'e5215690-c2d3-4d58-8e9e-19a4074f7444',
                text: 'Grandma Pizza (optional extra)',
                hint: {
                  text: 'Long Island–style thin square, olive oil, cheese, tomatoes',
                  id: '702e3e9d-8af1-431d-bce5-005677ae7e37'
                },
                value: 'Grandma Pizza (optional extra)'
              }
            ],
            id: '980b45c2-c928-4668-aede-66ee3ab0220a'
          },
          {
            name: 'uKMXbR',
            title: 'List for question duOEvZ',
            type: 'string',
            items: [
              {
                id: '0ce60697-d769-4f0a-99e9-154dadc2d838',
                text: 'Small',
                value: 'Small'
              },
              {
                id: 'ce4a569f-8644-4959-addf-70eb912d9862',
                text: 'Medium',
                value: 'Medium'
              },
              {
                id: 'd6b8fd4e-0cdc-44f9-a606-b3e2f7092af4',
                text: 'Large',
                value: 'Large'
              },
              {
                id: 'd7a38f16-ef91-47ac-b1b7-3119602d16d1',
                text: 'Family-size',
                value: 'Family-size'
              }
            ],
            id: '2c395e86-51ea-4a8f-9f33-a17b825d25ab'
          },
          {
            name: 'AGyaMK',
            title: 'List for question HGBWLt',
            type: 'string',
            items: [
              {
                id: '99be7c09-bbb7-405a-8a2a-237222a4fdaa',
                text: 'Tomato sauce',
                value: 'Tomato sauce'
              },
              {
                id: '9fa653de-5bf1-4ecf-bb77-3f7c8bd6476e',
                text: 'Garlic sauce',
                value: 'Garlic sauce'
              },
              {
                id: '91f645f4-760d-4873-b860-a22e04a18340',
                text: 'BBQ sauce',
                value: 'BBQ sauce'
              }
            ],
            id: '60c73085-feeb-4bc8-b106-4e38eaa19586'
          },
          {
            name: 'cdUhKW',
            title: 'List for question DzEODf',
            type: 'string',
            items: [
              {
                id: '56410113-8d02-430d-8036-c325d3e4b5ed',
                text: 'Mozzarella',
                value: 'Mozzarella'
              },
              {
                id: '01669618-b31e-41fe-a07e-256f47800e40',
                text: 'Wisconsin brick cheese',
                value: 'Wisconsin brick cheese'
              },
              {
                id: 'c85a4c1e-80ea-4cd8-b670-ff289afbbd5e',
                text: 'Parmesan',
                value: 'Parmesan'
              },
              {
                id: 'e8c8750b-d309-487a-901a-a02bf86eb057',
                text: 'Provolone',
                value: 'Provolone'
              },
              {
                id: 'e871cca0-2c7c-49de-97a1-5bbcae78ca0a',
                text: 'Ricotta',
                value: 'Ricotta'
              },
              {
                id: 'e77818a9-cc21-41fc-946c-4b50784281be',
                text: 'Fontina',
                value: 'Fontina'
              }
            ],
            id: 'a5872e58-7b9d-4214-abb0-2f6fc6460430'
          },
          {
            name: 'QQyMtP',
            title: 'List for question juiCfC',
            type: 'string',
            items: [
              {
                id: '0db6127e-b8d4-4532-923b-3185b67176af',
                text: 'Pepperoni',
                value: 'Pepperoni'
              },
              {
                id: '5768c916-6193-4a17-9e67-476b59cdf4a5',
                text: 'Sausage',
                value: 'Sausage'
              },
              {
                id: 'e76a7be9-300e-4d62-ac1f-b491625c3cc1',
                text: 'Mushrooms',
                value: 'Mushrooms'
              },
              {
                id: 'da448895-d8e8-452a-a51b-ebbd9dc10aa3',
                text: 'Onions',
                value: 'Onions'
              },
              {
                id: 'b3e8b01b-1523-4b27-8c32-e2a80ffb7fe3',
                text: 'Bell peppers',
                value: 'Bell peppers'
              },
              {
                id: '920bd74a-778b-4f9f-ab3a-99392c9e67c8',
                text: 'Bacon',
                value: 'Bacon'
              },
              {
                id: '2ab77aae-21f4-47e3-afd7-7067744ec59a',
                text: 'Chicken',
                value: 'Chicken'
              },
              {
                id: '506c87b1-3458-49d6-89cd-3c9ae27b0240',
                text: 'Basil',
                value: 'Basil'
              }
            ],
            id: '16a868c0-c4c2-4638-9fe7-990d192f045d'
          }
        ]
      })
      const formAdapterSubmissionMessage = buildFormAdapterSubmissionMessage({
        meta: buildFormAdapterSubmissionMessageMetaStub({
          formName: 'Order a pizza',
          formSlug: 'order-a-pizza',
          isPreview: false,
          status: FormStatus.Live,
          notificationEmail: 'notificationEmail@example.uk',
          referenceNumber: '576-225-943',
          formId
        }),
        data: buildFormAdapterSubmissionMessageData({
          main: {
            QMwMir: 'Roman Pizza',
            duOEvZ: 'Small',
            DzEODf: ['Mozzarella'],
            juiCfC: ['Pepperoni', 'Sausage', 'Onions', 'Basil'],
            YEpypP: 'None',
            JumNVc: 'Joe Bloggs',
            ALNehP: '+441234567890',
            vAqTmg: {
              addressLine1: '1 Anywhere Street',
              town: 'Anywhereville',
              postcode: 'AN1 2WH'
            },
            IbXVGY: {
              day: 22,
              month: 8,
              year: 2025
            },
            HGBWLt: ['Garlic sauce']
          },
          repeaters: {},
          files: {}
        }),
        result: {
          main: '7ac3dcf9-8ffe-4a34-abfc-9e864e820029',
          files: {
            repeaters: {}
          }
        }
      })

      jest.mocked(getFormDefinition).mockResolvedValueOnce(definition)
      await sendNotifyEmail(formAdapterSubmissionMessage)
      expect(getFormDefinition).toHaveBeenCalledWith(formId, FormStatus.Live)
      expect(sendNotification).toHaveBeenCalledWith({
        templateId: 'notify-template-id-1',
        emailAddress: 'notificationEmail@example.uk',
        personalisation: {
          subject: 'Form submission: Order a pizza',
          body: expect.any(String)
        }
      })
    })

    it('should handle and throw errors', async () => {
      const err = new Error('Upstream failure')
      jest.mocked(getFormDefinition).mockResolvedValueOnce(baseDefinition)
      jest.mocked(sendNotification).mockRejectedValueOnce(err)
      await expect(
        sendNotifyEmail(formAdapterSubmissionMessage)
      ).rejects.toThrow(err)
    })
  })
})

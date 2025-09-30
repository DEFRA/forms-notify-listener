import { FormAdapterSubmissionSchemaVersion } from '@defra/forms-engine-plugin/engine/types/enums.js'
import {
  ComponentType,
  ControllerType,
  Engine,
  FormStatus
} from '@defra/forms-model'
import {
  buildDefinition,
  buildFileUploadComponent,
  buildFileUploadPage,
  buildList,
  buildListItem,
  buildMonthYearFieldComponent,
  buildQuestionPage,
  buildRepeaterPage,
  buildSummaryPage,
  buildTextFieldComponent
} from '@defra/forms-model/stubs'

import { buildFormAdapterSubmissionMessage } from '~/src/service/__stubs__/event-builders.js'

/**
 * @type {import('@defra/forms-model').FormDefinition}
 */
export const legacyGraphFormDefinition = buildDefinition({
  pages: [
    buildRepeaterPage({
      title: 'Who else lives in your household?',
      path: '/who-else-lives-in-your-household',
      repeat: {
        options: {
          name: 'wGNLPw',
          title: 'person'
        },
        schema: {
          min: 1,
          max: 25
        }
      },
      section: 'yLkCWc',
      next: [
        {
          path: '/passport-number'
        }
      ],
      components: [
        buildTextFieldComponent({
          name: 'IrwAyV',
          title: 'First name'
        }),
        buildTextFieldComponent({
          name: 'MWVjbY',
          title: 'Last name'
        }),
        buildMonthYearFieldComponent({
          name: 'dImeLi',
          title: 'When did they leave the UK?'
        })
      ]
    }),
    buildQuestionPage({
      title: 'What is your name?',
      path: '/what-is-your-name',
      section: 'yLkCWc',
      next: [
        {
          path: '/who-else-lives-in-your-household'
        }
      ],
      components: [
        buildTextFieldComponent({
          name: 'BuYlIg',
          title: 'First name'
        }),
        buildTextFieldComponent({
          name: 'zFwSsz',
          title: 'Last name'
        })
      ]
    }),
    buildQuestionPage({
      title: 'What country do you live in?',
      path: '/what-country-do-you-live-in',
      next: [
        {
          path: '/what-is-your-name'
        }
      ],
      components: [
        {
          name: 'RRApmV',
          title: 'Country of birth',
          type: ComponentType.RadiosField,
          hint: '',
          list: 'kEMAbR',
          options: {}
        }
      ]
    }),
    buildQuestionPage({
      title: 'Passport number',
      path: '/passport-number',
      next: [
        {
          path: '/how-many-family-members-do-you-have-abroad'
        }
      ],
      components: [
        {
          name: 'VFhEJu',
          title: 'Passport number',
          type: ComponentType.TextField,
          hint: '',
          options: {},
          schema: {}
        }
      ]
    }),
    buildSummaryPage({
      title: 'Check your answers',
      path: '/summary',
      controller: ControllerType.Summary,
      components: []
    }),
    buildQuestionPage({
      title: 'What is your age?',
      path: '/what-is-your-age',
      next: [
        {
          path: '/what-country-do-you-live-in'
        }
      ],
      components: [
        {
          name: 'CsWVsY',
          title: 'Your age',
          type: ComponentType.NumberField,
          hint: '',
          options: {},
          schema: {}
        }
      ]
    }),
    buildQuestionPage({
      title: 'How many family members do you have abroad?',
      path: '/how-many-family-members-do-you-have-abroad',
      section: 'KTXLMB',
      next: [
        {
          path: '/name-your-family-members-abroad'
        }
      ],
      components: [
        {
          name: 'wqTVdv',
          title: 'Number of people in your household',
          type: ComponentType.NumberField,
          hint: '',
          options: {},
          schema: {}
        }
      ]
    }),
    buildRepeaterPage({
      title: 'Name your family members abroad?',
      path: '/name-your-family-members-abroad',
      section: 'KTXLMB',
      next: [
        {
          path: '/proof-of-address'
        }
      ],
      repeat: {
        options: {
          name: 'kIneZe',
          title: 'Your family members abroad'
        },
        schema: {
          min: 1,
          max: 25
        }
      },
      components: [
        buildTextFieldComponent({
          name: 'fImezO',
          title: 'First name'
        }),
        buildTextFieldComponent({
          name: 'lAsNmeo',
          title: 'Last name'
        }),
        buildTextFieldComponent({
          name: 'CokUmaY',
          title: 'Country'
        })
      ]
    }),
    buildFileUploadPage({
      title: 'Proof of address',
      path: '/proof-of-address',
      components: [
        buildFileUploadComponent({
          name: 'fileUploadComponent',
          title: 'Upload proof of address'
        })
      ],
      next: [
        {
          path: '/summary'
        }
      ]
    })
  ],
  lists: [
    buildList({
      title: 'uk-countries',
      name: 'kEMAbR',
      type: 'string',
      items: [
        buildListItem({
          text: 'England',
          value: 'GB-ENG',
          id: '821930b3-4146-4333-b248-25ae8ae58011'
        }),
        buildListItem({
          text: 'Scotland',
          value: 'GB-SCOT',
          id: '75ee0ae4-e951-4eb1-8f0e-f0ff668ebca6'
        }),
        buildListItem({
          text: 'Wales',
          value: 'GB-WALES',
          id: '8f2fb883-656d-419e-a2dd-f9ea0daa3f2c'
        }),
        buildListItem({
          text: 'Northern Ireland',
          value: 'GB-NI',
          id: '0b17d816-9182-4759-ad0e-82c77ca2cf38'
        }),
        buildListItem({
          text: 'Other',
          value: 'other',
          id: '0696529c-0eb0-4b41-8ab8-ace7131ae72f'
        })
      ]
    })
  ],
  sections: [
    {
      title: 'Your international household',
      name: 'KTXLMB',
      hideTitle: false
    },
    {
      title: 'Your household',
      name: 'yLkCWc',
      hideTitle: false
    }
  ],
  name: 'CPH test',
  engine: Engine.V1,
  schema: 1,
  startPage: '/what-is-your-age'
})

export const legacyGraphFormMessage = buildFormAdapterSubmissionMessage({
  messageId: '1668fba2-386c-4e2e-a348-a241e4193d08',
  recordCreatedAt: new Date('2025-08-26'),
  meta: {
    schemaVersion: FormAdapterSubmissionSchemaVersion.V1,
    timestamp: new Date('2025-08-28T11:01:59.347Z'),
    formName: 'Pizza Form',
    formId: '8a1f3fbc-2dcb-4e2e-9f7a-5f3c8f3dcb2a',
    formSlug: 'pizza-form',
    status: FormStatus.Live,
    isPreview: false,
    notificationEmail: 'enrique.chase@defra.gov.uk',
    referenceNumber: '874-C7C-D60'
  },
  data: {
    main: {
      BuYlIg: 'John',
      zFwSsz: 'Doe',
      RRApmV: 'GB-ENG',
      CsWVsY: 4,
      VFhEJu: '23423',
      wqTVdv: 543
    },
    repeaters: {
      wGNLPw: [
        { IrwAyV: 'Jane', MWVjbY: 'Doe', dImeLi: { month: 1, year: 2000 } },
        { IrwAyV: 'Janet', MWVjbY: 'Doe', dImeLi: { month: 1, year: 2000 } }
      ]
    },
    files: {
      fileUploadComponent: [
        {
          fileName: 'bank_statement.pdf',
          fileId: '2c39f4bf-2ccc-4b73-8e0e-c91549b56989',
          userDownloadLink:
            'http://localhost:3005/file-download/2c39f4bf-2ccc-4b73-8e0e-c91549b56989'
        }
      ]
    }
  },
  result: {
    files: {
      main: '00000000-0000-0000-0000-000000000000',
      repeaters: {
        wGNLPw: '11111111-1111-1111-1111-111111111111'
      }
    }
  }
})

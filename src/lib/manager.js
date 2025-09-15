import { FormStatus } from '@defra/forms-model'

import { config } from '~/src/config/index.js'
import { getJson } from '~/src/lib/fetch.js'

const managerUrl = config.get('managerUrl')
/**
 * Gets the form definition from the Forms Manager API∂
 * @param {string} formId
 * @param {FormStatus} formStatus
 * @param {number|undefined} versionNumber - Optional specific version to fetch
 * @returns {Promise<FormDefinition>}
 */
export async function getFormDefinition(formId, formStatus, versionNumber) {
  return {
    name: 'Reporting information about your gamebird release',
    engine: 'V2',
    schema: 2,
    startPage: '/summary',
    pages: [
      {
        title: 'Before you start',
        path: '/before-you-start',
        components: [
          {
            id: '8f02a967-745a-4dca-bbab-1a1d42d1b99a',
            type: 'Markdown',
            content:
              "A condition of Defra's Gamebird General Licence (GL43) is that you must provide Natural England with details about any release in excess of 50 birds that you carry out:\r\n\r\n- Within the boundary of a European Site designated as a Special Area of Conservation (SAC), as permitted by a Site of Special Scientific Interest (SSSI) consent and/or\r\n- Outside a SAC boundary but within 500 metres of it (the 500m buffer zone)\r\n\r\nPlease use this form to submit information about your release of common pheasants or red-legged partridges within a SAC and/or within its 500 metre buffer zone.\r\n\r\nYour consent will be an official document that when issued permits you to undertake activities on a Site of Special Scientific Interest. They are issued in a variety of forms by Natural England, English Nature or Nature Conservancy Council. If you do not already have a SSSI consent or you cannot find one you can find out how to give notice to Natural England and get consent at https://www.gov.uk/government/publications/request-permission-for-works-or-an-activity-on-an-sssi\r\n\r\nYou’re required to register gamebirds on the Animal and Plant Health Agency Poultry Register. Guidance if you keep 50 or more gamebirds:\r\nhttps://www.gov.uk/government/publications/poultry-including-game-birds-registration-rules-and-forms \r\n\r\nGuidance if you keep fewer than 50 gamebirds: https://www.gov.uk/guidance/register-as-a-keeper-of-less-than-50-poultry-or-other-captive-birds",
            options: {},
            schema: {}
          }
        ],
        next: [],
        id: 'bab97c08-a78b-47d5-a84a-64a9cba04b78'
      },
      {
        title: '',
        path: '/are-you-submitting-a-report-of-actions-taken-under-the-general-licence-to-release-gamebirds-gl43',
        components: [
          {
            type: 'YesNoField',
            title:
              'Are you submitting a report of actions taken under the General Licence to release gamebirds (GL43)?',
            name: 'BcnFeX',
            shortDescription: 'Confirmation of GL43',
            hint: '',
            options: {
              required: true
            },
            schema: {},
            id: 'd7a96e13-262c-4877-8bac-15545e13996d'
          }
        ],
        next: [],
        id: '68894b04-65fc-433d-9d57-73c8a3837dc6'
      },
      {
        title: 'You cannot use this service',
        controller: 'TerminalPageController',
        path: '/you-cannot-use-this-service',
        components: [
          {
            id: 'd4ed6967-45dd-47a8-a4a5-9b014a4541ac',
            type: 'Markdown',
            content:
              'This form is to report actions taken under the conditions relied upon by GL43. \r\n\r\nIf you mean to submit a report of action form for an individual licence, please use this link[Add link].',
            options: {},
            schema: {}
          }
        ],
        next: [],
        id: '872533d2-0481-4f0d-8ae3-b532888708e3',
        condition: '750b8d68-5db6-468f-b7a9-7e7cadf47d01'
      },
      {
        title: 'What is your name?',
        path: '/what-is-your-name',
        components: [
          {
            type: 'TextField',
            title: 'First name',
            name: 'cDKVwY',
            shortDescription: 'First name',
            hint: '',
            options: {
              required: true
            },
            schema: {},
            id: 'e424afe9-98ad-470e-bf5c-b1e7aad484cb'
          },
          {
            type: 'TextField',
            title: 'Last name',
            name: 'rUNaSZ',
            shortDescription: 'Last name',
            hint: '',
            options: {
              required: true
            },
            schema: {},
            id: '6406d998-5809-40df-8223-ac625f248370'
          }
        ],
        next: [],
        id: '8d886012-d049-4f2a-8907-ac863ec9d80d'
      },
      {
        title: '',
        path: '/what-is-your-contact-number',
        components: [
          {
            type: 'TelephoneNumberField',
            title: 'What is your contact number?',
            name: 'DJJMTK',
            shortDescription: 'Contact number',
            hint: 'This could be your phone or mobile number',
            options: {
              required: true
            },
            schema: {},
            id: '781aea89-5305-4577-a440-7f31379a1102'
          }
        ],
        next: [],
        id: '8e613e96-c553-4220-8aa5-fa00e6e2a5cd'
      },
      {
        title: '',
        path: '/what-is-your-email-address',
        components: [
          {
            type: 'EmailAddressField',
            title: 'What is your email address?',
            name: 'ClNrEa',
            shortDescription: 'Email',
            hint: 'Make sure your email address is correct as we’ll need this to send you our response',
            options: {
              required: true
            },
            schema: {},
            id: '5300d4a1-6bac-4c7b-9864-c107d5197f6d'
          }
        ],
        next: [],
        id: 'e56499f9-bfad-4bf7-b0b0-6cc6d9268052'
      },
      {
        title: '',
        path: '/what-is-the-name-of-the-special-area-of-conservation-sac-where-your-releases-took-place',
        components: [
          {
            type: 'TextField',
            title:
              'What is the name of the Special Area of Conservation (SAC) where your release(s) took place',
            name: 'VoUkbj',
            shortDescription: 'Name of SAC',
            hint: 'If the release(s) were within 500m of multiple SACs, provide the name of the SAC they were closest to. \r\n\r\nReleases associated with a different SAC entirely should be reported separately by going through the form again after you have submitted this one.',
            options: {
              required: true
            },
            schema: {},
            id: 'aa4cd729-f58b-4a77-9309-67cb174f8e8c'
          }
        ],
        next: [],
        id: '448705bd-a38f-4d0b-bc75-db7d3290e2d6'
      },
      {
        title: 'Details of your release',
        path: '/details-of-your-release',
        components: [
          {
            type: 'RadiosField',
            title: 'Where did your release take place?',
            name: 'hbgKUe',
            shortDescription: 'Release proximity',
            hint: '',
            list: '752eed73-98c2-486d-aa7f-a36f301b3375',
            options: {
              required: true
            },
            schema: {},
            id: 'a3998253-fec0-4296-94e9-abfb5a1b1472'
          },
          {
            type: 'RadiosField',
            title:
              'Which species of gamebird did you release at this location?',
            name: 'KKwezM',
            shortDescription: 'Species Released',
            hint: '',
            options: {
              required: true
            },
            schema: {},
            list: 'b03b1940-463b-4df6-a6f4-ac724e824b68',
            id: '65f4b5d4-100f-49da-a8da-d83d3b631625'
          },
          {
            type: 'TextField',
            title:
              'Provide a location reference for your release pen, or the most central point of your release area',
            name: 'wJnnrh',
            shortDescription: 'Location reference',
            hint: 'A central point should be given if you released into a cover crop.\r\nYou must provide either a What3Words reference OR an OS grid reference of up to at least 8 figures, with a 2-letter pre-fix (e.g. “XX 1234 5678”)',
            options: {
              required: true
            },
            schema: {},
            id: 'bd5d0ef7-427a-404b-8c97-e8a9c7b73537'
          },
          {
            type: 'DatePartsField',
            title: 'When did you release gamebirds',
            name: 'GHrHCD',
            shortDescription: 'Release date',
            hint: 'Date the release took place or the date at which releases started if staggered release',
            options: {
              required: true
            },
            schema: {},
            id: 'ee63dbc1-97fc-4291-900e-fdea8092a814'
          },
          {
            type: 'RadiosField',
            title: 'What type of release took place?',
            name: 'AFJERx',
            shortDescription: 'Type of release',
            hint: '',
            options: {
              required: true
            },
            schema: {},
            list: '5e67fc3a-a0bc-4ab9-bb9d-92ce9d390d30',
            id: '9a2f66ab-d422-4af5-ab3f-21ff57b7d558'
          },
          {
            type: 'NumberField',
            title: 'Give the approximate size of the release site',
            name: 'AZXtMZ',
            shortDescription: 'Release site size',
            hint: 'numbers only',
            options: {
              required: true
            },
            schema: {},
            id: 'f7b995c8-b827-430e-9e92-8eba4c45e525'
          },
          {
            type: 'SelectField',
            title:
              'What unit of measure did you use for the release site size?',
            name: 'ubdPEm',
            shortDescription: 'Unit of Measure',
            hint: '',
            options: {
              required: true
            },
            schema: {},
            list: '942b6ded-d746-480d-a845-d5c6ae166193',
            id: '84867b8a-8cbe-4c85-a0e7-12f74d9db72c'
          },
          {
            type: 'NumberField',
            title:
              'What was the total number of common pheasant or red-legged partridge you release within this area/pen?',
            name: 'bCaZSB',
            shortDescription: 'Number of gamebirds released',
            hint: '',
            options: {
              required: true
            },
            schema: {},
            id: 'c3a205cd-d760-4414-ab7e-311dfe33e505'
          }
        ],
        next: [],
        id: 'e9e844c3-3546-4273-ba91-e66f3735e8a1',
        controller: 'RepeatPageController',
        repeat: {
          options: {
            name: 'aFNGKS',
            title: 'Release details'
          },
          schema: {
            min: 1,
            max: 25
          }
        }
      },
      {
        title: '',
        path: '/did-you-hold-consent-for-the-releases-reported-within-this-form',
        components: [
          {
            type: 'RadiosField',
            title:
              'Did you hold Consent for the release(s) reported within this form?',
            name: 'gFHfUy',
            shortDescription: 'Consent needed',
            hint: 'This relates to Consent given by Natural England for activities to take place on protected sites, such as, a Site of Special Scientific Interest (SSSIs)',
            options: {
              required: true
            },
            schema: {},
            list: 'ae5c549c-bb43-4fc8-8f9f-3bc611d018fc',
            id: '4d87b181-fd19-40cd-af38-3f451c355593'
          }
        ],
        next: [],
        id: '896db83b-ac79-481e-9170-91618df37b7d'
      },
      {
        title: 'Consent Details',
        path: '/consent-details',
        components: [
          {
            id: 'ddcbe80c-d5fc-46cc-a0e7-7fe2bfbb5ee5',
            type: 'Markdown',
            content:
              'Please provide details in relation to the Consent you hold',
            options: {},
            schema: {}
          },
          {
            type: 'TextField',
            title:
              'Name of the Site of Special Scientific Interest that your Consent relates to',
            name: 'CgJMOC',
            shortDescription: 'Name of SSSI consent',
            hint: '',
            options: {
              required: true
            },
            schema: {},
            id: '723a7f87-a790-4508-bb01-7b1b8be9755a'
          },
          {
            type: 'TextField',
            title: 'Provide the full name of the Consent holder',
            name: 'XVjExf',
            shortDescription: 'Consent holder',
            hint: '',
            options: {
              required: true
            },
            schema: {},
            id: '76eebc1c-97f3-46e3-8f25-58e58b0e50cf'
          },
          {
            type: 'DatePartsField',
            title: 'Specify the date the Consent was issued',
            name: 'lGDOPb',
            shortDescription: 'Date consent issued',
            hint: '',
            options: {
              required: true
            },
            schema: {},
            id: '0fdd969c-787d-4b46-8e72-ddab9a0a13e0'
          },
          {
            type: 'DatePartsField',
            title: 'Specify the date the Consent will expire',
            name: 'QzpDLr',
            shortDescription: 'Consent expiry date',
            hint: '',
            options: {
              required: false
            },
            schema: {},
            id: '901f6117-679b-4c0c-9a39-419174c8c957'
          },
          {
            type: 'TextField',
            title: 'What is the file reference number on your consent?',
            name: 'VzlKmc',
            shortDescription: 'File reference number',
            hint: '',
            options: {
              required: false
            },
            schema: {},
            id: '172a733e-f404-4bd8-8002-90951647421c'
          },
          {
            type: 'NumberField',
            title: 'What is the common pheasant upper limit?',
            name: 'zHYPDZ',
            shortDescription: 'Common pheasant Limit',
            hint: 'Do not answer if the upper limit only relates to red-legged partridge',
            options: {
              required: false
            },
            schema: {},
            id: 'd312d6e9-0ddd-4533-9f29-7a8789087f82'
          },
          {
            type: 'NumberField',
            title: 'What is the red-legged partridge upper limit?',
            name: 'ZQChjA',
            shortDescription: 'Red-legged partridge limit',
            hint: 'Do not answer if your upper limit only relates to common pheasant',
            options: {
              required: false
            },
            schema: {},
            id: 'f6a2ef6c-d581-4859-9825-9f60cb779c78'
          }
        ],
        next: [],
        id: '5ed45fc5-0864-470a-abab-df3ce877d362',
        condition: '31c55b79-5788-4a81-9b4e-101aca42ca55',
        controller: 'RepeatPageController',
        repeat: {
          options: {
            name: 'hldeya',
            title: 'Consent details'
          },
          schema: {
            min: 1,
            max: 25
          }
        }
      },
      {
        id: '449a45f6-4541-4a46-91bd-8b8931b07b50',
        title: 'Summary',
        path: '/summary',
        controller: 'SummaryPageController',
        next: [],
        components: [
          {
            id: '296c7797-6c06-4905-924a-f0cf0e5f7631',
            type: 'Markdown',
            content:
              "By clicking 'accept and send' you declare that you have read and understood:\r\n\r\n* the [Natural England Wildlife Licensing privacy notice](\thttps://www.gov.uk/government/publications/natural-england-privacy-notices/wildlife-licensing-privacy-notice)\r\n* that I will allow Natural England to inspect the work described in this application\r\n* the information I have given is correct, to the best of my knowledge",
            options: {},
            schema: {}
          }
        ]
      }
    ],
    conditions: [
      {
        items: [
          {
            id: 'ff8277fd-e6b9-4608-b195-10e0b27df48b',
            componentId: '4d87b181-fd19-40cd-af38-3f451c355593',
            operator: 'is',
            value: {
              itemId: '35ae6e3d-25e5-4194-b4a6-ea456b7b7da9',
              listId: 'ae5c549c-bb43-4fc8-8f9f-3bc611d018fc'
            },
            type: 'ListItemRef'
          }
        ],
        displayName: 'Consent Held',
        id: '31c55b79-5788-4a81-9b4e-101aca42ca55'
      },
      {
        items: [
          {
            id: 'e0be34ee-bc50-4821-8c25-a8a66181ec3f',
            componentId: 'd7a96e13-262c-4877-8bac-15545e13996d',
            operator: 'is',
            value: false,
            type: 'BooleanValue'
          }
        ],
        displayName: 'Not reporting for GL43',
        id: '750b8d68-5db6-468f-b7a9-7e7cadf47d01'
      }
    ],
    sections: [],
    lists: [
      {
        name: 'SaJEER',
        title: 'List for question hbgKUe',
        type: 'string',
        items: [
          {
            id: '09f97fbf-10d3-4a1a-9b10-d00f22cdeba8',
            text: 'Within the boundary of the SAC',
            value: 'Within the boundary of a SAC'
          },
          {
            id: 'c505ce04-4a80-4f88-a0bb-543dbf0f6931',
            text: 'Within the 500m buffer zone of the SAC',
            value: 'Within the 500m buffer zone of the SAC'
          }
        ],
        id: '752eed73-98c2-486d-aa7f-a36f301b3375'
      },
      {
        name: 'yCJDHM',
        title: 'List for question KKwezM',
        type: 'string',
        items: [
          {
            id: 'd01b002f-a069-4a65-ba30-0265735c1ece',
            text: 'Common pheasant',
            value: 'Common pheasant'
          },
          {
            id: 'ba0c4a18-64c1-48c5-b8ec-3928c4048582',
            text: 'Red-legged partridge',
            value: 'Red-legged partridge'
          }
        ],
        id: 'b03b1940-463b-4df6-a6f4-ac724e824b68'
      },
      {
        name: 'uZQjKl',
        title: 'List for question AFJERx',
        type: 'string',
        items: [
          {
            id: 'a518705a-a64b-4831-a185-8d81ca7cc6af',
            text: 'Hard release',
            value: 'Hard release'
          },
          {
            id: '228a59bb-0350-4158-9438-095ff18eb67f',
            text: 'Soft release',
            value: 'Soft release'
          }
        ],
        id: '5e67fc3a-a0bc-4ab9-bb9d-92ce9d390d30'
      },
      {
        name: 'xVaqbN',
        title: 'List for question gFHfUy',
        type: 'string',
        items: [
          {
            id: '35ae6e3d-25e5-4194-b4a6-ea456b7b7da9',
            text: 'Yes - I hold Consent',
            value: 'Yes - I hold Consent'
          },
          {
            id: 'eb65ccc1-d55f-461c-bbc5-f0cb610e1178',
            text: 'No - I did not need or hold Consent',
            value: 'No - I did not need or hold Consent'
          }
        ],
        id: 'ae5c549c-bb43-4fc8-8f9f-3bc611d018fc'
      },
      {
        name: 'KiylFT',
        title: 'List for question ubdPEm',
        type: 'string',
        items: [
          {
            id: '813d3398-b3f8-47a5-bcbd-185c416a19f1',
            text: 'Hectares',
            hint: {
              text: 'Ha',
              id: 'd2eb9a96-7c57-4ec8-b725-2a646ddb5c81'
            },
            value: 'Hectares'
          },
          {
            id: '216567cb-1983-4eb0-b0b3-1cb3daf25803',
            text: 'Acres',
            hint: {
              text: 'Ac',
              id: '85f40ea9-4d20-4542-a27b-9cb6de199699'
            },
            value: 'Acres'
          },
          {
            id: '622e756e-f99d-43d7-93e4-eb8e4d04cc4b',
            text: 'Kilometres Squared',
            hint: {
              text: 'Km2',
              id: '55d356f5-2e1b-426c-91b9-a7af282025a5'
            },
            value: 'Kilometres Squared'
          },
          {
            id: 'bd58e29c-b181-4df9-bb34-4229b7308d3a',
            text: 'Metres Squared',
            hint: {
              text: 'm2',
              id: '27940752-67c2-4c67-a5d5-03c9aa529856'
            },
            value: 'Metres Squared'
          },
          {
            id: 'adf6bc02-abba-44fe-aa6b-d2f6a4f5012a',
            text: 'Square Feet',
            hint: {
              text: 'Ft2',
              id: '3f5c38ac-8b9e-4ac5-8304-7bddad8b2f15'
            },
            value: 'Square Feet'
          }
        ],
        id: '942b6ded-d746-480d-a845-d5c6ae166193'
      }
    ]
  }

  // // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  // if (!managerUrl) {
  //   //  TS / eslint conflict
  //   throw new Error('Missing MANAGER_URL')
  // }

  // const statusPath = formStatus === FormStatus.Draft ? FormStatus.Draft : ''
  // const formUrl =
  //   versionNumber !== undefined
  //     ? new URL(
  //         `/forms/${formId}/versions/${versionNumber}/definition`,
  //         managerUrl
  //       )
  //     : new URL(`/forms/${formId}/definition/${statusPath}`, managerUrl)

  // const { body } = await getJson(formUrl)

  // return body
}

/**
 * @import { FormDefinition } from '@defra/forms-model'
 */

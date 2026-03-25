import { FormAdapterSubmissionSchemaVersion } from '@defra/forms-engine-plugin/engine/types/enums.js'
import { Engine, FormStatus, SchemaVersion } from '@defra/forms-model'
import {
  buildCheckboxComponent,
  buildDateComponent,
  buildDefinition,
  buildFileUploadComponent,
  buildFileUploadPage,
  buildGeospatialFieldComponent,
  buildList,
  buildListItem,
  buildMonthYearFieldComponent,
  buildMultilineTextFieldComponent,
  buildNumberFieldComponent,
  buildQuestionPage,
  buildRadioComponent,
  buildRepeaterPage,
  buildSummaryPage,
  buildTextFieldComponent,
  buildUkAddressFieldComponent
} from '@defra/forms-model/stubs'

import {
  buildFormAdapterSubmissionMessage,
  buildFormAdapterSubmissionMessageData
} from '~/src/service/__stubs__/event-builders.js'

export const FORM_ID = '68aedbd12d36db797aa64454'

export const exampleNotifyFormDefinition = buildDefinition({
  name: 'Example notify form',
  engine: Engine.V2,
  schema: SchemaVersion.V2,
  startPage: '/summary',
  pages: [
    buildQuestionPage({
      title: '',
      path: '/what-is-your-name',
      components: [
        buildTextFieldComponent({
          title: 'What is your name?',
          name: 'JHCHVE',
          shortDescription: 'Your name',
          hint: '',
          options: {
            required: true
          },
          id: 'b2e4a0f5-eb78-4faf-a56d-cfe2462405e9'
        }),
        buildTextFieldComponent({
          title: 'Additional details',
          name: 'ADDDTS',
          shortDescription: 'Additional details',
          options: {
            required: false
          },
          id: '3d62312b-3d54-4654-9b4a-5c0feab47852'
        })
      ],
      id: '3b6baff0-e694-428b-9823-63799c5f730a'
    }),
    buildQuestionPage({
      title: '',
      path: '/what-is-your-address',
      components: [
        buildUkAddressFieldComponent({
          title: 'What is your address?',
          name: 'hTFiWF',
          shortDescription: 'Your address',
          hint: '',
          options: {
            required: true
          },
          id: '61832544-01c4-4929-b45f-acf0a16d048b'
        })
      ],
      id: 'ecc7e7af-1276-42d5-869f-5626abb20e25'
    }),
    buildQuestionPage({
      title: '',
      path: '/what-is-your-date-of-birth',
      components: [
        buildDateComponent({
          title: 'What is your date of birth?',
          name: 'zznFWF',
          shortDescription: 'Your date of birth',
          hint: '',
          options: {
            required: true
          },
          id: '7fabac3b-ce13-45ed-8375-4b4a1d5aa4c8'
        })
      ],
      id: 'f19eb7f8-efaf-4a82-8ae1-b76cb893f967'
    }),
    buildQuestionPage({
      title: '',
      path: '/what-month-is-it',
      components: [
        buildMonthYearFieldComponent({
          title: 'What month is it?',
          name: 'KGSRJU',
          shortDescription: 'This month',
          hint: '',
          options: {
            required: true
          },
          id: '530e5411-8a95-4f7e-aec3-5a9f34bc947a'
        })
      ],
      id: '111680c2-0137-483f-81bb-6d475274acd7'
    }),
    buildRepeaterPage({
      title: '',
      path: '/what-is-the-team-members-name',
      components: [
        buildTextFieldComponent({
          title: "What is the team member's name?",
          name: 'repeaterComponentName',
          shortDescription: "Team member's name",
          hint: '',
          options: {
            required: true
          },
          id: '32d6f10b-9a9e-4703-8452-dcb554ebf515'
        }),
        buildDateComponent({
          title: "What is the team member's date of birth?",
          name: 'repeaterComponentDate',
          shortDescription: "Team member's date of birth",
          hint: '',
          options: {
            required: true
          },
          id: 'f4e2a1b3-2d0e-4e2f-8f3a-2c3e1c9b5e5c'
        })
      ],
      id: 'f227fb10-dcc8-4d49-9340-2fb138c642d9',
      repeat: {
        options: {
          name: 'repeaterOptionName',
          title: 'Team Member'
        },
        schema: {
          min: 2,
          max: 6
        }
      }
    }),
    buildQuestionPage({
      title: '',
      path: '/who-are-your-favourite-lotr-characters',
      components: [
        buildCheckboxComponent({
          title: 'Who are your favourite LotR characters?',
          name: 'hVcHQv',
          shortDescription: 'Your favourite LotR characters',
          hint: '',
          options: {
            required: true
          },
          list: '89dc874e-5f22-4c9e-9f7c-ee614ef5a3fe',
          id: '9c17ecd9-0799-4100-a338-990fbfdca003'
        })
      ],
      id: '50c33245-5534-4ed8-9b7a-47a3bece952d'
    }),
    buildFileUploadPage({
      title: '',
      path: '/please-add-supporting-evidence',
      components: [
        buildFileUploadComponent({
          title: 'Please add supporting evidence',
          name: 'IWEgMu',
          shortDescription: 'Supporting evidence',
          hint: '',
          options: {
            required: true,
            accept: 'application/pdf'
          },
          id: 'cbaa6e34-8ac7-463c-bc92-7ed5099772ae'
        })
      ],
      id: '2ed8aef4-f559-46e6-8beb-767c92e5f36d'
    }),
    buildQuestionPage({
      title: 'Geospatial page',
      path: '/geospatial',
      components: [
        buildGeospatialFieldComponent({
          name: 'geOSpa'
        })
      ],
      id: '85179507-9057-410c-b5d4-0e148eb976d2'
    }),
    buildRepeaterPage({
      title: 'Sites',
      path: '/geospatial-repeater',
      components: [
        buildGeospatialFieldComponent({
          name: 'rXmTGb'
        })
      ],
      id: 'e9016eb6-8436-428b-b5ad-cd5fd8e563c3',
      repeat: {
        options: {
          name: 'gAZbPt',
          title: 'Sites'
        },
        schema: {
          min: 1,
          max: 6
        }
      }
    }),
    buildSummaryPage({
      id: '449a45f6-4541-4a46-91bd-8b8931b07b50',
      title: 'Summary',
      path: '/summary'
    })
  ],
  conditions: [],
  sections: [],
  lists: [
    buildList({
      name: 'wawsKA',
      title: 'List for question hVcHQv',
      type: 'string',
      items: [
        buildListItem({
          id: '307c19bd-71f8-46ec-918e-c9c03f43c19e',
          text: 'Gandalf',
          value: 'Gandalf'
        }),
        buildListItem({
          id: '96136000-3ff8-4a3c-be92-26226b5135c7',
          text: 'Frodo',
          value: 'Frodo'
        }),
        buildListItem({
          id: 'e138ab49-f96d-454f-bab9-8f7a5d83e816',
          text: 'Bilbo',
          value: 'Bilbo'
        }),
        buildListItem({
          id: 'f06eb58e-e73c-45b9-a56f-947546f44d04',
          text: 'Samwise Gamgee',
          value: 'Samwise Gamgee'
        }),
        buildListItem({
          id: '17b20c84-d0a2-41c9-bc55-081c346d9542',
          text: 'Legolas',
          value: 'Legolas'
        }),
        buildListItem({
          id: '4a5461e9-8639-4dc7-8814-729900bfcd87',
          text: 'Gimli',
          value: 'Gimli'
        }),
        buildListItem({
          id: '220cd477-8b77-4d4d-b39f-e5ee63410a97',
          text: 'Aragorn',
          value: 'Aragorn'
        }),
        buildListItem({
          id: '62741a2e-c6dc-4f86-bf5c-76be2fdad4da',
          text: 'Arwena',
          value: 'Arwena'
        }),
        buildListItem({
          id: '35ab5eb8-b390-43ae-b92e-4f53b5b543cf',
          text: 'Éowina',
          value: 'Éowina'
        })
      ],
      id: '89dc874e-5f22-4c9e-9f7c-ee614ef5a3fe'
    })
  ]
})

export const exampleNotifyFormMessage = buildFormAdapterSubmissionMessage({
  messageId: '1668fba2-386c-4e2e-a348-a241e4193d08',
  recordCreatedAt: new Date('2025-08-26'),
  meta: {
    schemaVersion: FormAdapterSubmissionSchemaVersion.V1,
    timestamp: new Date('2025-08-28T11:01:59.347Z'),
    formName: 'Example notify form',
    formId: '68aedbd12d36db797aa64454',
    formSlug: 'example-notify-form',
    status: FormStatus.Live,
    isPreview: false,
    notificationEmail: 'name@example.gov.uk',
    referenceNumber: '874-C7C-D60'
  },
  data: buildFormAdapterSubmissionMessageData({
    main: {
      hTFiWF: {
        addressLine1: '1 Anywhere Street',
        town: 'Anywhereville',
        county: 'Anywhereshire',
        postcode: 'AN1 2WH'
      },
      zznFWF: { day: 1, month: 1, year: 2000 },
      KGSRJU: { month: 8, year: 2025 },
      hVcHQv: ['Gandalf', 'Frodo'],
      JHCHVE: 'Someone', // moved from first position to test ordering,
      ADDDTS: null,
      geOSpa: [
        {
          id: '4eba054d-43ad-47a7-9992-186f0c804c99',
          type: 'Feature',
          properties: {
            description: 'The quadrangle',
            coordinateGridReference: 'TQ 28989 79667',
            centroidGridReference: 'TQ 29035 79656'
          },
          geometry: {
            coordinates: [
              [
                [-0.14302739537203024, 51.50123314524271],
                [-0.14246620384719222, 51.50069106195494],
                [-0.1416921465718417, 51.50101631270161],
                [-0.14226301381148687, 51.50155839212027],
                [-0.14302739537203024, 51.50123314524271]
              ]
            ],
            type: 'Polygon'
          }
        },
        {
          type: 'Feature',
          properties: {
            description: "St James' Park",
            coordinateGridReference: 'TQ 29684 79849',
            centroidGridReference: 'TQ 29684 79849'
          },
          geometry: {
            type: 'Point',
            coordinates: [-0.13295710945470773, 51.50270750157188]
          },
          id: 'a3d9f35c-a9fb-4e50-80f1-6144ce534e09'
        },
        {
          id: '62ef0bb2-c4ce-4d76-bd26-4f0e7cfe5a41',
          type: 'Feature',
          properties: {
            description: 'Constitution Hill',
            coordinateGridReference: 'TQ 28521 79799',
            centroidGridReference: 'TQ 29042 79725'
          },
          geometry: {
            coordinates: [
              [-0.14971510866865856, 51.50252738875241],
              [-0.14045925603909382, 51.50222886009584],
              [-0.14007559375386336, 51.50201988887275],
              [-0.14007559375386336, 51.501691503585704],
              [-0.1408908761094949, 51.50022866765107]
            ],
            type: 'LineString'
          }
        }
      ]
    },
    repeaters: {
      repeaterOptionName: [
        {
          repeaterComponentName: 'Frodo',
          repeaterComponentDate: { day: 1, month: 1, year: 2000 }
        },
        {
          repeaterComponentName: 'Gandalf',
          repeaterComponentDate: { day: 1, month: 1, year: 2020 }
        }
      ],
      gAZbPt: [
        {
          rXmTGb: [
            {
              type: 'Feature',
              properties: {
                description: 'p',
                coordinateGridReference: 'SD 57403 26671',
                centroidGridReference: 'SD 57403 26671'
              },
              geometry: {
                type: 'Point',
                coordinates: [-2.6471947, 53.7346808]
              },
              id: 'f8930383-fb1f-4f92-bdc2-a7e599e7bff2'
            }
          ]
        }
      ]
    },
    files: {
      IWEgMu: [
        {
          fileName: 'supporting_evidence.pdf',
          fileId: 'ef4863e9-7e9e-40d0-8fea-cf34faf098cd',
          userDownloadLink:
            'http://localhost:3005/file-download/ef4863e9-7e9e-40d0-8fea-cf34faf098cd'
        }
      ]
    }
  }),
  result: {
    files: {
      main: '818d567d-ee05-4a7a-8c49-d5c54fb09b16',
      repeaters: {
        repeaterOptionName: 'e3005cd2-8b1c-4dc4-b2ac-bd1ff73666a9',
        gAZbPt: 'd24a5133-a4cc-4a9a-8453-0a51e123dcd4'
      }
    }
  }
})

export const pizzaFormDefinition = buildDefinition({
  name: 'Repeat form mixed',
  startPage: '/delivery-or-collection',
  pages: [
    buildRepeaterPage({
      title: 'Pizza order',
      path: '/pizza-order',
      repeat: {
        options: {
          name: 'pizzaOrderRepeaterOptionName',
          title: 'Pizza'
        },
        schema: {
          min: 2,
          max: 3
        }
      },
      section: 'food',
      next: [
        {
          path: '/summary'
        }
      ],
      components: [
        buildTextFieldComponent({
          name: 'toppingsRepeaterComponentName',
          title: 'Toppings'
        }),
        buildNumberFieldComponent({
          name: 'quantityRepeaterComponentName',
          title: 'Quantity'
        })
      ]
    }),
    buildQuestionPage({
      title: 'Delivery or collection',
      path: '/delivery-or-collection',
      components: [
        buildRadioComponent({
          name: 'orderTypeQuestionComponentName',
          title: 'How would you like to receive your pizza?',
          shortDescription: 'How you would like to receive your pizza',
          list: 'orderTypeOption'
        })
      ],
      next: [
        {
          path: '/pizza-order'
        }
      ]
    }),
    buildQuestionPage({
      title: 'Multiline Text field',
      path: '/multiline-text-field',
      components: [
        buildMultilineTextFieldComponent({
          title: 'Multiline Text field',
          name: 'multilineTextField'
        }),
        buildMultilineTextFieldComponent({
          title: 'Multiline Text field 2',
          name: 'multilineTextFieldTwo'
        })
      ]
    }),
    buildSummaryPage({
      title: 'Check your answers'
    })
  ],
  sections: [
    {
      name: 'food',
      title: 'Food',
      hideTitle: false
    }
  ],
  lists: [
    buildList({
      name: 'orderTypeOption',
      title: 'Order type',
      type: 'string',
      items: [
        buildListItem({
          text: 'Delivery',
          value: 'delivery'
        }),
        buildListItem({
          text: 'Collection',
          value: 'collection'
        })
      ]
    })
  ]
})

export const pizzaMessage = buildFormAdapterSubmissionMessage({
  messageId: '1668fba2-386c-4e2e-a348-a241e4193d08',
  recordCreatedAt: new Date('2025-08-26'),
  meta: {
    schemaVersion: FormAdapterSubmissionSchemaVersion.V1,
    timestamp: new Date('2025-08-28T11:01:59.347Z'),
    formName: 'Pizza Form',
    formId: FORM_ID,
    formSlug: 'pizza-form',
    status: FormStatus.Live,
    isPreview: false,
    notificationEmail: 'enrique.chase@defra.gov.uk',
    referenceNumber: '874-C7C-D60'
  },
  data: {
    main: {
      orderTypeQuestionComponentName: 'delivery',
      multilineTextField: 'Line 1\r\nLine 2\r\nLine 3',
      multilineTextFieldTwo: 'Line 1\r\n```\r\nLine 2\r\n```\r\nLine 3'
    },
    repeaters: {
      // quantityRepeaterComponentName: [
      //   {
      //     pizzaOrderRepeaterOptionName: 2
      //   },
      //   {
      //     pizzaOrderRepeaterOptionName: 1
      //   }
      // ],
      // toppingsRepeaterComponentName: [
      //   {
      //     pizzaOrderRepeaterOptionName: 'Ham'
      //   },
      //   {
      //     pizzaOrderRepeaterOptionName: 'Pepperoni'
      //   }
      // ]
      pizzaOrderRepeaterOptionName: [
        {
          quantityRepeaterComponentName: 2,
          toppingsRepeaterComponentName: 'Ham'
        },
        {
          quantityRepeaterComponentName: 1,
          toppingsRepeaterComponentName: 'Pepperoni'
        }
      ]
    },
    files: {}
  },
  result: {
    files: {
      main: '00000000-0000-0000-0000-000000000000',
      repeaters: {
        pizzaOrderRepeaterOptionName: '11111111-1111-1111-1111-111111111111'
      }
    }
  }
})

export const geospatialFormDefinition = buildDefinition({
  name: 'Geospatial',
  startPage: '/geospatial',
  pages: [
    buildQuestionPage({
      title: 'Geospatial page',
      path: '/geospatial',
      components: [
        buildGeospatialFieldComponent({
          name: 'GeospatialField'
        })
      ]
    }),
    buildSummaryPage()
  ],
  sections: [],
  lists: []
})

export const geospatialMessage = buildFormAdapterSubmissionMessage({
  messageId: '1668fba2-386c-4e2e-a348-a241e4193d08',
  recordCreatedAt: new Date('2025-08-26'),
  meta: {
    schemaVersion: FormAdapterSubmissionSchemaVersion.V1,
    timestamp: new Date('2025-08-28T11:01:59.347Z'),
    formName: 'Geospatial',
    formId: FORM_ID,
    formSlug: 'geospatial',
    status: FormStatus.Live,
    isPreview: false,
    notificationEmail: 'enrique.chase@defra.gov.uk',
    referenceNumber: '874-C7C-D60'
  },
  data: {
    main: {
      GeospatialField: [
        {
          id: '4eba054d-43ad-47a7-9992-186f0c804c99',
          type: 'Feature',
          properties: {
            description: 'The quadrangle',
            coordinateGridReference: 'TQ 28989 79667',
            centroidGridReference: 'TQ 29035 79656'
          },
          geometry: {
            coordinates: [
              [
                [-0.14302739537203024, 51.50123314524271],
                [-0.14246620384719222, 51.50069106195494],
                [-0.1416921465718417, 51.50101631270161],
                [-0.14226301381148687, 51.50155839212027],
                [-0.14302739537203024, 51.50123314524271]
              ]
            ],
            type: 'Polygon'
          }
        },
        {
          type: 'Feature',
          properties: {
            description: "St James' Park",
            coordinateGridReference: 'TQ 29684 79849',
            centroidGridReference: 'TQ 29684 79849'
          },
          geometry: {
            type: 'Point',
            coordinates: [-0.13295710945470773, 51.50270750157188]
          },
          id: 'a3d9f35c-a9fb-4e50-80f1-6144ce534e09'
        },
        {
          id: '62ef0bb2-c4ce-4d76-bd26-4f0e7cfe5a41',
          type: 'Feature',
          properties: {
            description: 'Constitution Hill',
            coordinateGridReference: 'TQ 28521 79799',
            centroidGridReference: 'TQ 29042 79725'
          },
          geometry: {
            coordinates: [
              [-0.14971510866865856, 51.50252738875241],
              [-0.14045925603909382, 51.50222886009584],
              [-0.14007559375386336, 51.50201988887275],
              [-0.14007559375386336, 51.501691503585704],
              [-0.1408908761094949, 51.50022866765107]
            ],
            type: 'LineString'
          }
        }
      ]
    },
    repeaters: {},
    files: {}
  },
  result: {
    files: {
      main: '00000000-0000-0000-0000-000000000000',
      repeaters: {}
    }
  }
})

import {
  exampleNotifyFormDefinition,
  exampleNotifyFormMessage
} from '~/src/service/mappers/formatters/__stubs__/notify.js'
import { processRepeaterFiles } from '~/src/service/mappers/formatters/human/v2-repeater.js'

jest.mock('nunjucks', () => {
  const environment = {
    addFilter: jest.fn(),
    addGlobal: jest.fn()
  }
  return {
    configure: jest.fn(() => environment)
  }
})
jest.mock('~/src/config/index.js', () => ({
  config: {
    get: jest.fn((key) => {
      if (key === 'designerUrl') return 'http://designer'
      if (key === 'fileExpiryInMonths') return 9
      return 'mock value'
    })
  }
}))
jest.mock('~/src/helpers/logging/logger.js', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn()
  }
}))

describe('v2-repeater', () => {
  describe('processRepeaterFiles', () => {
    it('should skip repeater files with no matching repeater page in the definition', () => {
      const message = {
        ...exampleNotifyFormMessage,
        result: {
          ...exampleNotifyFormMessage.result,
          files: {
            ...exampleNotifyFormMessage.result.files,
            repeaters: {
              repeaterOptionName: 'e3005cd2-8b1c-4dc4-b2ac-bd1ff73666a9',
              // No page in the definition repeats under this name
              deletedRepeaterName: '9a2b6c3d-1e4f-4a5b-8c7d-0e1f2a3b4c5d'
            }
          }
        }
      }

      const componentMap = /** @type {Map<string, string[]>} */ (new Map())

      processRepeaterFiles(message, exampleNotifyFormDefinition, componentMap)

      expect(componentMap.has('deletedRepeaterName')).toBe(false)
      expect([...componentMap.keys()]).toEqual(['repeaterOptionName'])
      expect(componentMap.get('repeaterOptionName')).toEqual([
        '# Team Member responses\n',
        '[Download&nbsp;Team&nbsp;Member&nbsp;responses&nbsp;(CSV)](http://designer/file-download/e3005cd2-8b1c-4dc4-b2ac-bd1ff73666a9)\n',
        '---\n'
      ])
    })
  })
})

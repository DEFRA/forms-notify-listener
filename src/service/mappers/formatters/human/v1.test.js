import { buildDefinition } from '@defra/forms-model/stubs'

import {
  exampleNotifyFormDefinition,
  exampleNotifyFormMessage,
  pizzaFormDefinition,
  pizzaMessage
} from '~/src/service/mappers/formatters/__stubs__/notify.js'
import { getFormatter } from '~/src/service/mappers/formatters/index.js'

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
    get: jest.fn(() => {
      return 'http://designer'
    })
  }
}))

describe('Page controller helpers', () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2025-09-01T00:00:00Z'))
  })
  afterAll(() => {
    jest.useRealTimers()
  })

  it('should return a valid human readable v1 response', () => {
    const definition = buildDefinition({
      ...exampleNotifyFormDefinition,
      output: {
        audience: 'human',
        version: '1'
      }
    })
    const formatter = getFormatter('human', '1')
    let output = formatter(exampleNotifyFormMessage, definition, '1')

    expect(output).toContain(
      '^ For security reasons, the links in this email expire at'
    )
    expect(output).toContain('Example notify form form received at')
    expect(output).toContain('## What is your name?')
    expect(output).toContain('Someone')
    expect(output).toContain('## Additional details')
    expect(output).toContain('## What is your address?')
    expect(output).toContain('1 Anywhere Street')
    expect(output).toContain('Anywhereville')
    expect(output).toContain('Anywhereshire')
    expect(output).toContain('AN1 2WH')
    expect(output).toContain('## What is your date of birth?')
    expect(output).toContain('1 January 2000')
    expect(output).toContain('## What month is it?')
    expect(output).toContain('August 2025')
    expect(output).toContain('## Who are your favourite LotR characters?')
    expect(output).toContain('* Gandalf')
    expect(output).toContain('* Frodo')
    expect(output).toContain('## Team Member')
    expect(output).toContain(
      '[Download Team Member \\(CSV\\)](http://designer/file-download/e3005cd2-8b1c-4dc4-b2ac-bd1ff73666a9)'
    )
    expect(output).toContain('## Please add supporting evidence')
    expect(output).toContain('Uploaded 1 file:')
    expect(output).toContain(
      '* [supporting\\_evidence\\.pdf](http://designer/file-download/ef4863e9-7e9e-40d0-8fea-cf34faf098cd)'
    )

    expect(output).toContain(
      '[Download main form \\(CSV\\)](http://designer/file-download/818d567d-ee05-4a7a-8c49-d5c54fb09b16)'
    )
    output = output.replace(/(12|1):00am/g, '12:00am')
    expect(output).toMatchSnapshot()
  })

  it('should return a valid human readable v1 response 2', () => {
    const definition = buildDefinition({
      ...pizzaFormDefinition,
      output: {
        audience: 'human',
        version: '1'
      }
    })
    const formatter = getFormatter('human', '1')
    let output = formatter(pizzaMessage, definition, '1')
    output = output.replace(/(12|1):00am/g, '12:00am')
    expect(output).toMatchSnapshot()
  })
})

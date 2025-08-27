import { FormStatus } from '@defra/forms-model'
import { buildDefinition } from '@defra/forms-model/stubs'

import { getJson } from '~/src/lib/fetch.js'
import { getFormDefinition } from '~/src/lib/manager.js'
jest.mock('~/src/lib/fetch.js')
jest.mock('~/src/config/index.js', () => ({
  config: {
    get: jest.fn().mockReturnValueOnce('http://forms-manager')
  }
}))

describe('getDefinition', () => {
  it('should get the current definition', async () => {
    const expectedDefinition = buildDefinition()
    const formId = '68a890909ab460290c289409'
    getJson.mockResolvedValueOnce(expectedDefinition)
    const definition = await getFormDefinition(formId, FormStatus.Draft)
    expect(getJson).toHaveBeenCalledWith(
      expect.objectContaining({
        href: 'http://forms-manager/forms/68a890909ab460290c289409/definition/draft'
      })
    )
    expect(definition).toEqual(expectedDefinition)
  })
})

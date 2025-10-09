import { FormStatus } from '@defra/forms-model'
import { buildDefinition, buildMetaData } from '@defra/forms-model/stubs'

import { getJson } from '~/src/lib/fetch.js'
import { getFormDefinition, getFormMetadata } from '~/src/lib/manager.js'
jest.mock('~/src/lib/fetch.js')
jest.mock('~/src/config/index.js', () => ({
  config: {
    get: jest.fn().mockReturnValueOnce('http://forms-manager')
  }
}))

describe('Manager', () => {
  describe('getDefinition', () => {
    it('should get the current definition if draft', async () => {
      const expectedDefinition = buildDefinition()
      const formId = '68a890909ab460290c289409'
      jest
        .mocked(getJson)
        .mockResolvedValueOnce({ response: {}, body: expectedDefinition })
      const definition = await getFormDefinition(
        formId,
        FormStatus.Draft,
        undefined
      )
      expect(getJson).toHaveBeenCalledWith(
        expect.objectContaining({
          href: 'http://forms-manager/forms/68a890909ab460290c289409/definition/draft'
        })
      )
      expect(definition).toEqual(expectedDefinition)
    })

    it('should get the current definition if live', async () => {
      const expectedDefinition = buildDefinition()
      const formId = '68a890909ab460290c289409'
      jest
        .mocked(getJson)
        .mockResolvedValueOnce({ response: {}, body: expectedDefinition })
      const definition = await getFormDefinition(
        formId,
        FormStatus.Live,
        undefined
      )
      expect(getJson).toHaveBeenCalledWith(
        expect.objectContaining({
          href: 'http://forms-manager/forms/68a890909ab460290c289409/definition/'
        })
      )
      expect(definition).toEqual(expectedDefinition)
    })

    it('should get a specific version if version number is provided', async () => {
      const expectedDefinition = buildDefinition()
      const formId = '68a890909ab460290c289409'
      const versionNumber = 3
      jest
        .mocked(getJson)
        .mockResolvedValueOnce({ response: {}, body: expectedDefinition })
      const definition = await getFormDefinition(
        formId,
        FormStatus.Live,
        versionNumber
      )
      expect(getJson).toHaveBeenCalledWith(
        expect.objectContaining({
          href: 'http://forms-manager/forms/68a890909ab460290c289409/versions/3/definition'
        })
      )
      expect(definition).toEqual(expectedDefinition)
    })

    it('should get a specific version with draft status if version number is provided', async () => {
      const expectedDefinition = buildDefinition()
      const formId = '68a890909ab460290c289409'
      const versionNumber = 1
      jest
        .mocked(getJson)
        .mockResolvedValueOnce({ response: {}, body: expectedDefinition })
      const definition = await getFormDefinition(
        formId,
        FormStatus.Draft,
        versionNumber
      )
      expect(getJson).toHaveBeenCalledWith(
        expect.objectContaining({
          href: 'http://forms-manager/forms/68a890909ab460290c289409/versions/1/definition'
        })
      )
      expect(definition).toEqual(expectedDefinition)
    })

    it('should handle version number 0 correctly', async () => {
      const expectedDefinition = buildDefinition()
      const formId = '68a890909ab460290c289409'
      const versionNumber = 0
      jest
        .mocked(getJson)
        .mockResolvedValueOnce({ response: {}, body: expectedDefinition })
      const definition = await getFormDefinition(
        formId,
        FormStatus.Live,
        versionNumber
      )
      expect(getJson).toHaveBeenCalledWith(
        expect.objectContaining({
          href: 'http://forms-manager/forms/68a890909ab460290c289409/versions/0/definition'
        })
      )
      expect(definition).toEqual(expectedDefinition)
    })

    it('should throw if no manager url set', async () => {
      const expectedDefinition = buildDefinition()
      const formId = '68a890909ab460290c289409'
      jest
        .mocked(getJson)
        .mockResolvedValueOnce({ response: {}, body: expectedDefinition })
      const definition = await getFormDefinition(
        formId,
        FormStatus.Draft,
        undefined
      )
      expect(getJson).toHaveBeenCalledWith(
        expect.objectContaining({
          href: 'http://forms-manager/forms/68a890909ab460290c289409/definition/draft'
        })
      )
      expect(definition).toEqual(expectedDefinition)
    })
  })

  describe('getMetadata', () => {
    it('should get the metadata', async () => {
      const expectedMetadata = buildMetaData()
      const formId = '68a890909ab460290c289409'
      jest
        .mocked(getJson)
        .mockResolvedValueOnce({ response: {}, body: expectedMetadata })
      const metadata = await getFormMetadata(formId)
      expect(getJson).toHaveBeenCalledWith(
        expect.objectContaining({
          href: 'http://forms-manager/forms/68a890909ab460290c289409'
        })
      )
      expect(metadata).toEqual(expectedMetadata)
    })
  })
})

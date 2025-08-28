import { formatter as formatHumanV1 } from '~/src/service/mappers/formatters/human/v1.js'
import { getFormatter } from '~/src/service/mappers/formatters/index.js'

describe('Page controller helpers', () => {
  it('should return a valid formatter if it exists', () => {
    const formatter = getFormatter('human', '1')
    expect(formatter).toBe(formatHumanV1)
  })

  it("should return an error if the audience doesn't exist", () => {
    expect(() => getFormatter('foobar', '1')).toThrow('Unknown audience')
  })

  it("should return an error if the version doesn't exist", () => {
    expect(() => getFormatter('human', '9999')).toThrow('Unknown version')
  })
})

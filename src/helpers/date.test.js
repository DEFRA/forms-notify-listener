import { format } from '~/src/helpers/date.js'

describe('date', () => {
  it('formats the date in the correct timezone', () => {
    const date = new Date('2025-09-26T16:23:52.772Z')

    expect(format(date, 'h:mmaaa')).toBe('5:23pm')
  })
})

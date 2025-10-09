import { buildMetaData } from '@defra/forms-model/stubs'

import { getUserConfirmationEmailBody } from '~/src/service/mappers/user-confirmation.js'

describe('user-confirmation', () => {
  test('should handle general email content', () => {
    const formName = 'My Form Name'
    const submissionDate = new Date('2025-11-04T14:21:35+00:00')
    const metadata = buildMetaData({
      submissionGuidance: 'Some submission guidance'
    })
    expect(
      getUserConfirmationEmailBody(formName, submissionDate, metadata)
    ).toBe(
      `
# We have your form
We received your form submission for &lsquo;My Form Name&rsquo; on 2:21pm on Tuesday 4 November 2025.

## What happens next
Some submission guidance

## Get help
Do not reply to this emall. We do not monitor reples to this email address.

From Defra
`
    )
  })

  test('should handle time shift - plus 1 hour', () => {
    const formName = 'My Form Name'
    const submissionDate = new Date('2025-11-04T14:21:35+01:00')
    const metadata = buildMetaData({
      submissionGuidance: 'Some submission guidance'
    })
    expect(
      getUserConfirmationEmailBody(formName, submissionDate, metadata)
    ).toContain(' on 1:21pm on Tuesday 4 November 2025.')
  })

  test('should handle time shift - plus 1 hour in BST', () => {
    const formName = 'My Form Name'
    const submissionDate = new Date('2025-05-04T14:21:35+01:00')
    const metadata = buildMetaData({
      submissionGuidance: 'Some submission guidance'
    })
    expect(
      getUserConfirmationEmailBody(formName, submissionDate, metadata)
    ).toContain(' on 2:21pm on Sunday 4 May 2025.')
  })

  test('should handle contact details', () => {
    const formName = 'My Form Name'
    const submissionDate = new Date('2025-11-04T14:21:35+00:00')
    const metadata = buildMetaData({
      submissionGuidance: 'Some submission guidance',
      contact: {
        phone: '0121 123456789',
        email: {
          address: 'our-email@test.com',
          responseTime: 'We will respond within 5 working days'
        },
        online: {
          url: 'https://some-online-help.com',
          text: 'This is our online url'
        }
      }
    })
    expect(
      getUserConfirmationEmailBody(formName, submissionDate, metadata)
    ).toBe(
      `
# We have your form
We received your form submission for &lsquo;My Form Name&rsquo; on 2:21pm on Tuesday 4 November 2025.

## What happens next
Some submission guidance

## Get help
0121 123456789

[our-email@test.com](mailto:our-email@test.com)
We will respond within 5 working days

[This is our online url](https://some-online-help.com)

Do not reply to this emall. We do not monitor reples to this email address.

From Defra
`
    )
  })
})

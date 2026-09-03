/**
 * @typedef {('emails' | 'submissions')} NotifyDlq
 */

/**
 * @typedef {object} NotificationMetadata
 * @property {string} source - e.g. 'notify-listener' or 'submission-api'
 * @property {string} reason - e.g. 'save-and-exit' or 'confirmation-email' or 'internal-email'
 * @property {string} [formId] - the guid of the form
 * @property {string} [referenceNumber] - the reference numebr of the form submission
 */

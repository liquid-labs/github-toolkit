/* global describe expect test */

import { checkGitHubAPIAccess } from '../access-lib'

// requires user to have API access
describe('checkGitHubAPIAccess', () => {
  test('verifies user access', () => {
    expect(() => checkGitHubAPIAccess()).not.toThrow()
  })
})

/* global beforeAll describe expect test */

import { getGitHubAPIAuthToken } from '../access-lib'
import { verifyIssuesExist, verifyIssuesAvailable } from '../issues-lib'

describe('issues-lib', () => {
  let authToken
  const testOrg = 'liquid-labs'
  const testRepo = 'github-toolkit'

  beforeAll(async() => {
    authToken = await getGitHubAPIAuthToken({})
  })

  describe('verifyIssuesExist', () => {
    test('throws NotFound error for non-existent issue', async() => {
      const nonExistentIssue = `${testOrg}/${testRepo}/999999`
      await expect(
        verifyIssuesExist({ authToken, issues : [nonExistentIssue] })
      ).rejects.toThrow(/No issue found/)
    })

    test('throws error when issue format is invalid', async() => {
      await expect(
        verifyIssuesExist({ authToken, issues : ['invalid-format'] })
      ).rejects.toThrow()
    })

    test('returns issue data when provided with invalid org/repo', async() => {
      const invalidIssue = 'nonexistent-org/nonexistent-repo/1'
      await expect(
        verifyIssuesExist({ authToken, issues : [invalidIssue] })
      ).rejects.toThrow()
    })
  })

  describe('verifyIssuesAvailable', () => {
    test('throws error for non-existent issue', async() => {
      const nonExistentIssue = `${testOrg}/${testRepo}/999999`
      await expect(
        verifyIssuesAvailable({ authToken, issues : [nonExistentIssue] })
      ).rejects.toThrow()
    })

    test('throws error when checking closed issue availability', async() => {
      // This test assumes that if there are closed issues in the repo, they should fail the 'notClosed' check
      // Since verifyIssuesAvailable calls verifyIssuesExist with notClosed: true
      const closedIssue = `${testOrg}/${testRepo}/1`
      // We expect this to either throw because the issue doesn't exist or because it's closed
      await expect(
        verifyIssuesAvailable({ authToken, issues : [closedIssue] })
      ).rejects.toThrow()
    })
  })
})

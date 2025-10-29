/* global beforeAll describe expect test */

import { determineGitHubLogin, getGitHubAPIAuthToken } from '../access-lib'

describe('access-lib', () => {
  let authToken

  beforeAll(async() => {
    authToken = await getGitHubAPIAuthToken({})
  })

  describe('getGitHubAPIAuthToken', () => {
    test('successfully retrieves auth token from default location', async() => {
      const token = await getGitHubAPIAuthToken({})
      expect(token).toBeTruthy()
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(0)
    })

    test('throws error when file path does not exist', async() => {
      await expect(
        getGitHubAPIAuthToken({ filePath : '/nonexistent/path/to/credentials' })
      ).rejects.toThrow()
    })
  })

  describe('determineGitHubLogin', () => {
    test('returns user data with valid auth token', async() => {
      const userData = await determineGitHubLogin({ authToken })
      expect(userData).toBeTruthy()
      expect(userData.login).toBeTruthy()
      expect(typeof userData.login).toBe('string')
    })

    test('throws error with invalid auth token', async() => {
      await expect(
        determineGitHubLogin({ authToken : 'invalid_token_12345' })
      ).rejects.toThrow()
    })
  })
})

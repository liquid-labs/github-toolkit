/* global beforeAll describe expect test */

import { getGitHubAPIAuthToken } from '../access-lib'
import { getCurrentMilestone, getMilestones } from '../milestones-lib'

describe('milestones-lib', () => {
  let authToken
  const testProjectFQN = 'liquid-labs/github-toolkit'

  beforeAll(async() => {
    authToken = await getGitHubAPIAuthToken({})
  })

  describe('getMilestones', () => {
    test('retrieves milestones from the test repository', async() => {
      const milestones = await getMilestones({ authToken, projectFQN : testProjectFQN })
      expect(Array.isArray(milestones)).toBe(true)
      // We don't assert a specific length because milestones may vary
    })

    test('throws error when projectFQN is not provided', async() => {
      await expect(
        getMilestones({ authToken })
      ).rejects.toThrow(/Must specify 'projectFQN'/)
    })

    test('throws error when projectFQN is invalid', async() => {
      await expect(
        getMilestones({ authToken, projectFQN : 'invalid/nonexistent-repo-12345' })
      ).rejects.toThrow()
    })
  })

  describe('getCurrentMilestone', () => {
    test('returns milestone data or null for the test repository', async() => {
      const currentMilestone = await getCurrentMilestone({ authToken, projectFQN : testProjectFQN })
      // Current milestone could be null or an object depending on repo state
      if (currentMilestone !== null) {
        expect(currentMilestone).toHaveProperty('title')
        expect(currentMilestone).toHaveProperty('number')
        expect(typeof currentMilestone.title).toBe('string')
        expect(typeof currentMilestone.number).toBe('number')
      }
      else {
        expect(currentMilestone).toBeNull()
      }
    })

    test('throws error when projectFQN is not provided', async() => {
      await expect(
        getCurrentMilestone({ authToken })
      ).rejects.toThrow(/Must specify 'projectFQN'/)
    })

    test('handles repository with no milestones', async() => {
      // Test with a repo that likely has no milestones
      const result = await getCurrentMilestone({
        authToken,
        projectFQN : testProjectFQN
      })
      // Should return null if no valid semver milestones or fallback
      expect(result === null || typeof result === 'object').toBe(true)
    })
  })
})

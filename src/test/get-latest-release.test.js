/* global describe expect test */
import { getLatestRelease } from '../get-latest-release'

describe('getLatestRelease', () => {
  test.each([
    [{ githubOwner : 'liquid-labs', project : 'testrepo-prodrelease' }, 'v1.0.0'],
    [{ githubProject : 'liquid-labs/testrepo-prodrelease' }, 'v1.0.0']
  ])('%v -> %s', async(options, expected) => {
    expect(await getLatestRelease(options)).toBe(expected)
  })

  test.each([
    { githubProject : 'liquid-labs/nonexistent-repo' },
    // while these repos exist, the first has no releases and the second only has pre-releases
    { githubOwner : 'liquid-labs', project : 'testrepo-unreleased' },
    { githubOwner : 'liquid-labs', project : 'testrepo-prerelease' }
  ])('%v -> throws an error', async(options) => {
    await expect(getLatestRelease(options)).rejects.toThrow()
  })

  describe('with considerAll option', () => {
    test.each([
      [{ githubOwner : 'liquid-labs', project : 'testrepo-prodrelease', considerAll : true }, 'v1.0.0'],
      [{ githubProject : 'liquid-labs/testrepo-prodrelease', considerAll : true }, 'v1.0.0']
    ])('%v -> %s', async(options, expected) => {
      expect(await getLatestRelease(options)).toBe(expected)
    })

    test('returns pre-release when only pre-releases exist', async() => {
      const result = await getLatestRelease({
        githubOwner : 'liquid-labs',
        project     : 'testrepo-prerelease',
        considerAll : true
      })
      expect(result).toBeTruthy()
      expect(result).toMatch(/^v?\d+\.\d+\.\d+/)
    })

    test.each([
      { githubProject : 'liquid-labs/nonexistent-repo', considerAll : true },
      { githubOwner : 'liquid-labs', project : 'testrepo-unreleased', considerAll : true }
    ])('%v -> throws an error', async(options) => {
      await expect(getLatestRelease(options)).rejects.toThrow()
    })
  })
})

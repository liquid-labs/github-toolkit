/* global describe expect test */
import { determineCurrentRelease } from '../determine-current-release'

describe('determineCurrentRelease', () => {
  test('returns release tag for released project', async() =>
    expect(await determineCurrentRelease({ githubOwner : 'liquid-labs', project : 'testrepo-prodrelease' }))
      .toBe('v1.0.0'))

  test('returns null for unreleased project', async() =>
    expect(await determineCurrentRelease({ githubOwner : 'liquid-labs', project : 'testrepo-unreleased' }))
      .toBe(null))

  test('returns null for pre-released project', async() =>
    expect(await determineCurrentRelease({ githubOwner : 'liquid-labs', project : 'testrepo-prerelease' }))
      .toBe(null))
})

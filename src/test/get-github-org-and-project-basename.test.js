/* global describe expect test */

import { getGitHubOrgAndProjectBasename } from '../get-github-org-and-project-basename'

// requires user to have API access
describe('getGitHubOrgAndProjectBasename', () => {
  test('works with string repositories', () => {
    const packageJSON = { repository : 'git+ssh://git@github.com/acme/foo-bar.git' }
    expect(getGitHubOrgAndProjectBasename({ packageJSON })).toEqual({ org : 'acme', projectBasename : 'foo-bar' })
  })

  test('works with object repositories', () => {
    const packageJSON = { repository : { url : 'git+ssh://git@github.com/acme/foo-bar.git' } }
    expect(getGitHubOrgAndProjectBasename({ packageJSON })).toEqual({ org : 'acme', projectBasename : 'foo-bar' })
  })

  test('returns undefined values when no match', () => {
    const packageJSON = { repository : 'git+ssh://git@anotherplace.com/acme/foo-bar.git' }
    expect(getGitHubOrgAndProjectBasename({ packageJSON })).toEqual({ org : undefined, projectBasename : undefined })
  })

  test('throws error when no match and required', () => {
    const packageJSON = { repository : 'git+ssh://git@anotherplace.com/acme/foo-bar.git' }
    expect(() => getGitHubOrgAndProjectBasename({ packageJSON, require : true })).toThrow()
  })
})

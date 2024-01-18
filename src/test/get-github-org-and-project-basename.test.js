/* global describe expect test */

import { getGitHubOrgAndProjectBasename } from '../get-github-org-and-project-basename'

// requires user to have API access
describe('getGitHubOrgAndProjectBasename', () => {
  test.each([
    ['works with string repositories', 'git+ssh://git@github.com/acme/foo-bar.git', 'acme', 'foo-bar'],
    ['works with object repositories', { url: 'git+ssh://git@github.com/acme/foo-bar.git' }, 'acme', 'foo-bar'],
    ["deals with '.' in the package name", 'git+ssh://git@github.com/acme/acme.com.git', 'acme', 'acme.com'],
    ['returns undefined values when no match', 'git+ssh://git@anotherplace.com/acme/foo-bar.git', undefined, undefined]
  ])('%s', (description, repository, org, projectBasename) => {
    const packageJSON = { repository  }
    expect(getGitHubOrgAndProjectBasename({ packageJSON })).toEqual({ org, projectBasename })
  })

  test('throws error when no match and required', () => {
    const packageJSON = { repository : 'git+ssh://git@anotherplace.com/acme/foo-bar.git' }
    expect(() => getGitHubOrgAndProjectBasename({ packageJSON, require : true })).toThrow()
  })
})

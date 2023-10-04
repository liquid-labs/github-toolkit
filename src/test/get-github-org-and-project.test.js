/* global describe expect test */

import { getGitHubOrgAndProject } from '../get-github-org-and-project'

// requires user to have API access
describe('getGitHubOrgAndProject', () => {
  test('works with string repositories', () => {
    const packageJSON = { repository : 'git+ssh://git@github.com/acme/foo-bar.git' }
    expect(getGitHubOrgAndProject({ packageJSON })).toEqual({ org : 'acme', project : 'foo-bar' })
  })

  test('works with object repositories', () => {
    const packageJSON = { repository : { url : 'git+ssh://git@github.com/acme/foo-bar.git' } }
    expect(getGitHubOrgAndProject({ packageJSON })).toEqual({ org : 'acme', project : 'foo-bar' })
  })

  test('returns undefined values when no match', () => {
    const packageJSON = { repository : 'git+ssh://git@anotherplace.com/acme/foo-bar.git' }
    expect(getGitHubOrgAndProject({ packageJSON })).toEqual({ org : undefined, project : undefined })
  })

  test('throws error when no match and required', () => {
    const packageJSON = { repository : 'git+ssh://git@anotherplace.com/acme/foo-bar.git' }
    expect(() => getGitHubOrgAndProject({ packageJSON, require : true })).toThrow()
  })
})

import { Octocache } from '@liquid-labs/octocache'

import { getGitHubAPIAuthToken } from './access-lib'

/**
 * Returns the latest production release tag, returning null for projects with no release or only pre-release
 * releases.
 *
 * ### Parameters
 *
 * - `authToken`: (opt) the GitHub API authentication token to be used in the request. If none is provided, the
 *   function will attempt to retrieve the token from the standard location using `getGitHubAPIAuthToken()`.
 * - `githubOwner`: the GitHub org or user owning the repository.
 * - `project`: the project/repo base name.
 * - `reporter`: (opt) user action reporter
 */
const determineCurrentRelease = async({ authToken, githubOwner, githubProject, project, reporter }) => {
  reporter?.push('Getting current release information...')
  githubProject = githubProject || githubOwner + '/' + project

  if (authToken === undefined) {
    authToken = await getGitHubAPIAuthToken({ reporter })
  }

  const octocache = new Octocache({ authToken })

  try {
    const results = await octocache.request(`GET /repos/${githubProject}/releases/latest`)
    const currRelease = results.tag_name
    return currRelease
  }
  catch (e) {
    if (e.status === 404) {
      return null
    }
    else {
      throw e
    }
  }
}

export { determineCurrentRelease }

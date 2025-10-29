import { Octocache } from '@liquid-labs/octocache'
import * as semverPlus from '@liquid-labs/semver-plus'

import { getGitHubAPIAuthToken } from './access-lib'

/**
 * Returns the latest production release tag, returning null for projects with no release or only pre-release
 * releases.
 *
 * ### Parameters
 *
 * - `authToken`: (opt) the GitHub API authentication token to be used in the request. If none is provided, the
 *   function will attempt to retrieve the token from the standard location using `getGitHubAPIAuthToken()`.
 * - `considerAll`: (opt) if true, fetches all releases and sorts them using semver to find the latest. If false
 *   (default), uses the GitHub `/releases/latest` endpoint which only returns the latest production release.
 * - `githubOwner`: the GitHub org or user owning the repository.
 * - `project`: the project/repo base name.
 * - `reporter`: (opt) user action reporter
 */
const getLatestRelease = async({ authToken, considerAll = false, githubOwner, githubProject, project, reporter }) => {
  reporter?.push('Getting current release information...')
  githubProject = githubProject || githubOwner + '/' + project

  if (authToken === undefined) {
    authToken = await getGitHubAPIAuthToken({ reporter })
  }

  const octocache = new Octocache({ authToken })

  if (considerAll) {
    const releases = await octocache.request(`GET /repos/${githubProject}/releases`)
    if (releases.length === 0) {
      throw new Error(`No releases found for ${githubProject}`)
    }
    const tagNames = releases.map(release => release.tag_name)
    const sorted = semverPlus.xSort(tagNames)
    return sorted[sorted.length - 1]
  } else {
    const results = await octocache.request(`GET /repos/${githubProject}/releases/latest`)
    const currRelease = results.tag_name
    return currRelease
  }
}

export { getLatestRelease }

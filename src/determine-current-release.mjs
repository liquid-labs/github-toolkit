import { Octocache } from '@liquid-labs/octocache'

import { getGitHubAPIAuthToken } from './access-lib'

const determineCurrentRelease = async({ authToken, githubOwner, project, reporter }) => {
  reporter?.push('Getting current release information...')

  if (authToken === undefined) {
    authToken = await getGitHubAPIAuthToken({ reporter })
  }

  const octocache = new Octocache({ authToken })

  try {
    const results = await octocache.request(`GET /repos/${githubOwner}/${project}/releases/latest`)
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

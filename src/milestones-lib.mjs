import * as fs from 'node:fs/promises'
import * as sysPath from 'node:path'

import { Octocache } from '@liquid-labs/octocache'
import { tryExec } from '@liquid-labs/shell-toolkit'

import { getGitHubAPIAuthToken } from './access-lib'

const preReleaseRe = /([0-9.]+)-([a-z]+)\.\d+$/
const setupGitHubMilestones = async({ model, projectFQN, projectPath, reporter, unpublished }) => {
  reporter.push('Setting up milestones...')

  const milestones = ['backlog']
  let currVersion
  if (unpublished === false) { // i.e., is published
    const result = tryExec(`npm info '${projectFQN}'`, { noThrow : true })
    if (result.code !== 0) {
      reporter.push(`<error>Did not find npm package '${projectFQN}'.<rst>`)
    }
  }
  if (currVersion === undefined) {
    if (projectPath !== undefined) {
      const pkgString = await fs.readFile(sysPath.join(projectPath, 'package.json'))
      const pkgData = JSON.parse(pkgString)
      currVersion = pkgData.version
    }

    if (currVersion === undefined) {
      const packageData = model?.playground?.projects?.[projectFQN].packageJSON
      currVersion = packageData?.version
    }
  }

  const preReleaseMatch = currVersion.match(preReleaseRe)
  if (preReleaseMatch) { // the latest version is a pre-gold version
    const goldVersion = preReleaseMatch[1]
    const currPreType = preReleaseMatch[2]
    if (currPreType === 'alpha') {
      milestones.push(goldVersion + '-beta', goldVersion + '-rc')
    }
    else if (currPreType === 'beta') {
      milestones.push(goldVersion + '-rc')
    }

    milestones.push(goldVersion)
  }
  else {
    // the 'slice' removes the trailing prerelease '-0'
    const goldVersion = tryExec(`semver "${currVersion}" --increment premajor --preid alpha`).stdout.slice(0, -2)
    milestones.push(goldVersion)
  }

  const authToken = await getGitHubAPIAuthToken({ reporter })
  const octocache = new Octocache({ authToken })

  const currMilestoneData = await octocache.request(`GET /repos/${projectFQN}/milestones`)
  const currMilestoneNames = currMilestoneData.map((m) => m.title)

  let milestonesSynced = true
  for (const title of milestones) {
    if (!await ensureMilestone({ currMilestoneNames, reporter, projectFQN, title })) milestonesSynced = false
  }
  reporter.push('Milestone setup complete.')
  if (milestonesSynced === false) {
    reporter.push('<warn>One or more of the milestones may be missing.<rst> Check output above.')
  }
}

const ensureMilestone = async({ currMilestoneNames, reporter, projectFQN, title }) => {
  if (currMilestoneNames.includes(title)) {
    reporter.push(`Milestone '${title}' already present.`)
    return true
  }
  else {
    reporter.push(`Attempting to add milestone '${title}'...`)
    try {
      const authToken = await getGitHubAPIAuthToken({ reporter })
      const octocache = new Octocache({ authToken })

      const resultData = await octocache.request(`POST /repos/${projectFQN}/milestones`, { title })
      const titleOut = resultData.title
      const number = resultData.number
      if (titleOut !== title) {
        reporter.push(`<warn>Milestone title '${titleOut}' (${number}) does not match requested title '${title}' `)
      }
      else {
        reporter.push(`Created milestone '<em>${title}<rst>' (${number}).`)
      }
      return true
    }
    catch (e) {
      reporter.push(`<error>Failed to create milestone '${title}': ${e.message}`, { cause : e })
      return false
    }
  }
}

export { setupGitHubMilestones }

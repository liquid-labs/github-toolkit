import * as fs from 'node:fs/promises'
import * as sysPath from 'node:path'

import { Octocache } from '@liquid-labs/octocache'
import * as semverPlus from '@liquid-labs/semver-plus'
import { tryExec } from '@liquid-labs/shell-toolkit'

import { getGitHubAPIAuthToken } from './access-lib'

/**
 * Retrieves the "current" milestone data or, if not available, then the 'backlog' milestone or null if neither
 * available. The "current milestone" is the milestone with the least semver version or range name.
 */
const getCurrentMilestone = async({
  authToken,
  projectFQN = throw new Error("Must specify 'projectFQN'."),
  reporter
}) => {
  reporter?.push('Looking for current milestone...')
  const openMilestones = await getMilestones({ authToken, projectFQN, reporter })
  const milestoneNames = openMilestones.map(({ title }) => title)
  console.log('milestoneNames:', milestoneNames) // DEBUG
  const versionNames = semverPlus.filterValidVersionOrRange({ input : milestoneNames })

  if (versionNames.length === 0) {
    reporter?.push('Looking for fallback milestone...')
    return getFallbackMilestone(openMilestones)
  }

  const sortedVersions = semverPlus.xSort(versionNames)
  const currVersion = sortedVersions[0]
  reporter?.push(`Found current milestone '${currVersion}'.`)
  const currMilestone = openMilestones.find(({ title }) => title === currVersion)

  return currMilestone
}

/**
 * A helper function for `getCurrentMilestone` which looks for a 'backlog' and returns it, or if none found returns
 * null.
 */
const getFallbackMilestone = (milestones) => {
  if (milestones.length === 0) {
    return null
  }
  const backlog = milestones.find(({ name }) => name === 'backlog')

  return backlog === undefined ? null : backlog
}

const getMilestones = async({
  authToken,
  projectFQN = throw new Error("Must specify 'projectFQN'."),
  reporter,
  state = 'open'
}) => {
  reporter?.push('Retrieving milestones...')

  authToken = authToken || await getGitHubAPIAuthToken({ reporter })
  const octocache = new Octocache({ authToken })

  const currMilestoneData = await octocache.paginate(`GET /repos/${projectFQN}/milestones`)

  return currMilestoneData
}

const preReleaseRe = /([0-9.]+)-([a-z]+)\.\d+$/
const setupGitHubMilestones = async({ pkgJSON, projectFQN, projectPath, reporter, unpublished }) => {
  reporter.push('Setting up milestones...')

  const milestones = ['backlog']
  if (unpublished === false) { // i.e., is published
    const result = tryExec(`npm info '${projectFQN}'`, { noThrow : true })
    if (result.code !== 0) {
      reporter.push(`<error>Did not find npm package '${projectFQN}'.<rst>`)
    }
  }

  let currVersion
  if (pkgJSON !== undefined) {
    currVersion = pkgJSON.version
  }

  if (currVersion === undefined && projectPath !== undefined) {
    const pkgString = await fs.readFile(sysPath.join(projectPath, 'package.json'))
    pkgJSON = JSON.parse(pkgString)
    currVersion = pkgJSON.version
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

  const currMilestoneData = getMilestones({ projectFQN, reporter })
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

export { getCurrentMilestone, getMilestones, setupGitHubMilestones }

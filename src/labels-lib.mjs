import createError from 'http-errors'

import { Octocache } from '@liquid-labs/octocache'

import { getGitHubAPIAuthToken } from './access-lib'

const defaultLabels = [
  {
    name : 'assigned', description : 'This task has been assigned/claimed.', color : 'fbca04'
  },
  {
    name : 'bounty', description : 'This task offers a bounty', color : '209020'
  },
  {
    name : 'breaking', description : 'Breaks compatibility with previous major version.', color : 'd93f0b'
  },
  {
    name : 'bug', description : 'Something is broken', color : 'd73a4a'
  },
  {
    name : 'enhancement', description : 'New feature or request', color : 'a2eeef'
  },
  {
    name : 'good first issue', description : 'Good for newcomers', color : '7050ff'
  },
  {
    name : 'needs spec', description : 'Task not fully specified', color : 'ff4040'
  },
  {
    name : 'optimization', description : 'Non-behavior changing improvement', color : '00dd70'
  },
  {
    name : 'security', description : 'A security related tasks', color : 'ff0000'
  },
  {
    name : 'task', description : 'General task', color : '009900'
  }
]

const setupGitHubLabels = async({ org, noDeleteLabels, projectFQN, reporter }) => {
  reporter.push(`Setting up labels for '${projectFQN}'`)

  const projectLabels = org?.projects?.DEFAULT_LABELS || defaultLabels

  if (projectLabels === defaultLabels) {
    reporter.push('No project labels defined; using default label set...')
  }

  const authToken = await getGitHubAPIAuthToken({ reporter })
  const octocache = new Octocache({ authToken })

  let currLabelData
  let tryCount = 0
  while (currLabelData === undefined && tryCount < 5) {
    if (tryCount > 0) await new Promise(resolve => setTimeout(resolve, 500)) // sleep
    tryCount += 1
    try {
      currLabelData = await octocache.request(`GET /repos/${projectFQN}/labels`)
    }
    catch (e) {
      if (tryCount >= 5) {
        throw createError.InternalServerError(`There was a problem retrieving labels for '${projectFQN}': ${e.message}`, { cause : e })
      }
    }
  }

  const currLabelNames = currLabelData?.map((l) => l.name) || []

  const excessLabelNames = currLabelNames.filter((n) => !projectLabels.some((l) => l.name === n))
  const missinglabels = projectLabels.filter(({ name: n }) => !currLabelNames.some((l) => l === n))

  let labelsSynced = true
  for (const excessLabelName of excessLabelNames) {
    if (noDeleteLabels === true) labelsSynced = false
    else {
      try {
        await octocache.request(`DELETE /repos/${projectFQN}/labels/{label}`, { label: excessLabelName })
        currLabelData.splice(currLabelData.findIndex((l) => l.name === excessLabelName), 1)
      }
      catch (e) {
        reporter.push(`<warn>There was an error removing excess label '${excessLabelName}<rst>: ${e.message}`, { cause: e })
      }
    }
  }

  for (const { name, description, color } of missinglabels) {
    reporter.push(`Adding label '<em>${name}<rst>...`)
    try {
      await octocache.request(`POST /repos/${projectFQN}/labels`, { name, description, color })
      currLabelData.push({ name, description, color })
    }
    catch (e) {
      labelsSynced = false
      reporter.push(`  <warn>There was an issue creating label <code>${name}<rst>: ${e.message}`, { cause : e })
    }
  }

  // all the project labels have been added
  for (const { name, description, color } of projectLabels) {
    const lblData = currLabelData.find((l) => l.name === name)
    const { description: currDesc, color: currColor } = lblData

    if (description !== currDesc || color !== currColor) {
      reporter.push(`Updating definition for label '<em>${name}<rst>'...`)
      try {
        await octocache.request(`PATCH /repos/${projectFQN}/labels/{label}`, { color, description, label: name })
      }
      catch (e) {
        labelsSynced = false
        reporter?.push(`<warn>There was an error updating label '<em>${name}<rst>: ${e.message}`, { cause : e })
      }
    }
  }

  reporter.push('Labels ' + (labelsSynced === true ? '' : 'not ') + 'synchronized.')
}

export { setupGitHubLabels }

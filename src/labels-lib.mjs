import shell from 'shelljs'

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

const setupGitHubLabels = ({ org, noDeleteLabels, projectFQN, reporter }) => {
  reporter.push(`Setting up labebls for '${projectFQN}'`)

  const projectLabels = org?.projects?.DEFAULT_LABELS || defaultLabels

  if (projectLabels === defaultLabels) {
    reporter.push('No project labels defined; using default label set...')
  }

  const currLabelDataString = shell.exec(`hub api "/repos/${projectFQN}/labels"`)
  const currLabelData = JSON.parse(currLabelDataString)
  const currLabelNames = currLabelData?.map((l) => l.name) || []

  const excessLabelNames = currLabelNames.filter((n) => !projectLabels.some((l) => l.name === n))
  const missinglabels = projectLabels.filter(({ name: n }) => !currLabelNames.some((l) => l === n))

  let labelsSynced = true
  for (const excessLabelName of excessLabelNames) {
    if (noDeleteLabels === true) labelsSynced = false
    else {
      const result = shell.exec(`hub api -X DELETE "/repos/${projectFQN}/labels/${excessLabelName}"`)
      if (result.code === 0) currLabelData.splice(currLabelData.findIndex((l) => l.name === excessLabelName), 1)
      else reporter.push(`There was an error removing excess label '${excessLabelName}...`)
    }
  }

  for (const { name, description, color } of missinglabels) {
    reporter.push(`Adding label '<em>${name}<rst>...`)
    const result = shell.exec(`hub api -X POST "/repos/${projectFQN}/labels" \\
        -f name="${name}" \\
        -f description="${description}" \\
        -f color="${color}"`)
    if (result.code === 0) {
      currLabelData.push({ name, description, color })
    }
    else {
      labelsSynced = false
      reporter.push(`  There was an issue creating label '${name}': ${result.stderr}`)
    }
  }

  // all the project labels have been added
  for (const { name, description, color } of projectLabels) {
    const lblData = currLabelData.find((l) => l.name === name)
    const { description: currDesc, color: currColor } = lblData

    if (description !== currDesc || color !== currColor) {
      reporter.push(`Updating definition for label '<em>${name}<rst>'...`)
      const result = shell.exec(`hub api -X PATCH "/repos/${projectFQN}/labels/${name}" \\
        -f description="${description}" \\
        -f color="${color}"`)
      if (result.code !== 0) {
        labelsSynced = false
        reporter.push(`There was an error updating label '<em>${name}<rst>: ${result.stderr}`)
      }
    }
  }

  reporter.push('Labels ' + (labelsSynced === true ? '' : 'not ') + 'synchronized.')
}

export { setupGitHubLabels }

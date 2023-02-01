import * as fs from 'node:fs/promises'
import * as sysPath from 'node:path'

import shell from 'shelljs'

const preReleaseRe = /([0-9.]+)-([a-z]+)\.\d+$/
const setupGitHubMilestones = async({ model, projectName, projectPath, reporter, unpublished }) => {
  reporter.push('Setting up milestones...')

  const milestones = ['backlog']
  let currVersion
  if (unpublished === false) { // i.e., is published
    const result = shell.exec(`npm info '${projectName}'`)
    if (result.code !== 0) {
      reporter.push(`<error>Did not find npm package '${projectName}'.<rst>`)
    }
  }
  if (currVersion === undefined) {
    if (projectPath !== undefined) {
      const pkgString = await fs.readFile(sysPath.join(projectPath, 'package.json'))
      const pkgData = JSON.parse(pkgString)
      currVersion = pkgData.version
    }

    if (currVersion === undefined) {
      const packageData = model?.playground?.projects?.[projectName].packageJSON
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
    const goldVersion = shell.exec(`semver "${currVersion}" --increment premajor --preid alpha`).slice(0, -2)
    milestones.push(goldVersion)
  }

  const currMilestoneString = shell.exec(`hub api "/repos/${projectName}/milestones"`)
  const currMilestaneData = JSON.parse(currMilestoneString)
  const currMilestoneNames = currMilestaneData.map((m) => m.title)

  let milestonesSynced = true
  for (const title of milestones) {
    if (!ensureMilestone({ currMilestoneNames, reporter, projectName, title })) milestonesSynced = false
  }
  reporter.push('Milestone setup complete.')
  if (milestonesSynced === false) {
    reporter.push('<warn>One or more of the milestones may be missing.<rst> Check output above.')
  }
}

const ensureMilestone = ({ currMilestoneNames, reporter, projectName, title }) => {
  if (currMilestoneNames.includes(title)) {
    reporter.push(`Milestone '${title}' already present.`)
    return true
  }
  else {
    reporter.push(`Attempting to add milestone '${title}'...`)
    const result = shell.exec(`hub api -X POST "/repos/${projectName}/milestones" -f title="${title}"`)
    if (result.code === 0) {
      const resultData = JSON.parse(result)
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
    else {
      reporter.push(`<error>Failed to create milestone '${title}': ${result.stderr}`)
      return false
    }
  }
}

export { setupGitHubMilestones }

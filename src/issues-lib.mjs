import createError from 'http-errors'

import { workBranchName } from '@liquid-labs/git-toolkit'
import { Octocache } from '@liquid-labs/octocache'

import { determineGitHubLogin, getGitHubAPIAuthToken } from './access-lib'
import { getCurrentMilestone } from './milestones-lib'

const DEFAULT_CLAIM_LABEL = 'assigned'

const claimIssues = async({
  assignee,
  authToken,
  claimLabel = DEFAULT_CLAIM_LABEL,
  comment/* default below */,
  issues,
  noAutoAssign = false,
  reporter
}) => {
  const octokit = new Octocache({ authToken })
  const workBranch = workBranchName({ primaryIssueID : issues[0] })
  comment = comment || `Work for this issue will begin begin on branch ${workBranch}.`

  if (assignee === undefined && noAutoAssign !== true) {
    reporter?.push('Try to determine assignee from git config...')
    const userData = await determineGitHubLogin({ authToken })
    assignee = userData.login
    reporter?.push('  got: ' + assignee)
  }

  const issuesUpdated = []
  for (const issue of issues) {
    reporter?.push(`Applying assigned label '${issue}'...`)
    const [org, projectBaseName, issueNumber] = issue.split('/')

    try {
      await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/labels', {
        owner        : org,
        repo         : projectBaseName,
        issue_number : issueNumber,
        labels       : [claimLabel]
      })
    }
    catch (e) {
      throwVerifyError({ e, issueId : issue, issuesUpdated, targetName : claimLabel, targetType : 'label' })
    }

    reporter?.push('Checking existing comments...')
    const comments = await octokit.paginate('GET /repos/{owner}/{repo}/issues/{issue_number}/comments', {
      owner        : org,
      repo         : projectBaseName,
      issue_number : issueNumber
    })
    let commentFound = false
    for (const issueComment of comments) {
      if (issueComment.body === comment) {
        reporter?.push('  Found existing comment exact match; skipping adding comment.')
        commentFound = true
        break
      }
    }

    if (commentFound === false) {
      try {
        await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
          owner        : org,
          repo         : projectBaseName,
          issue_number : issueNumber,
          body         : comment
        })
      }
      catch (e) {
        throwVerifyError({ e, issueId : issue, issuesUpdated, targetType : 'comment' })
      }
    }

    if (assignee !== undefined) {
      reporter?.push(`Attempting to assign the issue to GH user: ${assignee}...`)
      try {
        await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/assignees', {
          owner        : org,
          repo         : projectBaseName,
          issue_number : issueNumber,
          assignees    : [assignee]
        })
      }
      catch (e) {
        throwVerifyError({ e, issueId : issue, issuesUpdated, targetName : assignee, targetType : 'assignee' })
      }
    }
  } // for (const issue...)
}

const createIssue = async({
  authToken,
  projectFQN = throw new Error("Must provide 'projectFQN' for createIssue()."),
  title = throw new Error("Must provide issues 'title' for createIssue()."),
  body = throw new Error("Must provide issues 'issueBody' for createIssue()."),
  labels,
  milestoneNumber,
  reporter
}) => {
  reporter?.push(`Creating issue '${title}'...`)

  const options = {
    title, body, labels
  }

  authToken = authToken || await getGitHubAPIAuthToken({ reporter })
  if (milestoneNumber === undefined) {
    const currentMilestone = await getCurrentMilestone({ authToken, projectFQN, reporter })
    options.milestone = currentMilestone.number
  }
  else if (milestoneNumber !== false) {
    options.milestone = milestoneNumber
  }

  const octocache = new Octocache({ authToken })
  const issueData = await octocache.request(`POST /repos/${projectFQN}/issues`, options)

  return issueData
}

const releaseIssues = async({ authToken, comment, issues, noUnassign, noUnlabel, reporter }) => {
  const octocache = new Octocache({ authToken })
  const issuesUpdated = []

  for (const issue of issues) {
    const [org, project, number] = issue.split('/')

    if (noUnassign !== true) {
      reporter?.push(`Getting current assignments for ${issue}...`)
      const assigneesData = await octocache.paginate(`GET /repos/${org}/${project}/assignees`)
      if (assigneesData.length > 0) {
        const assignees = assigneesData.map((a) => a.login)
        reporter?.push(`Removing assignees from issue ${issue}...`)
        await octocache.request('DELETE /repos/{owner}/{repo}/issues/{issue_number}/assignees', {
          owner        : org,
          repo         : project,
          issue_number : number,
          assignees
        })
      }
    }

    if (noUnlabel !== true) {
      reporter?.push(`About to removed 'assigned' label from issue ${issue}...`)
      try {
        await octocache.request('DELETE /repos/{owner}/{repo}/issues/{issue_number}/labels/{name}', {
          owner        : org,
          repo         : project,
          issue_number : number,
          name         : 'assigned'
        })
      }
      catch (e) {
        if (e.status !== 404) throw e
        // else the label is not found, which is OK
      }
    }

    if (comment !== '') {
      if (comment === undefined) {
        comment = 'Issue released.'
      }
      reporter?.push(`About to add comment to issue ${issue}...`)
      try {
        await octocache.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
          owner        : org,
          repo         : project,
          issue_number : number,
          body         : comment
        })
      }
      catch (e) {
        throwVerifyError({ e, issueId : issue, issuesUpdated, targetType : 'comment' })
      }
    }

    issuesUpdated.push(issue)
  } // for (const issue of issues) {...
}

const verifyIssuesExist = async({ authToken, issues, notClosed = false }) => {
  const issueData = []
  const octokit = new Octocache({ authToken })

  for (const issueSpec of issues) {
    const [org, project, number] = issueSpec.split('/')

    let issue
    try {
      issue = await octokit.request(`GET /repos/${org}/${project}/issues/${number}`)
    }
    catch (e) {
      if (e.status === 404) { throw createError.NotFound(`No issue found. Verify issue '${issueSpec}' is valid.`, { cause : e }) }
      else throw e
    }

    if (notClosed === true && issue.state === 'closed') {
      throw createError.BadRequest(`Issue ${issueSpec} is 'closed'.`)
    }

    issueData.push(issue)
  } // for (... issues)
  // all good!
  return issueData
}

const verifyIssuesAvailable = async({
  authToken,
  availableFor,
  claimLabel = DEFAULT_CLAIM_LABEL,
  issues,
  reporter
}) => {
  const issueData = await verifyIssuesExist({ authToken, issues, notClosed : true, reporter })

  // first, we check everything
  for (const issue of issueData) {
    // eslint-disable-next-line prefer-regex-literals
    const issueId = issue.url.replace(new RegExp('.+/([^/]+/[^/]+)/issues/(\\d+)'), '$1-$2')

    if (availableFor !== undefined && issue.assignees.some((a) => a.login === availableFor)) {
      reporter.push(`Issue ${issueId} already assigned to '${availableFor}'.`)
      continue
    }

    if ((issueData.labels || []).some((l) => l.name === claimLabel) || issueData.assignees?.length > 0) {
      reporter.push(`Issue ${issueId} has already been assigned to someone else.`)
      throw createError.BadRequest(`Issue ${issueId} has already been claimed.`)
    }
    reporter.push(`Issue ${issueId} is available.`)
  }

  return false
}

const throwVerifyError = ({ e, issueId, issuesUpdated, targetName, targetType }) => {
  let message = ''
  if (issuesUpdated.length > 0) { message += `Operation partially succeeded and the following issues were updated: ${issuesUpdated.join(', ')}. ` }
  message += `There was an error adding ${targetName ? 'the' : 'a'} ${targetType} ${targetName ? `'${targetName}'` : ''} to ${issueId}: ${e.message}.`

  throw createError.InternalServerError(message, { cause : e })
}

export {
  claimIssues,
  createIssue,
  releaseIssues,
  verifyIssuesExist,
  verifyIssuesAvailable
}

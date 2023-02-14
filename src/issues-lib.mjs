import createError from 'http-errors'

import { workBranchName } from '@liquid-labs/git-toolkit'
import { Octocache } from '@liquid-labs/octocache'

import { determineGitHubLogin } from './access-lib'

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

  const issuesUpated = []
  for (const issue of issues) {
    reporter?.push(`Checking issue '${issue}'...`)
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
      throwVerifyError({ e, issueId : issue, issuesUpated, targetName : claimLabel, targetType : 'label' })
    }

    reporter?.push('Checking existing comments...')
    const comments = await octokit.paginate('GET /repos/{owner}/{repo}/issues/{issue_number}/comments', {
      owner: org,
      repo: projectBaseName,
      issue_number: issueNumber
    })
    let commentFound = false
    for (const issueComment of comments) {
      if (issueComment.body === comment) {
        reporter?.push(`  Found existing comment exact match; skipping adding comment.`)
        commentFound = true
        break;
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
        throwVerifyError({ e, issueId : issue, issuesUpated, targetType : 'comment' })
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
        throwVerifyError({ e, issueId : issue, issuesUpated, targetName : assignee, targetType : 'assignee' })
      }
    }
  } // for (const issue...)
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
      if (e.status === 404)
        throw createError.NotFound(`No issue found. Verify issue '${issueSpec}' is valid.`, { cause: e })
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

const verifyIssuesAvailable = async({ authToken, claimLabel = DEFAULT_CLAIM_LABEL, issues }) => {
  const issueData = await verifyIssuesExist({ authToken, issues, notClosed : true })

  // first, we check everything
  for (const issue of issueData) {
    // eslint-disable-next-line prefer-regex-literals
    const issueId = issue.url.replace(new RegExp('.+/([^/]+/[^/]+)/issues/(\\d+)'), '$1-$2')

    if ((issueData.labels || []).some((l) => l.name === claimLabel || l.assignees?.length > 0)) {
      throw createError.BadRequest(`Issue ${issueId} has already been claimed.`)
    }
  }
}

const throwVerifyError = ({ e, issueId, issuesUpated, targetName, targetType }) => {
  let message = ''
  if (issuesUpated.length > 0) { message += `Operation partially succeeded and the following issues were updated: ${issuesUpated.join(', ')}. ` }
  message += `There was an error adding ${targetName ? 'the' : 'a'} ${targetType} ${targetName ? `'${targetName}'` : ''} to ${issueId}: ${e.message}.`

  throw createError.InternalServerError(message, { cause : e })
}

export {
  claimIssues,
  verifyIssuesExist,
  verifyIssuesAvailable
}

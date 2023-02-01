import * as fs from 'node:fs/promises'

import createError from 'http-errors'
import yaml from 'js-yaml'
import shell from 'shelljs'

const SSH_AGENT_NOT_RUNNING = (pathToPrivKey) =>
  `It looks like the 'ssh-agent' isn't running. Add the following to '.bashrc' or equivalent:

SSHAGENT=/usr/bin/ssh-agent
SSHAGENTARGS="-s"
if [ -z "$SSH_AUTH_SOCK" -a -x "$SSHAGENT" ]; then
    eval \`$SSHAGENT $SSHAGENTARGS\`
    trap "kill $SSH_AGENT_PID" 0
fi

Then add your GitHub key with:

ssh-add ${pathToPrivKey}`
const SSH_ACCESS_FAILURE_MSG = (pathToPrivKey) => 
  `Test for SSH access to GitHub failed. Try to add your GitHub key like:\n\nssh-add ${pathToPrivKey}`

const API_CREDS_DEFAULT_PATH = `${process.env.HOME}/.config/hub`
const API_NO_CREDENTIALS = `There was a problem reading the API credentials at '${API_CREDS_DEFAULT_PATH}'.`
const API_BAD_JSON = `Could not parse API credentials JSON file at '${API_CREDS_DEFAULT_PATH}'.`
const API_NO_TOKEN = `API credentials JSON file at '${API_CREDS_DEFAULT_PATH}' does not define 'oauth_token'.`
const API_BAD_CHECK = 'Failed to execute API authorization check.'
const API_TOKEN_INVALID = 'The access token appears invalid.'

/**
 * Checks GitHub API access.
 * 
 * ### Parameters
 * - `filePath`: path to API token file. The default '~/.config/hub' is used otherwise.`
 */
const checkGitHubAPIAccess = async({ filePath = API_CREDS_DEFAULT_PATH, reporter } = {}) => {
  let creds
  reporter?.push(`Reading creds file: ${filePath}...`)
  try {
    creds = await fs.readFile(filePath)
  }
  catch (e) {
    throw createError.Unauthorized(API_NO_CREDENTIALS, { cause: e })
  }

  try {
    reporter?.push('Loading yaml data...')
    creds = yaml.load(creds)
  }
  catch (e) {
    throw createError.Unauthorized(API_BAD_JSON, { cause: e })
  }

  const apiToken = creds['github.com']?.[0]?.oauth_token
  if (!apiToken) {
    throw createError.Unauthorized(API_NO_TOKEN)
  }

  const apiCheckCmd = `curl -w '%{http_code}' -s -H "Authorization: token ${apiToken}" https://api.github.com/user -o /dev/null`
  reporter?.push('Executing API check...')
  const result = shell.exec(apiCheckCmd)
  if (result.code !== 0) {
    throw createError.InternalServerError(API_BAD_CHECK + ' ' + result.stderr)
  }
  const httpStatus = parseInt(result.stdout)
  if (httpStatus !== 200) {
    throw createError.Unauthorized(API_TOKEN_INVALID)
  }
  reporter?.push('  success!')
  // else, we're good
}

/**
 * Checks SSH-based access to GitHub. This method relies on ssh-agent. In the case of failure, will attempt to 
 * diagnose the specific issue.
 * 
 * ### Parameters
 * - `privKeyPath`: the path to the GitHub privaet key. Setting the parameter does not effect the test, but it is used 
 *   in reporting problems.`
 */
const checkGitHubSSHAccess = ({ privKeyPath, reporter } = {}) => {
  // the expected resut is idiomaticaly 1 because GitHub does not allow terminal access. But if the connection cannot be made, then the exit
  // code is different.
  reporter?.push('Checking SSH access...')
  const command = 'ssh -qT git@github.com 2> /dev/null'
  const result = shell.exec(command)
  if (result.code !== 1) { // let's figure out why
    reporter?.push('  Check failed.')
    const result = shell.exec('pgrep ssh-agent')
    let msg
    if (result.code !== 0) {
      msg = SSH_AGENT_NOT_RUNNING(privKeyPath || '/path/to/private-key')
    }
    else {
      msg = SSH_ACCESS_FAILURE_MSG(privKeyPath || '/path/to/private-key')
    }
    throw createError.Unauthorized(msg)
  }
  reporter?.push('  success!')
  return true
}

export {
  checkGitHubAPIAccess,
  checkGitHubSSHAccess
}

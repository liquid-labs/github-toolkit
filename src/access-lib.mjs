import * as fs from 'node:fs/promises'

import createError from 'http-errors'
import yaml from 'js-yaml'
import shell from 'shelljs'

const SSH_ACCESS_FAILURE_MSG = (pathToPrivKey) => 
  `Test for SSH access to GitHub failed. Try to add your GitHub key like:\n\nssh-add ${pathToPrivKey}`

const API_CREDS_DEFAULT_PATH = `${process.env.HOME}/.config/hub`
const API_NO_CREDENTIALS = `There was a problem reading the API credentials at '${API_CREDS_DEFAULT_PATH}'.`
const API_BAD_JSON = `Could not parse API credentials JSON file at '${API_CREDS_DEFAULT_PATH}'.`
const API_NO_TOKEN = `API credentials JSON file at '${API_CREDS_DEFAULT_PATH}' does not define 'oauth_token'.`
const API_BAD_CHECK = 'Failed to execute API authorization check.'
const API_TOKEN_INVALID = 'The access token appears invalid.'

const checkGitHubAPIAccess = async({ filePath = API_CREDS_DEFAULT_PATH, res, quiet = false }) => {
  let creds
  try {
    creds = await fs.readFile(filePath)
  }
  catch (e) {
    throw createError.Unauthorized(API_NO_CREDENTIALS, { cause: e })
  }

  try {
    creds = yaml.load(creds)
  }
  catch (e) {
    throw createError.Unauthorized(API_BAD_JSON, { cause: e })
  }

  const apiToken = creds['github.com']?.[0]?.oauth_token
  if (!apiToken) {
    throw createError.Unauthorized(API_NO_TOKEN)
  }

  const result = shell.exec(`curl -w '%{http_code}' -s -H "Authorization: token ${apiToken}" https://api.github.com/user -o /dev/null`)
  if (result.code !== 0) {
    throw createError.InternalServiceError(API_BAD_CHECK)
  }
  const httpStatus = parseInt(result.stdout)
  if (httpStatus !== 200) {
    throw createError.Unauthorized(API_TOKEN_INVALID)
  }
  // else, we're good
}

const checkGitHubSSHAccess = ({ privKeyPath, res, quiet = false }) => {
  // the expected resut is idiomaticaly 1 because GitHub does not allow terminal access. But if the connection cannot be made, then the exit
  // code is different.
  const command = privKeyPath
    ? `ssh -o "IdentitiesOnly=yes" -i ${privKeyPath} -qT git@github.com 2> /dev/null`
    : 'ssh -qT git@github.com 2> /dev/null'
  const result = shell.exec(command)
  if (result.code !== 1) {
    throw createError.Unauthorized(SSH_ACCESS_FAILURE_MSG(privKeyPath || '/path/to/private-key'))
  }
  return true
}

export {
  checkGitHubAPIAccess,
  checkGitHubSSHAccess
}

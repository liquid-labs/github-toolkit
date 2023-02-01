import createError from 'http-errors'
import shell from 'shelljs'

const ORIGIN = 'origin'
const MAIN = 'main'

const KNOWN_ORIGINS = [ 'origin', 'upstream' ]
const KNOWN_MAINS = [ 'main', 'master' ]

const determineOriginAndMain = ({ projectPath, reporter }) => {
  reporter?.push(`Fetching latest origin data...`)
  const fetchResult = shell.exec(`cd ${projectPath} && git fetch -p`)
  
  if (fetchResult.code !== 0)
    throw createError(`'git fetch -p' failed at '${projectPath}': ${fetchResult.stderr}.`)

  reporter?.push(`Checking remote branches...`)
  const remoteBranchQuery = shell.exec(`cd ${projectPath} && git branch -r`)
  if (remoteBranchQuery.code !== 0) throw createError(`Could not list remote branches: ${remoteBranchQuery.stderr}`)
  const remoteBranches = remoteBranchQuery.split('\n').map((r) => r.trim().split('/'))

  let origin, main
  for (const [remote, branch] of remoteBranches) {
    if (origin === undefined && KNOWN_ORIGINS.includes(remote)) {
      origin = remote
    }
    else if (origin !== undefined && origin !== remote && KNOWN_ORIGINS.includes(remote)) {
      throw createError(`Found multiple possible origin remotes: ${origin} + ${remote}`)
    }

    if (main === undefined && KNOWN_MAINS.includes(branch) && KNOWN_ORIGINS.includes(remote)) {
      main = branch
    }
    else if (main !== undefined && main !== branch && KNOWN_MAINS.includes(branch) && KNOWN_ORIGINS.includes(remote)) {
      throw createError(`Found multiple possible origin branches: ${main} + ${branch}`)
    }
  }

  reporter?.push(`Determined origin and main branch: ${origin}/${main}.`)

  return [ origin, main ]
}

const regularizeRemote = ({ projectPath, reporter }) => {
  let [ originRemote ] = determineOriginAndMain({ projectPath })
  
  if (originRemote !== ORIGIN) {
    const renameResult = shell.exec(`cd ${projectPath} && git remote rename ${originRemote} ${ORIGIN}`)
    if (renameResult.code !== 0) {
      throw createError.InternalServerError(`Could not rename origin remote from '${originRemote}' to '${ORIGIN}'.`)
    }
    reporter?.push(`Updated remote origin '${originRemote}' to '${ORIGIN}'.`)
    originRemote = ORIGIN
  }
}

const regularizeMainBranch = ({ projectFQN, projectPath, reporter }) => {
  let [ originRemote, mainBranch ] = determineOriginAndMain({ projectPath })

  if (mainBranch !== MAIN) {
    const remoteResult = shell.exec(`cd ${projectPath} && hub api --method POST -H "Accept: application/vnd.github+json" /repos/${projectFQN}/branches/${mainBranch}/rename -f new_name='${MAIN}'`)
    if (remoteResult.code !== 0) {
      throw createError.InternalServerError(`Could not rename remote main branch '${mainBranch}' to '${MAIN}': `
        + remoteResult.stderr)
    }
    reporter?.push(`Renamed remote main branch from '${mainBranch}' to '${MAIN}'.`)

    // Update our understanding of remote branches
    const fetchResult = shell.exec(`cd ${projectPath} && git fetch -p ${originRemote}`)
    if (fetchResult !== 0)
      throw createError(`'git fetch ${originRemote}' failed at '${projectPath}': ${fetchResult.stderr}.`)

    // update local branch
    const branchList = shell.exec(`cd ${projectPath} && git branch -l`)
    if (branchList.code !== 0) throw createError(`Could not list branches at '${projectPath}'.`)
    const branchNames = branchList.split('\n').map((e) => e.trim().replace(/^\*\s*/, ''))
    if (branchNames.includes(MAIN)) reporter.push(`Local branch '${MAIN}' already exists.`)
    else {
      reporter?.push(`About to rename local branch from <code>${mainBranch}<rst> to <code>${MAIN}<rst>...`)
      const localResult = shell.exec(`cd ${projectPath} && git branch -m ${mainBranch} ${MAIN}`)
      if (localResult.code !== 0) {
        throw createError.InternalServerError(`Could not rename main branch from '${mainBranch}' to '${MAIN}': `
          + localResult.stderr)
      }
      reporter?.push(`Renamed local branch '${mainBranch}' to '${MAIN}'.`)
    }

    mainBranch = MAIN

    const trackingResult = shell.exec(`cd ${projectPath} && git branch --set-upstream-to ${originRemote}/${MAIN}`)
    if (trackingResult.code !== 0) {
      throw createError.InternalServerError(`Could not update local branch '${MAIN} to track ${originRemote}/${MAIN}: `
        + trackingResult.stderr)
    }
    reporter?.push(`Updated local main branch '${MAIN}' to track ${originRemote}/${MAIN}'.`)
  }
}

export {
  determineOriginAndMain,
  regularizeRemote,
  regularizeMainBranch
}
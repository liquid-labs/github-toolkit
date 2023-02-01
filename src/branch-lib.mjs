import createError from 'http-errors'
import shell from 'shelljs'

const ORIGIN = 'origin'
const MAIN = 'main'

const determineOriginAndMain = ({ path, reporter }) => {
  const result = shell.exec(`cd ${path} && git rev-parse --abbrev-ref --symbolic-full-name @{u}`)

  if (result.code !== 0) {
    throw createError.BadRequest('Could not determine origin and main: ' + result.stderr)
  }
  const [ origin, main ] = result.split('/')

  if (origin === undefined || main === undefined) {
    throw createError.InternalServerError('Origin remote and main branch could not be determined from output: ' + result.stdout)
  }
  reporter?.push(`Determined origin and main branch: ${origin}/${main}.`)

  return [ origin, main ]
}

const regularizeRemote = ({ path, reporter }) => {
  let [ originRemote, mainBranch ] = determineOriginAndMain({ path })
  
  if (originRemote !== ORIGIN && noUpdateOriginName === false) {
    const renameResult = shell.exec(`cd ${projectPath} && git remote rename ${originRemote} ${ORIGIN}`)
    if (renameResult.code !== 0) {
      throw createError.InternalServerError(`Could not rename origin remote from '${originRemote}' to '${ORIGIN}'.`)
    }
    reporter?.push(`Updated remote origin '${originRemote}' to '${ORIGIN}'.`)
    originRemote = ORIGIN
  }
}

const regularizeMainBranch = ({ path, reporter }) => {
  let [ originRemote, mainBranch ] = determineOriginAndMain({ path })

  if (mainBranch !== MAIN) {
    // update local branch
    const localResult = shell.exec(`cd ${projectPath} && git branch -m ${mainBranch} ${MAIN}`)
    if (localResult.code !== 0) {
      throw createError.InternalServerError(`Could not rename main branch from '${mainBranch}' to '${MAIN}': `
        + localResult.stderr)
    }
    reporter?.push(`Renamed local branch '${mainBranch}' to '${MAIN}'.`)
    
    const remoteResult = shell.exec(`cd ${projectPath} && hub api --method POST -H "Accept: application/vnd.github+json" /repos/${projectName} branches/${mainBranch}/rename -f new_name='${MAIN}'`)
    if (remoteResult.code !== 0) {
      throw createError.InternalServerError(`Could not rename remote main branch '${mainBranch}' to '${MAIN}': `
        + remoteResult.stderr)
    }
    reporter?.push(`Renamed remote main branch from '${mainBranch}' to '${MAIN}'.`)
    mainBranch = MAIN

    const trackingResult = shell.exec(`cd ${projectPath} && git branch --set-upstream ${MAIN} ${originRemote}/${MAIN}`)
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
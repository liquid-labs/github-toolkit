import { determineLocalMain, determineOriginAndMain } from '@liquid-labs/git-toolkit'
import { Octocache } from '@liquid-labs/octocache'
import { tryExec } from '@liquid-labs/shell-toolkit'

const ORIGIN = 'origin'
const MAIN = 'main'

const regularizeRemote = ({ projectPath, reporter }) => {
  let [originRemote] = determineOriginAndMain({ projectPath })

  if (originRemote !== ORIGIN) {
    tryExec(
      `cd ${projectPath} && git remote rename ${originRemote} ${ORIGIN}`,
      { msg : `Could not rename origin remote from '${originRemote}' to '${ORIGIN}'.` }
    )

    reporter?.push(`Updated remote origin '${originRemote}' to '${ORIGIN}'.`)
    originRemote = ORIGIN
  }
}

const regularizeMainBranch = async ({ authToken, projectFQN, projectPath, reporter }) => {
  let [originRemote, mainBranch] = determineOriginAndMain({ projectPath })

  if (mainBranch !== MAIN) {
    const octocache = new Octocache({ authToken })

    reporter?.push(`About to rename branch '${mainBranch}' to '${MAIN}'...`)
    await octocache.request(`POST /repos/${projectFQN}/branches/${mainBranch}/rename`, { new_name : MAIN })
    reporter?.push('   success.')

    // Update our understanding of remote branches
    tryExec(`cd ${projectPath} && git fetch -p ${originRemote}`)
  }
  // update local branch
  const branchList =
    tryExec(`cd ${projectPath} && git branch -l`, { msg : `Could not list branches at '${projectPath}'` }).stdout
  const branchNames = branchList.split('\n').map((e) => e.trim().replace(/^\*\s*/, ''))
  if (branchNames.includes(MAIN)) reporter.push(`Local branch '${MAIN}' already exists.`)
  else {
    const localMain = determineLocalMain({ projectPath })


    reporter?.push(`About to rename local branch from <code>${localMain}<rst> to <code>${MAIN}<rst>...`)
    tryExec(
      `cd ${projectPath} && git branch -m ${localMain} ${MAIN}`,
      { msg : `Could not rename main branch from '${localMain}' to '${MAIN}'.` })
    reporter?.push('  success.')
  }

  mainBranch = MAIN

  tryExec(
    `cd ${projectPath} && git branch --set-upstream-to ${originRemote}/${MAIN}`,
    { msg : `Could not update local branch '${MAIN} to track ${originRemote}/${MAIN}.` }
  )

  reporter?.push(`Updated local main branch '${MAIN}' to track ${originRemote}/${MAIN}'.`)
}

export {
  regularizeRemote,
  regularizeMainBranch
}

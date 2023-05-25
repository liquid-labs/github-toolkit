/* global describe expect test */
import { readFileSync } from 'node:fs'
import * as fsPath from 'node:path'

import { determineCurrentRelease } from '../determine-current-release'

describe('determineCurrentRelease', () => {
  test('retrives this projects current release', async() => {
    const myPkgJSONPath = fsPath.join(__dirname, '..', '..', 'package.json')
    const myPkgJSON = JSON.parse(readFileSync(myPkgJSONPath, { encoding : 'utf8' }))
    const currVersion = myPkgJSON.version
    expect(await determineCurrentRelease({ githubOwner : 'liquid-labs', project : 'github-toolkit' }))
      .toBe('v' + currVersion)
  })
})

const urlRegEx = /github.com[/:]([^/]+)\/(.+?)(?:\.git)?$/ // if ends in '.git', we omit that

const getGitHubOrgAndProjectBasename = ({ packageJSON, require }) => {
  const { repository } = packageJSON

  const url = typeof repository === 'string' ? repository : repository.url

  const [, org, projectBasename] = url.match(urlRegEx) || []

  if (org === undefined && require === true) {
    throw new Error(`Could not extract GitHub org and project from url '${url}'; this may not be a GitHub project.`)
  }

  // TODO: 'project' is depricated
  return { org, projectBasename }
}

export { getGitHubOrgAndProjectBasename }

const urlRegEx = /github.com\/([^/]+)\/([^.]+)/

const getGitHubOrgAndProject = ({ packageJSON, require }) => {
  const { repository } = packageJSON

  const url = typeof repository === 'string' ? repository : repository.url

  const [, org, project] = url.match(urlRegEx) || []

  if (org === undefined && require === true) {
    throw new Error(`Could not extract GitHub org and project from url '${url}'; this may not be a GitHub project.`)
  }

  return { org, project }
}

export { getGitHubOrgAndProject }
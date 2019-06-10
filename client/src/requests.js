import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from 'apollo-boost'
import gql from 'graphql-tag'
import { isLoggedIn, getAccessToken } from './auth'

const endpointURL = 'http://localhost:9000/graphql'

const authLink = new ApolloLink((operation, forward) => {
  if (isLoggedIn()) {
    operation.setContext({
      headers: {
        'authorization': 'Bearer ' + getAccessToken()
      }
    })
  }
  
  return forward(operation)
})

const httpLink = new HttpLink({uri: endpointURL})

const client = new ApolloClient({
  link: ApolloLink.from([authLink, httpLink]),
  cache: new InMemoryCache()
})

const companyQuery = gql`
  query CompanyQuery($id: ID!) {
    company(id: $id) {
      name,
      description,
      jobs {
        id
        title
      }
    }
  }`

const jobDetailFragment = gql`
  fragment JobDetail on Job {
    id,
    title,
    company {
      id,
      name
    }
    description
  }
`

const jobQuery = gql`
  query JobQuery($id: ID!) {
    job(id: $id) {
      ...JobDetail
    }
  }
  ${jobDetailFragment}
`

const jobsQuery = gql`
  query JobsQuery {
    jobs {
      id
      title
      company {
        id,
        name,
      }
    }
  }
`

const mutation = gql`
  mutation CreateJobMutation($input: CreateJobInput) {
    job: createJob(input: $input) {
      ...JobDetail
    }
  }
  ${jobDetailFragment}
`

const loadJobs = async () => {
  const { data: {jobs}} = await client.query({query: jobsQuery, fetchPolicy: 'no-cache'})
  return jobs
}

const loadJob = async (id) => {
  const { data: {job}} = await client.query({query: jobQuery, variables: {id}})
  return job
}

const loadCompany = async (id) => {
  const {data: {company}} = await client.query({query: companyQuery, variables: {id}})
  return company
}

const createJob = async (input) => {
  const {data: {job}} = await client.mutate({
    mutation, 
    variables: {input},
    update: (cache, { data }) => {
      cache.writeQuery({
        query: jobQuery, 
        variables: {id: data.job.id},
        data
      })
    }
  })

  return job
}

export { loadJobs, loadJob, loadCompany, createJob}
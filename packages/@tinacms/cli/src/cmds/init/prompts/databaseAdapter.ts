import prompts from 'prompts'

import type { Config, PromptDatabaseAdapter } from './types'
import type { Framework } from '../'

const supportedDatabaseAdapters: {
  'upstash-redis': PromptDatabaseAdapter
  mongodb: PromptDatabaseAdapter
  other: PromptDatabaseAdapter
} = {
  ['upstash-redis']: {
    databaseAdapterClassText: `new RedisLevel({
        namespace: branch,
        redis: new Redis({
          url: process.env.KV_REST_API_URL || 'http://localhost:8079',
          token: process.env.KV_REST_API_TOKEN || 'example_token',
        }),
        debug: process.env.DEBUG === 'true' || false,
      })`,
    imports: [
      {
        imported: ['RedisLevel'],
        from: 'upstash-redis-level',
        packageName: 'upstash-redis-level',
      },
      {
        imported: ['Redis'],
        from: '@upstash/redis',
        packageName: '@upstash/redis',
      },
    ],
  },
  mongodb: {
    databaseAdapterClassText: `new MongodbLevel<string, Record<string, any>>({
          // If you are not using branches you could pass a static collection name. ie: "tinacms"
          collectionName: \`tinacms-\${branch}\`,
          dbName: 'tinacms',
          mongoUri: process.env.MONGODB_URI as string,
        })`,
    imports: [
      {
        from: 'mongodb-level',
        imported: ['MongodbLevel'],
        packageName: 'mongodb-level',
      },
    ],
  },
  other: {
    databaseAdapterClassText: '',
  },
}

const databaseAdapterUpdateConfig: {
  [key in keyof typeof supportedDatabaseAdapters]: ({
    config,
  }: {
    config: Config
  }) => Promise<void>
} = {
  other: async (_args) => {},
  mongodb: async ({ config }) => {
    const result = await prompts([
      {
        name: 'mongoDBUri',
        type: 'text',
        message: `What is the MongoDB URI(Hit enter to skip and set up yourself later)`,
        initial: process.env.MONGODB_URI,
      },
    ])
    config.envVars.push({
      key: 'MONGODB_URI',
      value: result.mongoDBUri,
    })
  },
  'upstash-redis': async ({ config }) => {
    const result = await prompts([
      {
        name: 'kvRestApiUrl',
        type: 'text',
        message: `What is the KV (Redis) Rest API URL? (Hit enter to skip and set up yourself later)`,
        initial: process.env.KV_REST_API_URL,
      },
      {
        name: 'kvRestApiToken',
        type: 'text',
        message: `What is the KV (Redis) Rest API Token? (Hit enter to skip and set up yourself later)`,
        initial: process.env.KV_REST_API_TOKEN,
      },
    ])
    config.envVars.push(
      {
        key: 'KV_REST_API_URL',
        value: result.kvRestApiUrl,
      },
      {
        key: 'KV_REST_API_TOKEN',
        value: result.kvRestApiToken,
      }
    )
  },
}

export const chooseDatabaseAdapter = async ({
  framework,
  config,
}: {
  config: Config
  framework: Framework
}) => {
  const answers = await prompts([
    {
      name: 'dataLayerAdapter',
      message: 'Select a self-hosted Database Adapter',
      type: 'select',
      choices: [
        {
          title: 'Vercel KV/Upstash Redis',
          value: 'upstash-redis',
        },
        {
          title: 'MongoDB',
          value: 'mongodb',
        },
        // {
        //   title: "I'll create my own database adapter",
        //   value: 'other',
        // },
      ],
    },
  ])
  if (typeof answers.dataLayerAdapter === 'undefined') {
    throw new Error('Database adapter is required')
  }
  const chosen = answers.dataLayerAdapter as
    | 'upstash-redis'
    | 'mongodb'
    | 'other'

  await databaseAdapterUpdateConfig[chosen]({ config })

  return supportedDatabaseAdapters[chosen]
}
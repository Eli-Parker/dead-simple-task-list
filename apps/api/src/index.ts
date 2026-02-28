import 'dotenv/config'

const port = Number(process.env.PORT ?? 4000)

function main(): void {
  // Scaffold only: GraphQL server/resolvers will be added later.
  console.log(`[api] starter app is set up. Configure server logic in src/index.ts (PORT=${port}).`)
}

main()

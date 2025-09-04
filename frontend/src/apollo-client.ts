import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client";

// Get subgraph URL from environment variables
const SUBGRAPH_URL = import.meta.env.VITE_SUBGRAPH_URL;

if (!SUBGRAPH_URL) {
  throw new Error(
    "VITE_SUBGRAPH_URL environment variable is not set. Please create a .env file based on .env.example",
  );
}

const httpLink = createHttpLink({
  uri: SUBGRAPH_URL,
});

export const apolloClient = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
});

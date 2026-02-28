import { DateTimeScalar } from "../../scalars/date-time.scalar.js";
import { mutationResolvers } from "./mutation.resolver.js";
import { objectResolvers } from "./object.resolver.js";
import { queryResolvers } from "./query.resolver.js";

export const resolvers = {
  DateTime: DateTimeScalar.scalar,
  Query: queryResolvers,
  Mutation: mutationResolvers,
  ...objectResolvers,
};

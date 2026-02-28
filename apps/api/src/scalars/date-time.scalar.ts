import { GraphQLScalarType, Kind, type ValueNode } from "graphql";

export class DateTimeScalar {
  static parseISO(value: unknown): Date {
    if (typeof value !== "string") {
      throw new TypeError("DateTime must be a string in ISO 8601 format");
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new TypeError("DateTime cannot represent an invalid date");
    }

    return date;
  }

  static serialize(value: unknown): string {
    const date = value instanceof Date ? value : DateTimeScalar.parseISO(value);
    return date.toISOString();
  }

  static parseValue(value: unknown): Date {
    return DateTimeScalar.parseISO(value);
  }

  static parseLiteral(ast: ValueNode): Date {
    if (ast.kind !== Kind.STRING) {
      throw new TypeError("DateTime must be a string in ISO 8601 format");
    }

    return DateTimeScalar.parseISO(ast.value);
  }

  static readonly scalar = new GraphQLScalarType({
    name: "DateTime",
    description: "ISO 8601 datetime string",
    serialize: DateTimeScalar.serialize,
    parseValue: DateTimeScalar.parseValue,
    parseLiteral: DateTimeScalar.parseLiteral,
  });
}

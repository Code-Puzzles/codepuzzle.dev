import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

let _cachedClient: DynamoDBDocumentClient | undefined = undefined;

export const getDbClient = () => {
  if (!_cachedClient) {
    const client = new DynamoDB({});
    _cachedClient = DynamoDBDocumentClient.from(client);
  }
  return _cachedClient;
};

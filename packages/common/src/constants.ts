export const LOG_PREFIX = "====";

export const GITHUB_OAUTH_MOCK_CODE = "mock_github_oauth_code";

export const DOCKER_NET_NAME = "codepuzzles";
export const DOCKER_LS_NAME = `${DOCKER_NET_NAME}-localstack`;
export const DOCKER_JUDGE_NAME = `${DOCKER_NET_NAME}-judge-dev`;

// NOTE: this should stay the same, unless we change the pulumi resource id of
// the api gateway
export const API_BASE_URL =
  "https://ivo7it01e6.execute-api.us-east-1.amazonaws.com/stage";

export const FRONTEND_BASE_URL = "https://codepuzzle.dev";

export const DEV_FRONTEND_PORT = 1337;
export const DEV_FRONTEND_HOST = "localhost";
export const DEV_FRONTEND_BASE_URL = `http://${DEV_FRONTEND_HOST}:${DEV_FRONTEND_PORT}`;

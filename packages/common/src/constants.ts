export const LOG_PREFIX = "====";

export const GITHUB_OAUTH_MOCK_CODE = "mock_github_oauth_code";

export const DOCKER_NET_NAME = "js-puzzles";
export const DOCKER_LS_NAME = "js-puzzles-localstack";
export const DOCKER_JUDGE_NAME = "js-puzzles-judge-dev";

// NOTE: this should stay the same, unless we change the pulumi resource id of
// the api gateway
export const API_BASE_URL =
  "https://ivo7it01e6.execute-api.us-east-1.amazonaws.com/stage";

export const FRONTEND_BASE_URL = "https://js-puzzles.github.io/JS-Puzzles/";
export const FRONTEND_ORIGIN = new URL(FRONTEND_BASE_URL).origin;

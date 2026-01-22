import { camelCase } from "lodash/fp";

type optionsDictionary = { [key: string]: string | undefined };

const PLATFORM_CDK_ENV_PREFIX = "PCDK_";

const env = process.env ?? ({} as optionsDictionary);

export const getDefaults = (options = {} as optionsDictionary) =>
  Object.fromEntries(
    Object.entries(options)
      .filter(([k]) => k.startsWith(PLATFORM_CDK_ENV_PREFIX))
      .map(([k, v]) => [k.split(PLATFORM_CDK_ENV_PREFIX)[1], v])
      .map(([k = "", v]) => [camelCase(k), v]),
  );

export default getDefaults(env);

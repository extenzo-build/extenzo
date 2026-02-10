import { IRollConfig } from "app/types/type";
import set from "lodash-es/set";
import has from "lodash-es/has";

export async function getGeneralConfig(rollConfig: IRollConfig) {
  return chrome.storage.sync.get("generalConfig").then((res) => {
    const data = res?.["generalConfig"];

    if (Array.isArray(data)) {
      data.forEach((item: any) => {
        if (Array.isArray(item.config)) {
          item.config.reduce((result: any, value: any) => {
            if (has(result, value.key)) {
              set(result, value.key, value.value);
            }
            return result;
          }, rollConfig);
        }
      });
    }

    return rollConfig;
  });
}

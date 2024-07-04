import axios from "axios";
import {
  checkApi,
  initEnv,
  makeBruno,
  makeBurnoRootFile,
  makeFolders,
} from "./collection";
import { OpenAPI } from "./types";

import yars from "yargs";
import { hideBin } from "yargs/helpers";
import { excelDataLoad } from "./src/excelData";
import path from "path";

export type Mode = "start" | "update";

const SwaggerUrl =
  "http://172.30.0.22:8080/v3/api-docs/00%20%EC%A0%84%EC%B2%B4%20API";

async function main() {
  const argv = yars(hideBin(process.argv)).option("u", {
    alias: "update",
    type: "boolean",
    description: "Set update mode",
  }).argv as {
    [x: string]: unknown;
    u: boolean | undefined;
  };

  let mode: Mode = "start";

  if (argv.u) {
    mode = "update";
    console.log("📢 Update mode");
  }

  const data = await axios.get(SwaggerUrl);
  const collectionData: OpenAPI = data.data;

  if (!checkApi(collectionData)) {
    return;
  }

  if (!makeFolders(collectionData.tags, mode)) {
    return;
  }

  makeBurnoRootFile("1", collectionData.info.title);

  if (mode === "start") {
    initEnv();
  }

  const pathDict = excelDataLoad("excel.txt");

  makeBruno(collectionData, mode, pathDict);
}

main();

import axios from "axios";
import {
  checkApi,
  initEnv,
  makeBruno,
  makeBurnoRootFile,
  makeFolders,
} from "./collection";
import { OpenAPI } from "./types";

import { hideBin } from "yargs/helpers";
import { program } from "commander";

export type Mode = "start" | "update";

async function main() {
  program
    .name('openApiToBruno')
    .version('0.1.0')
    .description('Convert Swagger to Bruno')
    .option('-s, --source <type>', 'OpenAPI URL or file path')
    .option('-o, --output <type>', 'Output folder')
    .option('-u, --update', 'Do not delete existing files')
    .parse(process.argv);

  const options = program.opts();
  let mode: Mode = 'start';

  if (options.update) {
    mode = 'update';
    console.log('📢 Update mode');
  }

  if (!options.source) {
    console.error('Error: Source (OpenAPI URL or file path) must be specified');
    process.exit(1);
  }

  if (!options.output) {
    console.error('Error: Output folder must be specified');
    process.exit(1);
  }

  const data = await axios.get(options.source);
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

  makeBruno(collectionData, mode);
}

main();

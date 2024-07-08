#!/usr/bin/env node
import axios from "axios";
import {
  checkApi,
  makeBruno,
  makeBurnoRootFile,
  makeFolders,
} from "./collection";
import { ConfigFile, OpenAPI } from "./types";

import { program } from "commander";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";

function isUrl(string: string): boolean {
  const urlPattern = new RegExp(
    "^(https?:\\/\\/)?" + // 프로토콜
      "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // 도메인명
      "((\\d{1,3}\\.){3}\\d{1,3}))" + // 또는 ip (v4) 주소
      "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // 포트와 경로
      "(\\?[;&a-z\\d%_.~+=-]*)?" + // 쿼리스트링
      "(\\#[-a-z\\d_]*)?$",
    "i"
  );
  return !!urlPattern.test(string);
}

async function fetchDataOrReadFile(source: string) {
  if (!source) {
    throw new Error("Source is required and cannot be empty.");
  }

  if (isUrl(source)) {
    try {
      const response = await axios.get(source);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch data from URL: ${source}`);
    }
  } else {
    try {
      const data = fs.readFileSync(source, "utf8");
      return data;
    } catch (error) {
      throw new Error(`Failed to read file: ${source}`);
    }
  }
}

async function readConfigFile(filePath: string): Promise<ConfigFile> {
  try {
    const data = fs.readFileSync(filePath, "utf8");
    return filePath.endsWith(".yaml") || filePath.endsWith(".yml")
      ? (yaml.load(data) as ConfigFile)
      : JSON.parse(data);
  } catch (error) {
    throw new Error(`Failed to read config file: ${filePath}`);
  }
}

async function main() {
  try {
    program
      .name("openApiToBruno")
      .version("0.1.0")
      .description("Convert Swagger to Bruno")
      .option("-s, --source <type>", "OpenAPI URL or file path")
      .option("-o, --output <type>", "Output folder")
      .option("-u, --update", "Do not delete existing files")
      .option("-c, --config <type>", "Config file")
      .parse(process.argv);

    const options = program.opts();


    if (!options.source) {
      console.error(
        "Error: Source (OpenAPI URL or file path) must be specified"
      );
      process.exit(1);
    }

    if (!options.output) {
      console.error("Error: Output folder must be specified");
      process.exit(1);
    }

    let config: ConfigFile | undefined = undefined;
    if (options.config) {
      try {
        config = await readConfigFile(options.config);
        console.log("Config file loaded:", config);
      } catch (error: any) {
        console.error(error.message);
        process.exit(1);
      }
    }

    const outputPath = path.join(options.output);

    // Create the outputPath folder if it doesn't exist.
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    const collectionData: OpenAPI = await fetchDataOrReadFile(options.source);

    if (!checkApi(collectionData)) {
      return;
    }

    if (!makeFolders(outputPath, collectionData.tags)) {
      return;
    }

    makeBurnoRootFile(outputPath, config?.bruno);

    makeBruno({
      outputPath,
      collectionData,
      config,
    });
  } catch (error: any) {
    console.error(error.message);
    process.exit(1);
  }
}

main();

#!/usr/bin/env node
import axios from "axios";
import {
  checkApi,
  makeBruno,
  makeBurnoRootFile,
  makeFolders,
} from "./collection";
import { OpenAPI } from "./types";

import { program } from "commander";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";

// URL 형식을 확인하는 함수
function isUrl(string: string): boolean {
  const urlPattern = new RegExp(
    "^(https?:\\/\\/)?" + // 프로토콜
      "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // 도메인명
      "((\\d{1,3}\\.){3}\\d{1,3}))" + // 또는 ip (v4) 주소
      "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // 포트와 경로
      "(\\?[;&a-z\\d%_.~+=-]*)?" + // 쿼리스트링
      "(\\#[-a-z\\d_]*)?$",
    "i"
  ); // 해시태그들
  return !!urlPattern.test(string);
}

async function fetchDataOrReadFile(source: string) {
  if (!source) {
    // source가 제공되지 않은 경우 에러를 발생시킵니다.
    throw new Error("Source is required and cannot be empty.");
  }

  if (isUrl(source)) {
    try {
      // URL인 경우 axios를 사용하여 데이터를 가져옵니다.
      const response = await axios.get(source);
      return response.data;
    } catch (error) {
      // URL로 데이터를 가져오는 데 실패한 경우
      throw new Error(`Failed to fetch data from URL: ${source}`);
    }
  } else {
    try {
      // URL이 아닌 경우 파일 시스템에서 파일을 읽습니다.
      const data = fs.readFileSync(source, "utf8");
      return data;
    } catch (error) {
      // 파일을 읽는 데 실패한 경우
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
    let mode: Mode = "start";

    if (options.update) {
      mode = "update";
      console.log("📢 Update mode");
    }

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

    // outputPath 폴더가 존재하지 않는 경우 폴더를 생성합니다.
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    const collectionData: OpenAPI = await fetchDataOrReadFile(options.source);

    if (!checkApi(collectionData)) {
      return;
    }

    if (!makeFolders(outputPath, collectionData.tags, mode)) {
      return;
    }

    makeBurnoRootFile(outputPath, "1", collectionData.info.title);

    makeBruno({
      outputPath,
      collectionData,
      mode,
      config,
    });
  } catch (error: any) {
    console.error(error.message);
    process.exit(1);
  }
}

main();

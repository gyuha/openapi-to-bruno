"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const collection_1 = require("./collection");
const commander_1 = require("commander");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// URL 형식을 확인하는 함수
function isUrl(string) {
    const urlPattern = new RegExp("^(https?:\\/\\/)?" + // 프로토콜
        "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // 도메인명
        "((\\d{1,3}\\.){3}\\d{1,3}))" + // 또는 ip (v4) 주소
        "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // 포트와 경로
        "(\\?[;&a-z\\d%_.~+=-]*)?" + // 쿼리스트링
        "(\\#[-a-z\\d_]*)?$", "i"); // 해시태그들
    return !!urlPattern.test(string);
}
function fetchDataOrReadFile(source) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!source) {
            // source가 제공되지 않은 경우 에러를 발생시킵니다.
            throw new Error("Source is required and cannot be empty.");
        }
        if (isUrl(source)) {
            try {
                // URL인 경우 axios를 사용하여 데이터를 가져옵니다.
                const response = yield axios_1.default.get(source);
                return response.data;
            }
            catch (error) {
                // URL로 데이터를 가져오는 데 실패한 경우
                throw new Error(`Failed to fetch data from URL: ${source}`);
            }
        }
        else {
            try {
                // URL이 아닌 경우 파일 시스템에서 파일을 읽습니다.
                const data = fs_1.default.readFileSync(source, "utf8");
                return data;
            }
            catch (error) {
                // 파일을 읽는 데 실패한 경우
                throw new Error(`Failed to read file: ${source}`);
            }
        }
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        commander_1.program
            .name("openApiToBruno")
            .version("0.1.0")
            .description("Convert Swagger to Bruno")
            .option("-s, --source <type>", "OpenAPI URL or file path")
            .option("-o, --output <type>", "Output folder")
            .option("-u, --update", "Do not delete existing files")
            .parse(process.argv);
        const options = commander_1.program.opts();
        let mode = "start";
        if (options.update) {
            mode = "update";
            console.log("📢 Update mode");
        }
        if (!options.source) {
            console.error("Error: Source (OpenAPI URL or file path) must be specified");
            process.exit(1);
        }
        if (!options.output) {
            console.error("Error: Output folder must be specified");
            process.exit(1);
        }
        const outputPath = path_1.default.join(options.output);
        // outputPath 폴더가 존재하지 않는 경우 폴더를 생성합니다.
        if (!fs_1.default.existsSync(outputPath)) {
            fs_1.default.mkdirSync(outputPath, { recursive: true });
        }
        const collectionData = yield fetchDataOrReadFile(options.source);
        if (!(0, collection_1.checkApi)(collectionData)) {
            return;
        }
        if (!(0, collection_1.makeFolders)(outputPath, collectionData.tags, mode)) {
            return;
        }
        (0, collection_1.makeBurnoRootFile)(outputPath, "1", collectionData.info.title);
        (0, collection_1.makeBruno)(outputPath, collectionData, mode);
    });
}
console.log("🚀 Start converting OpenAPI to Bruno...");
main();

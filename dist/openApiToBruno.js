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
const yargs_1 = __importDefault(require("yargs"));
const helpers_1 = require("yargs/helpers");
const SwaggerUrl = "http://172.30.0.22:8080/v3/api-docs/00%20%EC%A0%84%EC%B2%B4%20API";
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const argv = (0, yargs_1.default)((0, helpers_1.hideBin)(process.argv)).option("u", {
            alias: "update",
            type: "boolean",
            description: "Set update mode",
        }).argv;
        let mode = "start";
        if (argv.u) {
            mode = "update";
            console.log("📢 Update mode");
        }
        const data = yield axios_1.default.get(SwaggerUrl);
        const collectionData = data.data;
        if (!(0, collection_1.checkApi)(collectionData)) {
            return;
        }
        if (!(0, collection_1.makeFolders)(collectionData.tags, mode)) {
            return;
        }
        (0, collection_1.makeBurnoRootFile)("1", collectionData.info.title);
        if (mode === "start") {
            (0, collection_1.initEnv)();
        }
        (0, collection_1.makeBruno)(collectionData, mode);
    });
}
main();

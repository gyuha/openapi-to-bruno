"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.excelDataLoad = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function excelDataLoad(fileName = "excel.txt") {
    if (!fs_1.default.existsSync(fileName)) {
        return {};
    }
    const filePath = path_1.default.resolve(fileName);
    const fileContent = fs_1.default.readFileSync(filePath, "utf8");
    const lines = fileContent.split("\n");
    const data = {};
    for (const line of lines) {
        const columns = line.split("\t");
        const key = columns[columns.length - 1].replace("\r", "");
        const value = columns[columns.length - 3];
        data[key] = value;
    }
    return data;
}
exports.excelDataLoad = excelDataLoad;

"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initEnv = exports.makeBurnoRootFile = exports.makeFolders = exports.makeBruno = exports.checkApi = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const lodash_1 = __importStar(require("lodash"));
const path_1 = __importDefault(require("path"));
const jsonToBru_1 = __importDefault(require("./jsonToBru"));
const FOLDER_NAME = "API";
function makeBurnoRootFile(version, name) {
    const json = {
        version,
        name,
        type: "collection",
    };
    fs_extra_1.default.writeFileSync(path_1.default.join(FOLDER_NAME, "bruno.json"), JSON.stringify(json, null, 2));
}
exports.makeBurnoRootFile = makeBurnoRootFile;
function deleteFolderRecursive(directory) {
    if (fs_extra_1.default.existsSync(directory)) {
        fs_extra_1.default.readdirSync(directory).forEach((file, index) => {
            const curPath = path_1.default.join(directory, file);
            if (fs_extra_1.default.lstatSync(curPath).isDirectory()) {
                // recurse
                deleteFolderRecursive(curPath);
            }
            else {
                // delete file
                fs_extra_1.default.unlinkSync(curPath);
            }
        });
        fs_extra_1.default.rmdirSync(directory);
    }
}
function initEnv() {
    const envPath = path_1.default.join("defaultEnv");
    const tarPath = path_1.default.join(FOLDER_NAME, "environments");
    fs_extra_1.default.copySync(envPath, tarPath);
}
exports.initEnv = initEnv;
function exscapePath(name) {
    const invalidChars = /[<>:"/\\|?*]/g; // Regex for invalid characters
    const validName = name.replace(invalidChars, "_");
    return validName;
}
const buildEmptyJsonBody = (bodySchema) => {
    let _jsonBody = {};
    lodash_1.default.each(bodySchema.properties || {}, (prop, name) => {
        if (prop.type === "object") {
            _jsonBody[name] = buildEmptyJsonBody(prop);
            // handle arrays
        }
        else if (prop.type === "array") {
            _jsonBody[name] = [];
        }
        else {
            _jsonBody[name] = "";
        }
    });
    return _jsonBody;
};
const buildQuery = (params) => {
    let _query = [];
    lodash_1.default.each(params, (param) => {
        _query.push({
            name: param.name,
            value: param.schema.default || "",
            enabled: param.required,
        });
    });
    return _query;
};
const checkApi = (collectionData) => {
    if (collectionData.openapi && !collectionData.openapi.startsWith("3")) {
        console.error("Only OpenAPI 3.0 is supported");
        return false;
    }
    return true;
};
exports.checkApi = checkApi;
const makeFolders = (collectionData, mode) => {
    try {
        if (mode === "start")
            deleteFolderRecursive(FOLDER_NAME);
        lodash_1.default.each(collectionData, (tag) => {
            const folderName = path_1.default.join(FOLDER_NAME, exscapePath(tag.name));
            if (!fs_extra_1.default.existsSync(folderName)) {
                fs_extra_1.default.mkdirSync(folderName, { recursive: true });
            }
            else {
                // console.log(`Directory already exists: ${tag.name}`);
            }
        });
    }
    catch (err) {
        console.error(err);
        return false;
    }
    return true;
};
exports.makeFolders = makeFolders;
let refDocs = "";
const objectRefDocs = (ref, components) => {
    if (!ref) {
        return;
    }
    let refs = ref.replace("#/", "").split("/");
    let refData = components[refs[1]][refs[2]];
    if (refData.type === "object") {
        refDocs += `## ${refData.description || refs[refs.length - 1] || ''}
| name | type | description | format |
| ---- | ---- | ----------- | ------ |
`;
        lodash_1.default.each(refData.properties, (prop, name) => {
            refDocs += `| ${name} | ${prop.type} | ${prop.description || ""} | ${prop.format || ""} |
`;
        });
        refDocs += "\n\n";
    }
    lodash_1.default.each(refData.properties, (prop, name) => {
        if (prop && prop.items && prop.items.$ref) {
            objectRefDocs(prop.items.$ref, components);
        }
    });
};
const requestBody = (method, components) => {
    let body = {};
    refDocs = "";
    let http = {};
    let ref = method.requestBody.content["application/json"].schema.$ref;
    if (ref) {
        let refs = ref.replace("#/", "").split("/");
        let refData = components[refs[1]][refs[2]];
        lodash_1.default.each(["data", "items"], (key) => {
            if (refData.type === "object" &&
                refData.properties[key] &&
                refData.properties[key]["$ref"] !== undefined) {
                ref = refData.properties[key]["$ref"];
                refs = ref.replace("#/", "").split("/");
                refData = components[refs[1]][refs[2]];
            }
        });
        const jsonBody = buildEmptyJsonBody(refData);
        body.json = JSON.stringify(jsonBody, null, 2);
        try {
            objectRefDocs(ref, components);
        }
        catch (e) {
            console.log("Ref error ", e);
        }
    }
    return [body, refDocs];
};
const paramter = (method) => {
    let docsJson = `## Parameters
| name | type | description | required | format |
| ---- | ---- | ----------- | -------- | ------ |
`;
    (0, lodash_1.each)(method.parameters, (param) => {
        const line = `| ${param.name} | ${param.schema.type} | ${param.description || ""} | ${param.required} | ${param.schema.format || ""} |
`;
        docsJson += line;
    });
    return docsJson;
};
const makeBrunoFile = (seq, path, methodType, name, method, components) => {
    const meta = {
        name,
        type: "http",
        seq,
    };
    const http = {
        method: methodType,
        url: "{{host}}" + path,
    };
    const auth = {};
    if (method.operationId !== "login") {
        auth.bearer = { token: "{{accessToken}}" };
        http.auth = "bearer";
    }
    const query = buildQuery(method.parameters || []);
    let docsJson = undefined;
    let body = {};
    if (method.requestBody) {
        [body, docsJson] = requestBody(method, components);
        http.body = "json";
    }
    if (method.parameters) {
        docsJson = paramter(method);
    }
    const script = {};
    if (path.includes("auth/login")) {
        script.res = `
bru.setEnvVar("accessToken", res.body.data.token.accessToken);
bru.setEnvVar("refreshToken", res.body.data.token.refreshToken);  
`;
    }
    const docs = (method.summary || docsJson) &&
        `# ${method.summary}

${method.description || ""}

${docsJson || ""}
`;
    const json = { meta, http, auth, docs, script, body, query };
    const content = (0, jsonToBru_1.default)(json);
    // console.log("📢[collection.ts:148]: content: ", content);
    return content;
};
const makeBruno = (collectionData, mode) => {
    lodash_1.default.each(collectionData.paths, (colletionPath, pathName) => {
        let seq = 1;
        lodash_1.default.each(colletionPath, (method, methodType) => {
            const tag = method.tags[0];
            const url = pathName.replace("/api/v1", "");
            let fileBaseName = method.operationId;
            const filePath = path_1.default.join(FOLDER_NAME, exscapePath(tag), fileBaseName + ".bru");
            const data = makeBrunoFile(seq++, pathName, methodType, fileBaseName, method, collectionData.components);
            if (mode == "update" && fs_extra_1.default.existsSync(filePath)) {
                console.log("📢 Skip : ", filePath);
                return;
            }
            console.log("📢 Create : ", filePath);
            if (!fs_extra_1.default.existsSync(path_1.default.dirname(filePath))) {
                fs_extra_1.default.mkdirSync(path_1.default.dirname(filePath), { recursive: true });
            }
            fs_extra_1.default.writeFileSync(filePath, data, "utf-8");
        });
    });
};
exports.makeBruno = makeBruno;

import fs from "fs-extra";
import _, { each, method } from "lodash";
import path from "path";
import jsonToBru from "../jsonToBru";
import {
  MethodClass,
  OpenAPI,
  PurpleParameter,
  TagClass,
  RequestBody,
} from "../types";
import { Mode } from "../swaggerToBruno";
import { IPathDict } from "./excelData";

const FOLDER_NAME = "API";

function makeBurnoRootFile(version: string, name: string) {
  const json = {
    version,
    name,
    type: "collection",
  };
  fs.writeFileSync(
    path.join(FOLDER_NAME, "bruno.json"),
    JSON.stringify(json, null, 2)
  );
}

function deleteFolderRecursive(directory: string): void {
  if (fs.existsSync(directory)) {
    fs.readdirSync(directory).forEach((file, index) => {
      const curPath = path.join(directory, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        // recurse
        deleteFolderRecursive(curPath);
      } else {
        // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(directory);
  }
}

function initEnv() {
  const envPath = path.join("defaultEnv");
  const tarPath = path.join(FOLDER_NAME, "environments");
  fs.copySync(envPath, tarPath);
}

function exscapePath(name: string): string {
  const invalidChars = /[<>:"/\\|?*]/g; // Regex for invalid characters
  const validName = name.replace(invalidChars, "_");
  return validName;
}

const buildEmptyJsonBody = (bodySchema: any) => {
  let _jsonBody: any = {};
  _.each(bodySchema.properties || {}, (prop, name) => {
    if (prop.type === "object") {
      _jsonBody[name] = buildEmptyJsonBody(prop);
      // handle arrays
    } else if (prop.type === "array") {
      _jsonBody[name] = [];
    } else {
      _jsonBody[name] = "";
    }
  });
  return _jsonBody;
};

const buildQuery = (params: PurpleParameter[]) => {
  let _query: any = [];
  _.each(params, (param) => {
    _query.push({
      name: param.name,
      value: param.schema.default || "",
      enabled: param.required,
    });
  });
  return _query;
};

const checkApi = (collectionData: OpenAPI): boolean => {
  if (collectionData.openapi && !collectionData.openapi.startsWith("3")) {
    console.error("Only OpenAPI 3.0 is supported");
    return false;
  }
  return true;
};

const makeFolders = (collectionData: TagClass[], mode: Mode) => {
  try {
    if (mode === "start") deleteFolderRecursive(FOLDER_NAME);

    _.each(collectionData, (tag: TagClass) => {
      const folderName = path.join(FOLDER_NAME, exscapePath(tag.name));
      if (!fs.existsSync(folderName)) {
        fs.mkdirSync(folderName, { recursive: true });
      } else {
        // console.log(`Directory already exists: ${tag.name}`);
      }
    });
  } catch (err) {
    console.error(err);
    return false;
  }
  return true;
};

let refDocs: string = "";

const objectRefDocs = (ref: string, components: any) => {
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
    _.each(refData.properties, (prop, name) => {
      refDocs += `| ${name} | ${prop.type} | ${prop.description || ""} | ${
        prop.format || ""
      } |
`;
    });
    refDocs += "\n\n";
  }

  _.each(refData.properties, (prop, name) => {
    if (prop && prop.items && prop.items.$ref) {
      objectRefDocs(prop.items.$ref, components);
    }
  });
};

const requestBody = (method: any, components: any) => {
  let body: any = {};
  refDocs = "";
  let http: any = {};

  let ref = method.requestBody.content["application/json"].schema.$ref;

  if (ref) {
    let refs = ref.replace("#/", "").split("/");
    let refData = components[refs[1]][refs[2]];

    _.each(["data", "items"], (key) => {
      if (
        refData.type === "object" &&
        refData.properties[key] &&
        refData.properties[key]["$ref"] !== undefined
      ) {
        ref = refData.properties[key]["$ref"];
        refs = ref.replace("#/", "").split("/");
        refData = components[refs[1]][refs[2]];
      }
    });

    const jsonBody = buildEmptyJsonBody(refData);

    body.json = JSON.stringify(jsonBody, null, 2);

    try {
      objectRefDocs(ref, components);
    } catch (e: any) {
      console.log("Ref error ", e);
    }
  }
  return [body, refDocs];
};

const paramter = (method: MethodClass) => {
  let docsJson = `## Parameters
| name | type | description | required | format |
| ---- | ---- | ----------- | -------- | ------ |
`;

  each(method.parameters, (param) => {
    const line = `| ${param.name} | ${param.schema.type} | ${
      param.description || ""
    } | ${param.required} | ${param.schema.format || ""} |
`;
    docsJson += line;
  });

  return docsJson;
};

const makeBrunoFile = (
  seq: number,
  path: string,
  methodType: string,
  name: string,
  method: MethodClass,
  components: any
): string => {
  const meta = {
    name,
    type: "http",
    seq,
  };

  const http: any = {
    method: methodType,
    url: "{{host}}" + path,
  };

  const auth: any = {};

  if (method.operationId !== "login") {
    auth.bearer = { token: "{{accessToken}}" };
    http.auth = "bearer";
  }

  const query = buildQuery(method.parameters || []);

  let docsJson: string | undefined = undefined;
  let body: any = {};

  if (method.requestBody) {
    [body, docsJson] = requestBody(method, components);
    http.body = "json";
  }

  if (method.parameters) {
    docsJson = paramter(method);
  }

  const script: any = {};
  if (path.includes("auth/login")) {
    script.res = `
bru.setEnvVar("accessToken", res.body.data.token.accessToken);
bru.setEnvVar("refreshToken", res.body.data.token.refreshToken);  
`;
  }
  const docs =
    (method.summary || docsJson) &&
    `# ${method.summary}

${method.description || ""}

${docsJson || ""}
`;

  const json = { meta, http, auth, docs, script, body, query };
  const content = jsonToBru(json);
  // console.log("📢[collection.ts:148]: content: ", content);
  return content;
};

const makeBruno = (
  collectionData: OpenAPI,
  mode: Mode,
  pathDict: IPathDict
) => {
  _.each(collectionData.paths, (colletionPath, pathName) => {
    let seq = 1;
    _.each(colletionPath, (method, methodType) => {
      const tag = method.tags[0];

      const url = pathName.replace("/api/v1", "");
      const fileId = pathDict[url];

      let fileBaseName = method.operationId;
      if (fileId) {
        fileBaseName = fileBaseName + " [" + fileId + "]";
      }

      const filePath = path.join(
        FOLDER_NAME,
        exscapePath(tag),
        fileBaseName + ".bru"
      );

      const data = makeBrunoFile(
        seq++,
        pathName,
        methodType,
        fileBaseName,
        method,
        collectionData.components
      );

      if (mode == "update" && fs.existsSync(filePath)) {
        console.log("📢 Skip : ", filePath);
        return;
      }
      console.log("📢 Create : ", filePath);

      if (!fs.existsSync(path.dirname(filePath))) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
      }

      fs.writeFileSync(filePath, data, "utf-8");
    });
  });
};

export { checkApi, makeBruno, makeFolders, makeBurnoRootFile, initEnv };
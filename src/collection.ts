import fs from "fs-extra";
import _, { each, method } from "lodash";
import path from "path";
import jsonToBru from "./jsonToBru";
import { blue, green, red, yellow } from "colorette";
import {
  MethodClass,
  OpenAPI,
  PurpleParameter,
  TagClass,
  ConfigFile,
  IgnoreFile,
  BrunoJson,
} from "./types";

function ensureDirectoryExistence(filePath: string) {
  var dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

function makeBurnoRootFile(outputPath: string, config: BrunoJson | undefined) {
  const brunoFilePath = path.join(outputPath, "bruno.json");

  // if file already exists, do not overwrite
  if (brunoFilePath && fs.existsSync(brunoFilePath)) {
    return;
  }

  const json = {
    version: config?.version || "1",
    name: config?.name || "Untitled",
    type: config?.type || "collection",
    ignore: config?.ignore || ["node_modules", ".git"],
  };
  ensureDirectoryExistence(brunoFilePath);

  fs.writeFileSync(brunoFilePath, JSON.stringify(json, null, 2));
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
      value: (param.schema && param.schema.default) || "",
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

const checkIgnore = ({
  method,
  path,
  ignoreFile,
}: {
  method: MethodClass;
  path: string;
  ignoreFile?: IgnoreFile;
}): boolean => {
  if (!ignoreFile) {
    return false;
  }

  if (method.operationId && ignoreFile.ids?.includes(method.operationId)) {
    return true;
  }
  return (
    ignoreFile.folders?.some((folder: string) => path.indexOf(folder) === 0) ||
    false
  );
};

const makeFolders = (outputPath: string, collectionData: TagClass[]) => {
  try {
    _.each(collectionData, (tag: TagClass) => {
      const folderName = path.join(outputPath, exscapePath(tag.name));
      if (!fs.existsSync(folderName)) {
        fs.mkdirSync(folderName, { recursive: true });
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
    refDocs += `## ${refData.description || refs[refs.length - 1] || ""}
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
    const line = `| ${param.name} | ${
      (param.schema && param.schema.type) || "type"
    } | ${param.description || ""} | ${param.required} | ${
      (param.schema && param.schema.format) || ""
    } |
`;
    docsJson += line;
  });

  return docsJson;
};

const makeBrunoFile = ({
  seq,
  path,
  methodType,
  name,
  method,
  components,
  config,
}: {
  seq: number;
  path: string;
  methodType: string;
  name: string;
  method: MethodClass;
  config?: ConfigFile;
  components: any;
}): string => {
  const meta = {
    name,
    type: "http",
    seq,
  };

  const http: any = {
    method: methodType,
    url: "{{host}}" + path,
  };

  let auth: any = {};

  if (
    config &&
    config?.auth &&
    !checkIgnore({ method, path, ignoreFile: config?.auth?.ignore })
  ) {
    http.auth = config.auth.type || "none";
    auth = {...config?.auth};
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

  if (method.operationId) {
    docsJson = `
----
OperationId : \`${method.operationId}\`
`;
  }

  const script: any = {};

  const docs =
    (method.summary || docsJson) &&
    `# ${method.summary}

${method.description || ""}

${docsJson || ""}
`;

  const json = { meta, http, auth, docs, script, body, query };
  const content = jsonToBru(json);

  return content;
};

const makeBruno = ({
  outputPath,
  collectionData,
  config,
}: {
  outputPath: string;
  collectionData: OpenAPI;
  config?: ConfigFile;
}) => {
  _.each(collectionData.paths, (colletionPath, pathName) => {
    let seq = 1;
    _.each(colletionPath, (method, methodType) => {
      const tag = method.tags[0];

      let fileBaseName =
        method.summary?.trim() || method.operationId || "noname";

      const filePath = path.join(outputPath, pathName, fileBaseName + ".bru");
      
      // check ignore file
      if (
        config &&
        config.update &&
        checkIgnore({
          method,
          path: pathName,
          ignoreFile: config.update.ignore,
        })
      ) {
        console.log(`${red("IGNORE")} : ${pathName} ${method.operationId}`);
        return;
      }

      const data = makeBrunoFile({
        seq: seq++,
        path: pathName,
        methodType,
        name: fileBaseName,
        method,
        components: collectionData.components,
        config,
      });

      if (!fs.existsSync(path.dirname(filePath))) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
      }

      if (fs.existsSync(filePath)) {
        console.log(`${blue("UPDATE")} : ${filePath}`);
      } else {
        console.log(`🆕 ${green("ADD")} : ${filePath}`);
      }
      fs.writeFileSync(filePath, data, "utf-8");
    });
  });
};

export { checkApi, makeBruno, makeFolders, makeBurnoRootFile };

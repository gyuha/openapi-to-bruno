import fs from "fs";
import path from "path";

interface IPathDict {
  [key: string]: string;
}

function excelDataLoad(fileName: string = "excel.txt") {
  if (!fs.existsSync(fileName)) {
    return {};
  }

  const filePath = path.resolve(fileName);
  const fileContent = fs.readFileSync(filePath, "utf8");

  const lines = fileContent.split("\n");
  const data: IPathDict = {};

  for (const line of lines) {
    const columns = line.split("\t");
    const key = columns[columns.length - 1].replace("\r", "");
    const value = columns[columns.length - 3];
    data[key] = value;
  }

  return data;
}

export { excelDataLoad, IPathDict };

type Mode = "start" | "update";

interface IgnoreFile {
  folders?: string[];
  ids?: string[];
}

interface ConfigFile {
  info?: {
    title?: string;
  };
  update?: {
    ignore?: IgnoreFile;
  };
  auth?: {
    type?:
      | "none"
      | "awsv4"
      | "basic"
      | "bearer"
      | "basic"
      | "digest"
      | "oauth2"
      | "inherit";
    values?: { [key: string]: string };
    ignore?: IgnoreFile;
  };
}

export type versionType = {
  title: string;
  version: string;
};

export interface DownloadLinkInfo {
  title: string;
  version: string;
  versioncode: number;
  url: string;
  source: string;
  md5: string;
  filename: string;
  date: string;
}

export interface AppInfoInt {
  title: string;
  version: string;
  versionCode: number;
  checksum: string;
  time: number;
  variant: String;
  released_on: string;
}

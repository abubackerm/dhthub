export interface IStorageService {
  uploadFile(key: string, body: Buffer | Uint8Array | string, contentType: string): Promise<string>;
  getFileUrl(key: string): Promise<string>;
  deleteFile(key: string): Promise<void>;
}

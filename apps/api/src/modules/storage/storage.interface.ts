export interface IStorageService {
  uploadFile(key: string, body: Buffer | Uint8Array | string, contentType: string): Promise<string>;
  getFile(key: string): Promise<Buffer>;
  getFileUrl(key: string): Promise<string>;
  deleteFile(key: string): Promise<void>;
}

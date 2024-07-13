import { contextBridge, ipcRenderer } from 'electron';

export interface ScrapperMethods {
    test: (username:string) => Promise<void>;
}

const scrappers: ScrapperMethods = {
    test: async (username: string) => ipcRenderer.invoke('scrapper-test', username),
}

contextBridge.exposeInMainWorld('scrappers', scrappers);

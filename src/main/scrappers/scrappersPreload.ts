import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('scrappers', {
    test: async (username: string) => ipcRenderer.invoke('scrapper-test', username),
});

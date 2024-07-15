import type { ScrapperMethods } from './src/scrappers/ScrapperMethods';

declare global {
    interface Window {
        scrappers: ScrapperMethods;
        app: {
            platform: NodeJS.Platform;
        }
    }
}

export {};
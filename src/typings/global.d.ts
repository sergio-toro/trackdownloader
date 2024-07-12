interface ScrapperMethods {
    test: (username:string) => Promise<void>;
}

declare global {
    interface Window {
        scrappers: ScrapperMethods;
    }
}

export {};
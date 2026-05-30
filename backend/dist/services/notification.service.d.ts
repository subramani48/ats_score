interface AdminMeta {
    name: string;
    email: string;
    domain: string;
    score: number | string;
}
export declare const sendResumeToAdmin: (fileName: string, meta: AdminMeta) => Promise<void>;
export {};

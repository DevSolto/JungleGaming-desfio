export declare function getDefaultTaskTimezone(): string;
export declare function parseDateInTimezone(value: string, timeZone?: string): Date;
export declare function dateStringToISOString(value: string, timeZone?: string): string;
export declare function getDayRangeInTimezone(date: string, timeZone?: string): {
    start: Date;
    end: Date;
};
export declare function resolveTaskTimezone(preferred?: string): string;
export declare function resetDefaultTaskTimezoneCache(): void;

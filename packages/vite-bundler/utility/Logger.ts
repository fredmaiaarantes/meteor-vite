import pc from 'picocolors';
import { inspect } from 'node:util';
import fs from 'node:fs';
import { performance } from 'node:perf_hooks';
import { msToHumanTime } from './Helpers';

class Logger {
    protected debugEnabled = false;
    protected github = new GithubActions();
    protected static DEBUG_ENV_TRIGGERS = [
        'true',
        '*',
        'vite-bundler:*',
    ]
    constructor() {
        const debugEnv = process.env.DEBUG || 'false';
        this.debugEnabled = !!debugEnv.trim().split(/\s+/).find((field) => {
            return Logger.DEBUG_ENV_TRIGGERS.includes(field.trim())
        });
        
    }
    
    public info(message: string, ...args: LogMethodArgs) {
        console.info(pc.blue(`⚡  ${message}`), ...args)
    }
    public error(message: string, ...args: LogMethodArgs) {
        console.error(pc.red(`⚡  ${message}`), ...args)
    }
    public success(message: string, ...args: LogMethodArgs) {
        console.log(pc.green(`⚡  ${message}`), ...args)
    }
    public debug(message: string, ...args: LogMethodArgs) {
        if (!this.debugEnabled) {
            return;
        }
        console.debug(pc.dim(pc.blue(`⚡  ${message}`)), ...args)
    }
    
    public startProfiler(options: { title?: string }) {
        const startTime = performance.now();
        return {
            complete: (message: string) => {
                const messageWithTiming = `${message} in ${msToHumanTime(performance.now() - startTime)}`
                this.success(messageWithTiming);
                this.github.annotate(messageWithTiming, options);
            }
        }
    }
}

class GithubActions {
    protected stepSummaryFile;
    protected useAnnotations;
    
    constructor() {
        this.stepSummaryFile = process.env.GITHUB_STEP_SUMMARY;
        this.useAnnotations = !!this.stepSummaryFile;
    }
    
    public annotate(message: string, options: GithubAnnotationOptions) {
        if (!this.useAnnotations) {
            return;
        }
        const data: string[] = Object.entries(options).map(([key, value]) => {
            return `${key}="${value}"`
        });
        
        console.log(`::notice ${data.join()}::⚡  ${message})`);
    }
    
    public summarize(message: string, ...args: LogMethodArgs) {
        if (!this.stepSummaryFile) {
            return;
        }
        
        const formattedArgs = args.length ? inspect(args) : '';
        fs.appendFileSync(this.stepSummaryFile, `⚡  ${message} ${formattedArgs}`);
    }
}

interface GithubAnnotationOptions {
    title?: string;
}

type LogMethodArgs = unknown[];
export default new Logger();

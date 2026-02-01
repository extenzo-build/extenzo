import { type BrowserTarget, type CliCommand } from "./constants.js";
export interface CliParseResult {
    command: CliCommand;
    browser: BrowserTarget;
    unknownBrowser?: string;
}
/** CLI 参数解析器：解析 command 与 -b/--browser，无效时抛出 ExtenzoError。 */
export declare class CliParser {
    parse(argv: string[]): CliParseResult;
    private getBrowserFromArgv;
    assertSupportedBrowser(value: string): asserts value is BrowserTarget;
}
export declare function parseCliArgs(argv: string[]): CliParseResult;
export declare function assertSupportedBrowser(value: string): asserts value is BrowserTarget;

/** 类型声明：web-ext 通过动态 import 使用，见 cmd.run 文档。 */
declare module "web-ext" {
  interface RunOptions {
    sourceDir: string;
    target: string;
    firefox?: string;
    chromiumBinary?: string;
    startUrl?: string;
  }
  interface RunResult {
    exit(): Promise<void>;
    /** Optional: promise that resolves when the Firefox process exits (web-ext may provide this). */
    exitPromise?: Promise<void>;
    /** Optional: Node ChildProcess for the Firefox instance; listen to "exit" to terminate dev when browser closes. */
    browserProcess?: { on(event: string, handler: () => void): void };
  }
  interface WebExt {
    cmd: {
      run(options: RunOptions, opts: { shouldExitProgram: boolean }): Promise<RunResult>;
    };
  }
  const webExt: WebExt;
  export default webExt;
}

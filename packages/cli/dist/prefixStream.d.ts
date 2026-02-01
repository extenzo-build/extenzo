/**
 * Wraps process.stdout and process.stderr so each line is prefixed with colored "[extenzo]".
 * Call before running rsbuild dev/build so users see that extenzo is executing.
 * Original rsbuild output is preserved line-by-line.
 */
export declare function wrapExtenzoOutput(): void;
//# sourceMappingURL=prefixStream.d.ts.map
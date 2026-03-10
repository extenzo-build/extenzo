import React from "react";
import { TerminalChrome } from "./TerminalChrome";
import { termBox, termBody, termLine, termTable } from "./terminalStyles";

export function BlockBuildTerminal() {
  return (
    <div className={termBox}>
      <TerminalChrome />
      <div className={termBody}>
        <div className="block">
          <span className={termLine.prompt}>$ extenzo build</span>
        </div>
        <div className="block">
          <span className={termLine.exo}>[exo] </span>
          <span className={termLine.done}>Done </span>
          <span className={termLine.value}>Parse exo.config </span>
          <span className={termLine.time}>10ms</span>
        </div>
        <div className="block">
          <span className={termLine.exo}>[exo] </span>
          <span className={termLine.done}>Done </span>
          <span className={termLine.value}>Parse manifest </span>
          <span className={termLine.time}>4ms</span>
        </div>
        <div className="block">
          <span className={termLine.exo}>[exo] </span>
          <span className={termLine.done}>Done </span>
          <span className={termLine.value}>Parse entries </span>
          <span className={termLine.time}>6ms</span>
        </div>
        <div className="block">
          <table className={termTable}>
            <thead>
              <tr>
                <th>Entry</th>
                <th>File</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>background</td><td>app/background.ts</td></tr>
              <tr><td>content</td><td>app/content/index.ts</td></tr>
              <tr><td>popup</td><td>app/popup/index.tsx</td></tr>
            </tbody>
          </table>
        </div>
        <div className="block">
          <span className={termLine.exo}>[exo] </span>
          <span className={termLine.done}>Done </span>
          <span className={termLine.value}>Rsbuild build </span>
          <span className={termLine.time}>2.1s</span>
        </div>
        <div className="block">
          <span className={termLine.exo}>[exo] </span>
          <span className={termLine.done}>Done </span>
          <span className={termLine.value}>Zipped output to </span>
          <span className={termLine.cyan}>dist/extenzo-0.0.1.zip</span>
        </div>
        <div className="block">
          <span className={termLine.exo}>[exo] </span>
          <span className={termLine.done}>Done </span>
          <span className={termLine.value}>Extension size: </span>
          <span className={termLine.cyan}>1.24 MB</span>
        </div>
      </div>
    </div>
  );
}

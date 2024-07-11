
import * as vscode from 'vscode';
import * as fs from 'fs';

const byteFunctionMap: { [key: number]: string } = {
    0b1010: ' exclusiveMarkup',
    0b1001: '  . ', //floatSeparator
    0b1000: '\n0metadata: \n ',
    0b111: '\n0;\n ', //endMetadata
    0b110: '\n0row: \n ',
    0b101: '\n0;\n ', // endRow
    0b100: '\n1id:\n ',
    0b11: '\n1;\n ', // endRowId
    0b10: '\n1data: \n ',
    0b1: '\n1;\n ', //endData
    0b0: ' | ' // dataSeparator
};

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('byatrice-extension.openBytcFile', async () => {
        const uri = await vscode.window.showOpenDialog({ filters: { 'BYTC Files': ['bytc'] } });
        if (uri && uri[0]) {
            const filePath = uri[0].fsPath;
            const buffer = fs.readFileSync(filePath);
            const content = interpretBytcFile(buffer);
            const doc = await vscode.workspace.openTextDocument({ content, language: 'plaintext' });
            vscode.window.showTextDocument(doc);
        }
    });

    context.subscriptions.push(disposable);
}

function interpretBytcFile(buffer: Buffer): string {
    let ignoreNext: boolean = false;
    let result: string = '';

    buffer.forEach((byte) => {
        if (ignoreNext) {
            result += toX(byte);
            ignoreNext = false;
            return;
        }

        if (byte === 0b1010) {
            ignoreNext = true;
            return;
        }

        const mappedFunction = byteFunctionMap[byte];
        let exclusive = mappedFunction ? mappedFunction : undefined;

        if (exclusive) {
            let counter: number = 0;
            for (let i = 0; i < exclusive.length; i++) {
                if (exclusive[i] === '-') {
                    counter++;
                }
            }
        }

        result += exclusive ? `${exclusive}` : `${toX(byte)} `;
    });

    function toX(byte: number): string {
        return ('0' + byte.toString(16)).slice(-2);
    }

    
    let indent: number = 0;

    return result.split('\n').reduce((r, line) => {
        if (!line) {
            return r;
        }

        const newIndent = parseInt(line.slice(0, 1), 10);

        if (isNaN(newIndent)) {
            r += '  '.repeat(indent+1);
            r += line.slice(1);
        } else {
            r += '  '.repeat(newIndent);
            r += line.slice(1);
            indent = newIndent;
        }

        return r + '\n';
    }, '');
}

export function deactivate() {}

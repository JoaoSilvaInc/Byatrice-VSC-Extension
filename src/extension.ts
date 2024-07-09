
import * as vscode from 'vscode';
import * as fs from 'fs';

const byteFunctionMap: { [key: number]: string } = {
    0b1000: 'startMetadata',
    0b111: 'endMetadata',
    0b110: 'startRow',
    0b101: 'endRow',
    0b100: 'startRowId',
    0b11: 'endRowId',
    0b10: 'startData',
    0b1: 'endData',
    0b0: 'dataSeparator'
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

    let result = '';

    let control: number = 0;
    let state: number = 0; // Reading exclusive bytes
    
    let currentDataBytes: string[] = [];
    let bytesCounter: number = 0;
    let bytesCount: number = 0;

    let parseJson: boolean = false;

    buffer.forEach(byte => {

        let byteString = `${byte.toString(2).padStart(8, '0')} `;

        if (control === 1 && state === 0 && byte === 0b1000) {
            state = 1; // Reading metadata
            parseJson = true;
        }

        if (state === 1) { // Reading data
            
            if (bytesCounter === 0) {
                bytesCount = byte;
                result += `${byte} bytes data: `;
            }

            if (bytesCounter < bytesCount) {
                currentDataBytes.push(byteString);
            } else {
                enterCurrentDataBytes(); // Reset state to 0 and pushes currentDataBytes content to result
            }

            return;

        }


        if (
            byte === 0b110 || // startRow
            byte === 0b11 || // startRowId
            byte === 0b10 // startData
        ) { // Opening functions
            if (state === 0) {
                control ++;
                result += `${byteFunctionMap[byte]}:\n`;
            }

            if (control === 2 && state === 0) {
                state = 1; // Reading data
            }
        }

        if (
            byte === 0b101 || // endRow
            byte === 0b100 || // endRowId
            byte === 0b1 || // endData
            byte === 0b111 // endMetadata
        ) { // CLosing functions
            if (state === 0) {
                control --;
                result += `${byteFunctionMap[byte]}:\n`;
            }
        }

    });

    return result;

    function enterCurrentDataBytes(): void {

        if (parseJson) {
            result += Buffer.from(currentDataBytes.map( byteStr => parseInt(byteStr) )).toJSON();
        } else {
            currentDataBytes.forEach( (byteStr, index) => {
                if (index < currentDataBytes.length-1) {
                    result += `${byteStr} `;
                } else {
                    result += `${byteStr}/n`;
                }
            });
        }

        currentDataBytes = [];
        bytesCounter = 0;
        bytesCount = 0;
        state = 0; // Finish data reading
    }

}

export function deactivate() {}

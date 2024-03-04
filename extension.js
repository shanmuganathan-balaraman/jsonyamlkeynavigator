const vscode = require('vscode');

let statusBarItem;

function activate(context) {

    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'yml-json-key-finder.copyPath';
    statusBarItem.tooltip = 'Click to copy path'
    context.subscriptions.push(statusBarItem);

    const cursorPositionDisposable = vscode.window.onDidChangeTextEditorSelection(event => {
        if (event.textEditor === vscode.window.activeTextEditor) {
            showFullPathInStatusBar(event.textEditor);
        }
    });

    let findKeyCommand = vscode.commands.registerCommand('yml-json-key-finder.searchKey', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return; // No open text editor
        }

        vscode.window.showInputBox({ prompt: 'Enter Key Path' }).then((keyPath) => {
            if (keyPath) {
                const position = findKeyPosition(editor, keyPath);
                if (position) {
                    const lineRange = editor.document.lineAt(position.line).range;
                    editor.selection = new vscode.Selection(lineRange.start, lineRange.end);
                    editor.revealRange(lineRange);
                } else {
                    vscode.window.showErrorMessage('Key not found');
                }
            }
        });
    });

    let copyPathCommand = vscode.commands.registerCommand('yml-json-key-finder.copyPath', () => {
        vscode.env.clipboard.writeText(statusBarItem.text.replace('Full Path: ', ''));
        vscode.window.showInformationMessage('Path copied to clipboard');
    });
    context.subscriptions.push(cursorPositionDisposable, findKeyCommand, copyPathCommand);
}

function findKeyPosition(editor, path) {
    const document = editor.document;
    const keys = path.split('.');
    let regexPatterns = keys.map((key, index) => {
        let regexString;
        if (document.languageId === 'json') {
            regexString = `\\"${key}\\"\\s*:\\s*`;
        } else {
            regexString = index === keys.length - 1 ? `\\b${key}\\b\\s*:\\s*` : `\\b${key}\\b\\s*:`;
        }
        return new RegExp(regexString);
    });

    let currentLevel = 0;
    for (let i = 0; i < document.lineCount; i++) {
        const lineText = document.lineAt(i).text;
        if (currentLevel < keys.length - 1) {
            if (regexPatterns[currentLevel].test(lineText)) {
                currentLevel++;
            }
        } else {
            const finalKeyRegex = regexPatterns[currentLevel];
            const match = finalKeyRegex.exec(lineText);
            if (match) {
                return new vscode.Position(i, match.index);
            }
        }
    }
    return null;
}

function showFullPathInStatusBar(editor) {
    if (!editor || !editor.document) {
        return;
    }
    const position = editor.selection.active;
    const lineText = editor.document.lineAt(position.line).text;
    const fullPath = calculateFullPath(lineText, position, editor.document);
    if (fullPath) {
        statusBarItem.text = `Full Path: ${fullPath}`;
        statusBarItem.show();
    } else {
        statusBarItem.hide();
    }
}

function calculateFullPath(lineText, position, document) {
    let currentLevel = position.line;
    let path = [];
    let currentIndentation = getIndentation(document.lineAt(currentLevel).text);

    // Include the key at the current line
    let currentLineKey = getKeyFromLine(document.lineAt(currentLevel).text);
    if (currentLineKey) {
        path.push(currentLineKey);
    }

    while (currentLevel >= 0) {
        const line = document.lineAt(currentLevel).text;
        const lineIndentation = getIndentation(line);

        if (lineIndentation < currentIndentation) {
            currentIndentation = lineIndentation;

            let keyMatch = getKeyFromLine(line);
            if (keyMatch) {
                path.unshift(keyMatch);
            }
        }

        currentLevel--;
    }

    return path.join('.');
}

// Helper function to determine the indentation level of a line
function getIndentation(lineText) {
    const matches = lineText.match(/^(\s*)/);
    return matches ? matches[1].length : 0;
}

// Helper function to extract a key from a line
function getKeyFromLine(lineText) {
    let keyMatch = lineText.match(/"([^"]+)"\s*:/) || lineText.match(/([\w-]+)\s*:/);
    return keyMatch ? keyMatch[1] : null;
}


function deactivate() {}

module.exports = {
    activate,
    deactivate
};

const vscode = require('vscode');
/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	vscode.window.setStatusBarMessage('Extension activated', 5000);
	
	const cursorPositionDisposable = vscode.window.onDidChangeTextEditorSelection(event => {
		console.log('shan', 'cursor position change is working');
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
					// Select the entire line
					const lineRange = editor.document.lineAt(position.line).range;
					editor.selection = new vscode.Selection(lineRange.start, lineRange.end);
					editor.revealRange(lineRange);
				} else {
					vscode.window.showErrorMessage('Key not found');
				}
			}
		});
	});

    context.subscriptions.push(cursorPositionDisposable);
}

function findKeyPosition(editor, path) {
    const document = editor.document;
    const keys = path.split('.');
    let regexPatterns = keys.map((key, index) => {
        if (index === keys.length - 1) {
            // Match the whole word for the final key, followed by a colon and optional whitespace
            return `\\b${key}\\b\\s*:\\s*`;
        }
        return `\\b${key}\\b\\s*:`;
    });

    let currentLevel = 0;

    for (let i = 0; i < document.lineCount; i++) {
        const lineText = document.lineAt(i).text;

        if (currentLevel < keys.length - 1) {
            const regex = new RegExp(regexPatterns[currentLevel]);
            if (regex.test(lineText)) {
                currentLevel++;
            }
        } else {
            const finalKeyRegex = new RegExp(regexPatterns[currentLevel], 'g');
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
        vscode.window.setStatusBarMessage(`Full Path: ${fullPath}`, 5000); // 5000 ms display time
    }
}

function calculateFullPath(lineText, position, document) {
    let currentLevel = position.line;
    let path = [];

    while (currentLevel >= 0) {
        const line = document.lineAt(currentLevel).text;

        // Match a key in the current line
        let keyMatch = line.match(/"([^"]+)"\s*:/) || line.match(/(\w+)\s*:/);
        if (keyMatch && keyMatch[1]) {
            path.unshift(keyMatch[1]); // Add the found key to the beginning of the path
        }

        // Move to the previous line (upwards)
        currentLevel--;

        // Optional: Add logic to determine when to stop going upwards,
        // such as checking for the start of the object or array.
    }

    // Join the path array to create the full path string
	console.log("Calculated path:", path.join('.'));
    return path.join('.');
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}

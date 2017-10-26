'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { blackDuckLogin } from './blackDuckLogin';


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext): Promise<void> {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    console.log('Congratulations, your extension "blackduck" is now active!');

    vscode.commands.registerCommand('blackDuckExplorer.login', () => blackDuckLogin());
    context.subscriptions.push(vscode.commands.registerCommand('vs-code-blackduck.login', blackDuckLogin));
}

// this method is called when your extension is deactivated
export function deactivate() {
}
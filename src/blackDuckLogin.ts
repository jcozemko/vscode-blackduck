import * as vscode from 'vscode';
import request = require('request-promise');
import tough = require('tough-cookie');
import path = require('path');
import fs = require('fs');
import { findDependencies } from './findDependencies';
import { sep } from 'path';
import { networkInterfaces } from 'os';



export let cookiejar = request.jar();
let _response: Response;

export interface Response {
    response: Object;
}


export let loginObject = {
    huburl: <string> null,
    username: <string> null,
    password: <string> null,
    packageManagerConfig: <string> null
};


export async function blackDuckLogin():  Promise<{ hubUrl: string, username: string, password: string, response: Object }> {
    if (!_response) {
        const hubUrl: string = await vscode.window.showInputBox({ ignoreFocusOut: true, prompt: 'Hub Url' });
        if (hubUrl) {
            const username: string = await vscode.window.showInputBox({ ignoreFocusOut: true, prompt: 'Username' });
            if (username) {
                const password: string = await vscode.window.showInputBox({ ignoreFocusOut: true, prompt: 'Password', password: true });
                if (password) {
                    _response = await login(hubUrl, username, password);
                    if (_response) {
                        const packageManagerConfig: any = await fileExists();
                        if (packageManagerConfig) {
                            await findDependencies(hubUrl, username, password, packageManagerConfig);
                        }

                        loginObject.huburl = hubUrl;
                        loginObject.username = username;
                        loginObject.password = password;
                        loginObject.packageManagerConfig = packageManagerConfig;

                        return { 
                            hubUrl: hubUrl, 
                            username: username, 
                            password: password, 
                            response: <string>_response.response 
                        };
                    }
                }
            }
        }
    }

    return;
}

async function login(hubUrl: string, username: string, password: string) : Promise<Response> {
    let r: Response;

    let options = {
        method: 'POST',
        uri: hubUrl + ':443/j_spring_security_check',
        form: {
            j_username: username,
            j_password: password
        },
        resolveWithFullResponse: true,
        headers: {
            'content-type': 'application/x-www-form-urlencoded'
        },
        jar: cookiejar
    };

    try {
        r = await request(options);
    } catch (error) {
        console.log(error);
        vscode.window.showErrorMessage(error.error.detail);
    }

    return r;
}

async function fileExists() {
    try {
        let files = vscode.workspace.findFiles('*{package-lock.json,setup.py,Gemfile.lock}', '', 3);
        
        return files.then(files => {
            let filePath = files[0].fsPath;
            let fileExtension = files[0].fsPath.slice(files[0].fsPath.lastIndexOf('.'));
            let fileInfoArray = [filePath, fileExtension];
            return fileInfoArray;
        })
    } catch (e) {
        console.log(e);
        return false;
    }
}

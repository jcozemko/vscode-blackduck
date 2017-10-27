import * as vscode from 'vscode';
import request = require('request-promise');
import tough = require('tough-cookie');
import { findDependencies } from './findDependencies';


export let cookiejar = request.jar();
let _response: Response;
export interface Response {
    response: Object;
}

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
                        console.log("Success", _response);
                        await findDependencies(hubUrl, username, password);
                        return { hubUrl: hubUrl, username: username, password: password, response: <string>_response.response };
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
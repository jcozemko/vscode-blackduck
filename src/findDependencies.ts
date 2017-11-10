import * as vscode from 'vscode';
import request = require('request-promise');
import path = require('path');
import fs = require('fs');
import gemfile = require('gemfile');
import { blackDuckLogin } from './blackDuckLogin';
import { cookiejar } from './blackDuckLogin';
import { NodeBase } from './models/nodeBase';
import { RootNode } from './models/rootNode';
import { DependencyNodeProvider } from './dependencyExplorer';

let _dependencies: Dependency;
export let allDependencies = [];


export class Dependency {

    component?: string;
    componentVersion?: string;
    vulnerabilities?: Array<Object>


    constructor(component:string, componentVersion: string, vulnerabilities: Array<Object>) {
        this.component = component;
        this.componentVersion = componentVersion;
        this.vulnerabilities = vulnerabilities;
    }

}


export async function findDependencies(hubUrl: string, username: string, password: string, packageManagerConfiguration: string) : Promise<void> {
    
    let fileToParse;
    let apiLanguageConfig: string;
    let declaredDependencies: any;
    
    switch (packageManagerConfiguration) {
        case 'package-lock.json':
            apiLanguageConfig = "npmjs:";
            fileToParse = require('../package-lock');
            declaredDependencies = fileToParse.dependencies;
            break;
        case 'Gemfile.lock':
            apiLanguageConfig = "rubygems:";
            let GemLockFile = fs.readFileSync(path.join(__dirname, '..', 'Gemfile.lock'), 'utf8');
            let interpretedGemLockFile = gemfile.interpret(GemLockFile);
            console.log(interpretedGemLockFile);
            fileToParse = interpretedGemLockFile;
            declaredDependencies = fileToParse.GEM.specs;
            break;
        case 'setup.py':
            apiLanguageConfig = "pypi:";
            let setupPyFile = fs.readFileSync(path.join(__dirname, '..', 'setup.py'), 'utf8').replace(/\s|'/g,'');
            let requirementsIndex = setupPyFile.indexOf('install_requires=', 0);
            let nextOpeningBracket = setupPyFile.indexOf('[', requirementsIndex);
            let nextClosingBracketIndex = setupPyFile.indexOf(']', requirementsIndex);
            let totalString = setupPyFile.slice(nextOpeningBracket + 1, nextClosingBracketIndex);
            let pythonArray = totalString.replace(/==|>|=|</g,'-').split(',');      
            let pythonDependenciesObj = {}
            
            for (let i = 0; i < pythonArray.length; i++) {
                pythonDependenciesObj[pythonArray[i].slice(0, pythonArray[i].indexOf('-'))] = {version: pythonArray[i].slice(pythonArray[i].lastIndexOf('-') + 1)}
            }
            declaredDependencies = pythonDependenciesObj;
            break;
        default:
            apiLanguageConfig = "";
    }


    if (declaredDependencies) {
        const dependenciesFromFile = declaredDependencies;

        allDependencies = [];

        try {
            let fileDependencies = Object.keys(dependenciesFromFile);
            let size = fileDependencies.length;
            let count = 0;


            const statusBarItem = vscode.window.createStatusBarItem();
            statusBarItem.text = 'Parsing JSON..';
            statusBarItem.show();

            async function parseJson(count, dependenciesFromFile) {
                await Object.keys(dependenciesFromFile).forEach(async dependency => {
                    let dependencyObj = dependenciesFromFile[dependency];
                    let version = dependencyObj.version;
    
                    let foundComponent = await searchForComponent(hubUrl, username, password, dependency, version, apiLanguageConfig);
                    count++;
                    
    
                    if (foundComponent) {
                        await allDependencies.push(
                            foundComponent
                        )
                    }       
                        
                    if (count > size - 1 ) {
                        let dependencyTree = new DependencyNodeProvider();
                        vscode.window.registerTreeDataProvider('blackDuckExplorer', dependencyTree);                                  
                        statusBarItem.text = 'Done parsing.';
                        return allDependencies;
                    } 
                });
            }

            parseJson(count, dependenciesFromFile);

            
        } catch (error) {
            console.log(error);
        }

        return;        
    }

}

/*
Search for component based on name and version from parsed json file
*/

async function searchForComponent(hubUrl: string, username: string, password: string, componentName: string, componentVersion: string, apiLanguageConfig: string) : Promise<Dependency> {

    let versionUrl;
    let d: Dependency;


    let options = {
        method: 'GET',
        uri: hubUrl + ':443/api/components?q=' + apiLanguageConfig + componentName + '/' + componentVersion,
        form: {
            j_username: username,
            j_password: password
        },
        json: true,
        headers: {
            'content-type': 'application/json'
        },
        jar: cookiejar
    };

    try {
        let componentResponse = await request(options);
        let versionUrl = JSON.parse(JSON.stringify(componentResponse.items[0].version));
        let d = await getComponentVulnerabilities(versionUrl, username, password, componentName, componentVersion);
        return d;
    } catch (error) {
        console.log(error);
    }
    return d;

}

/*
Once a component is found, use version url from response
*/

async function getComponentVulnerabilities(versionUrl: string, username: string, password: string, componentName: string, componentVersion: string) : Promise<Dependency> {
    
    let d: Dependency;
    
    let options = {
        method: 'GET',
        uri: versionUrl + '/vulnerabilities',
        form: {
            j_username: username,
            j_password: password
        },
        json: true,
        headers: {
            'content-type': 'application/json'
        },
        jar: cookiejar
    }

    try {
        let vulnerabilityResponse = await request(options);
        let vulnerabilityCount = JSON.parse(JSON.stringify(vulnerabilityResponse.totalCount));
        if (vulnerabilityCount > 0) {

            let vulnerabilities = JSON.parse(JSON.stringify(vulnerabilityResponse));
            let vulnName: string;
            let vulnSource: string;
            let vulnSeverity: string;
            let vulnHubLink: string;

            let vulnerabilitiesArray = [];
            let vulnObj = {
                vulnName,
                vulnSource,
                vulnSeverity,
                vulnHubLink
            };

            for (let i = 0; i < vulnerabilities.items.length; i++) {
                vulnObj.vulnName = vulnerabilities.items[i].vulnerabilityName;
                vulnObj.vulnSource = vulnerabilities.items[i].source;
                vulnObj.vulnSeverity = vulnerabilities.items[i].severity;
                vulnObj.vulnHubLink = vulnerabilities.items[i]._meta.href;
                vulnerabilitiesArray.push(vulnObj);
            }

            let d = new Dependency(componentName, componentVersion, vulnerabilitiesArray);

            return d;
        }
    } catch (error) {
        console.log(error);
    }

    return d;

}


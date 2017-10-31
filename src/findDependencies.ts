import * as vscode from 'vscode';
import request = require('request-promise');
import { blackDuckLogin } from './blackDuckLogin';
import { cookiejar } from './blackDuckLogin';
import { NodeBase } from './models/nodeBase';
import { RootNode } from './models/rootNode';


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


export async function findDependencies(hubUrl: string, username: string, password: string) : Promise<void> {
    const jsonFile = require('../package-lock');
    
    if (jsonFile.dependencies) {
        const dependenciesFromFile = jsonFile.dependencies;


        try {
            let fileDependencies = Object.keys(dependenciesFromFile);
            let size = fileDependencies.length;
            console.log(size);
            let count = 0;

            await Object.keys(dependenciesFromFile).forEach(async dependency => {
                let dependencyObj = dependenciesFromFile[dependency];
                let version = dependencyObj.version;

                let foundComponent = await searchForComponent(hubUrl, username, password, dependency, version);
                count++;
                
                console.log(count);

                if (foundComponent) {
                    await allDependencies.push(
                        foundComponent
                    )
                }

                if (count > size - 1 ) {
                    console.log("All: ", allDependencies);
                    return allDependencies;
                }

            });
            
        } catch (error) {
            console.log(error);
        }

        return;        
    }

}

/*
Search for component based on name and version from parsed json file
*/

async function searchForComponent(hubUrl: string, username: string, password: string, componentName: string, componentVersion: string) : Promise<Dependency> {

    let versionUrl;

    let d: Dependency;

    let options = {
        method: 'GET',
        uri: hubUrl + ':443/api/components?q=npmjs:' + componentName + '/' + componentVersion,
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

            let vulnerabilitiesArray = [];
            let vulnObj = {
                vulnName,
                vulnSource,
                vulnSeverity
            };

            for (let i = 0; i < vulnerabilities.items.length; i++) {
                vulnObj.vulnName = vulnerabilities.items[i].vulnerabilityName;
                vulnObj.vulnSource = vulnerabilities.items[i].source;
                vulnObj.vulnSeverity = vulnerabilities.items[i].severity;
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


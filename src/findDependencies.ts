import * as vscode from 'vscode';
import request = require('request-promise');
import { blackDuckLogin } from './blackDuckLogin';
import { cookiejar } from './blackDuckLogin';

let _dependencies: Dependencies;



export interface Dependencies {
    component?: string,
    componentVersion?: string,
    vulnName?: string,
    vulnSource?: string,
    vulnSeverity?: string,
    vulnLink?: string
}


export interface TotalDependencies extends Array<Dependencies>{}


export async function findDependencies(hubUrl: string, username: string, password: string): Promise <Array<Dependencies>> {
    const jsonFile = require('../package-lock');

    if (jsonFile.dependencies) {
        const dependenciesFromFile = jsonFile.dependencies;
        let dependenciesWithVulns: Dependencies[] = [];    
        let promises = []

        try {
            let fileDependencies = Object.keys(dependenciesFromFile);
            fileDependencies.forEach(async dependency => {
                let dependencyObj = dependenciesFromFile[dependency];
                let version = dependencyObj.version;

                _dependencies = await searchForComponent(hubUrl, username, password, dependency, version, dependenciesWithVulns);
                if (_dependencies) {
                    dependenciesWithVulns.push(
                        _dependencies
                    )
                }
            });
            
        } catch (error) {
            console.log(error);
        }
    }

    return;
}

/*
Search for component based on name and version from parsed json file
*/

async function searchForComponent(hubUrl: string, username: string, password: string, componentName: string, componentVersion: string, dependenciesWithVulns: Array<Dependencies>) : Promise <Dependencies> {

    let versionUrl;

    let d: Dependencies;

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
        d = await getComponentVulnerabilities(versionUrl, username, password, componentName, componentVersion, dependenciesWithVulns);

    } catch (error) {
        console.log(error);
    }
    return d;

}

/*
Once a component is found, use version url from response
*/

async function getComponentVulnerabilities(versionUrl: string, username: string, password: string, componentName: string, componentVersion: string, dependenciesWithVulns: Array<Dependencies>) : Promise <Dependencies> {
    
    let d: Dependencies;


    
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
            let vulnLink: string;

            for (let i = 0; i < vulnerabilities.items.length; i++) {
                vulnName = vulnerabilities.items[i].vulnerabilityName;
                vulnSource = vulnerabilities.items[i].source;
                vulnSeverity = vulnerabilities.items[i].severity;
                vulnLink = vulnerabilities.itema[i]._meta.href;
            }

            let vulnerableComponent = {
                    component: componentName,
                    componentVersion: componentVersion,
                    vulnName: vulnName,
                    vulnSource: vulnSource,
                    vulnSeverity: vulnSeverity,
                    vulnLink: vulnLink
            }
            
            d = vulnerableComponent;
            console.log("Vuln comp: ", d);
            return d;            
        }
    } catch (error) {
        console.log(error);
    }

    //d = totalVulnComponent;

}

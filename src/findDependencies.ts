import * as vscode from 'vscode';
import request = require('request-promise');
import { blackDuckLogin } from './blackDuckLogin';
import { cookiejar } from './blackDuckLogin';

let _dependencies: Dependency;
let allDependencies = [];

let item = [];

export class Dependency {

    component?: string;
    componentVersion?: string;
    vulnName?: string;
    vulnSource?: string;
    vulnSeverity?: string


    constructor(component:string, componentVersion: string, vulnName: string, vulnSource: string, vulnSeverity: string) {

        this.component = component;
        this.componentVersion = componentVersion;
        this.vulnName =  vulnName;
        this.vulnSource = vulnSource;
        this.vulnSeverity = vulnSeverity;
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

            for (let i = 0; i < vulnerabilities.items.length; i++) {
                vulnName = vulnerabilities.items[i].vulnerabilityName;
                vulnSource = vulnerabilities.items[i].source;
                vulnSeverity = vulnerabilities.items[i].severity;
            }

            let d = new Dependency(componentName, componentVersion, vulnName, vulnSource, vulnSeverity);
            return d;
        }
    } catch (error) {
        console.log(error);
    }

    return d;

}


/*
Tree of returned vulnerable dependencies
*/

export async function test(allDependencies: any) {
    console.log("array: ", allDependencies)
}






export class DependencyNodeProvider implements vscode.TreeDataProvider<DependencyItem> {
    
        public _onDidChangeTreeData: vscode.EventEmitter<DependencyItem | undefined> = new vscode.EventEmitter<DependencyItem | undefined>();
        public onDidChangeTreeData: vscode.Event<DependencyItem | undefined> = this._onDidChangeTreeData.event;
        
    
    
        refresh(): void {
            this._onDidChangeTreeData.fire();
        }

        getTreeItem(element: DependencyItem): vscode.TreeItem {
            return element;
        }
    
        getChildren(element?: DependencyItem): Thenable<DependencyItem[]> {
            return new Promise(resolve => {
                if (!element) {

                    let vulns = allDependencies.map(vuln => new DependencyItem(vuln.component + " " + vuln.componentVersion, vscode.TreeItemCollapsibleState.Collapsed, {
                        title: vuln.component + vuln.componentVersion,
                        command:''
                    }));
          
                    console.log("vulns: ", vulns);
                    resolve(vulns);
                } else {
                  resolve([]);
                }
              });
            }

}


export class DependencyItem extends vscode.TreeItem {
    
        constructor(
            public readonly label: string,
            public readonly collapsibleState: vscode.TreeItemCollapsibleState,
            public readonly command?: vscode.Command
        ) {
            super(label, collapsibleState);
        }
    
}


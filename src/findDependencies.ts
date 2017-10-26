import * as vscode from 'vscode';
import request = require('request-promise');


export interface Dependencies {
    component?: string,
    componentVersion?: string
}


export async function findDependencies(): Promise<Array<Dependencies>> {
    const jsonFile = require('../package-lock');

    if (jsonFile.dependencies) {
        const dependenciesFromFile = jsonFile.dependencies;
        let dependenciesWithVulns: Dependencies[] = [];        

        try {
            Object.keys(dependenciesFromFile).forEach(dependency => {
                let dependencyObj = dependenciesFromFile[dependency];
                let version = dependencyObj.version;
                dependenciesWithVulns.push(
                    {
                        component: dependency,
                        componentVersion: version
                    }
                )
           });     
           console.log(dependenciesWithVulns);
           return dependenciesWithVulns;
        } catch (error) {
            console.log(error);
        }
    }

    return;
}


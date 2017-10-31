import * as vscode from 'vscode';
import request = require('request-promise');
import { blackDuckLogin } from './blackDuckLogin';
import { cookiejar } from './blackDuckLogin';

let _dependencies: Dependency;
let allDependencies = [];


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


/*
Tree of returned vulnerable dependencies
*/


export class DependencyNodeProvider implements vscode.TreeDataProvider<NodeBase> {
        
    private _onDidChangeTreeData: vscode.EventEmitter<NodeBase> = new vscode.EventEmitter<NodeBase>();
    readonly onDidChangeTreeData: vscode.Event<NodeBase> = this._onDidChangeTreeData.event;

    private _componentsNode: RootNode;
    
    refresh(): void {
        this._onDidChangeTreeData.fire(this._componentsNode);
    }

    getTreeItem(element: NodeBase): vscode.TreeItem {            
        return element.getTreeItem();
    }
    
    async getChildren(element?: NodeBase): Promise<NodeBase[]> {
        if (!element) {
            return this.getRootNodes();
        }
        return element.getChildren(element);
    }

    private async getRootNodes(): Promise<RootNode[]> {
        const rootNodes: RootNode[] = [];
        let node: RootNode;

        node = new RootNode('Vulnerable Components', 'componentRootNode', this._onDidChangeTreeData);
        this._componentsNode = node;

        rootNodes.push(node);

        return rootNodes;
    }

}

export class NodeBase {
    readonly label: string;

    protected constructor(label: string) {
        this.label = label;
    }

    getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.None
        };
    }

    async getChildren(element): Promise<NodeBase[]> {
        return []
    }

}


export class RootNode extends NodeBase {

    private _componentNode: RootNode;

    constructor (
        public readonly label: string,
        public readonly contextValue: string,
        public eventEmitter: vscode.EventEmitter<NodeBase>
    ) {
        super(label)
    }

    getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: this.contextValue
        }
    }

    async getChildren(element): Promise<NodeBase[]> {
        if (element.contextValue === 'componentRootNode') {
            return this.getComponents();
        }
    }

    private async getComponents(): Promise<ComponentNode[]> {

        const componentNodes: ComponentNode[] = [];

        for (let i = 0; i < allDependencies.length; i++) {
            let node = new ComponentNode(allDependencies[i].component + " " + allDependencies[i].componentVersion , "componentRootNode", this.eventEmitter, allDependencies[i].component);
            componentNodes.push(node);
        }

        return componentNodes;
    }

}

export class ComponentNode extends NodeBase {

    constructor(
        public readonly label: string,
        public readonly contextValue: string,
        public readonly eventEmitter: vscode.EventEmitter<NodeBase>,
        public readonly component: string
    ) {
        super(label)
    }



    getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: "componentRootNode"
        }
    }

    async getChildren(element: ComponentNode): Promise<VulnerabilityNode[]> {
        const vulnerabilityNodes: VulnerabilityNode[] = [];
        let node: VulnerabilityNode;

        for (let i = 0; i < allDependencies.length; i++) {
            if (this.component == allDependencies[i].component) {
                for (let j = 0; j < allDependencies[i].vulnerabilities.length; j++) {
                    console.log(allDependencies[i].vulnerabilities[j].vulnName)
                    let node = new VulnerabilityNode(allDependencies[i].vulnerabilities[j].vulnName, "vulnNode");
                    vulnerabilityNodes.push(node);               
                }
            }

            console.log(vulnerabilityNodes);
            //vulnerabilityNodes.push(node);
        }

        return vulnerabilityNodes;
    }


}

export class VulnerabilityNode extends NodeBase {
    constructor(
        public readonly label: string,
        public readonly contextValue: string
    ) {
        super(label);
    }

    getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            contextValue: this.contextValue
        }
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

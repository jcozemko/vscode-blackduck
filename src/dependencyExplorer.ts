import * as vscode from 'vscode';
import { NodeBase } from './models/nodeBase';
import { RootNode } from './models/rootNode';
import { blackDuckLogin } from './blackDuckLogin';
import { findDependencies } from './findDependencies';
import { loginObject } from './blackDuckLogin';

export class DependencyNodeProvider implements vscode.TreeDataProvider<NodeBase> {
    
private _onDidChangeTreeData: vscode.EventEmitter<NodeBase> = new vscode.EventEmitter<NodeBase>();
readonly onDidChangeTreeData: vscode.Event<NodeBase> = this._onDidChangeTreeData.event;

private _componentNode: RootNode;
private _vulnerabilityNode: RootNode;

async refresh(): Promise<void> {
    findDependencies(loginObject.huburl, loginObject.username, loginObject.password);    
    await this._onDidChangeTreeData.fire(this._componentNode);
    await this._onDidChangeTreeData.fire(this._vulnerabilityNode);
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
    this._componentNode = node;

    rootNodes.push(node);

    return rootNodes;
}

}
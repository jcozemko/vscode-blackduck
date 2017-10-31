import * as vscode from 'vscode';
import { NodeBase } from './models/nodeBase';
import { RootNode } from './models/rootNode';

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
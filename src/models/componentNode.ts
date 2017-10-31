import * as vscode from 'vscode';
import { NodeBase } from './nodeBase';
import { VulnerabilityNode } from './vulnerabilityNode';
import { allDependencies } from '../findDependencies';


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
    
            }
    
            return vulnerabilityNodes;
        }
    
    
    }
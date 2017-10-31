import * as vscode from 'vscode';
import * as path from 'path';
import { NodeBase } from './nodeBase';
import { allDependencies } from '../findDependencies';
import { ComponentNode } from './componentNode';

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
                contextValue: this.contextValue,
                iconPath: path.join(__filename, '..', '..', '..', 'images', 'light', 'component.svg' )
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
            console.log(componentNodes);
            return componentNodes;
        }
    
    }
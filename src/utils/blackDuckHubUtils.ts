import * as vscode from 'vscode';
import * as path from 'path';
import * as opn from 'opn';
import { NodeBase } from '../models/nodeBase';
import { VulnerabilityNode } from '../models/vulnerabilityNode';
import { allDependencies } from '../findDependencies';


export function browseVulnInHub(hubContext: VulnerabilityNode) {

    if (hubContext) {
        let url: any = hubContext.hubVulnUrl;
        opn(url);
    }
}



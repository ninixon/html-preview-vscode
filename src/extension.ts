"use strict";
import { window, ExtensionContext, commands, Uri,
    ViewColumn, TextDocument, TextEditor } from "vscode";
import * as uuid from "node-uuid";
import { HtmlDocumentView } from "./document";

export enum SourceType {
    SCRIPT,
    STYLE
}
let viewManager: ViewManager;
export function activate(context: ExtensionContext) {
    viewManager = new ViewManager();

    context.subscriptions.push(
        commands.registerTextEditorCommand("html.previewToSide", (textEditor: TextEditor) => {
            viewManager.previewToSide(textEditor);
        }),
        commands.registerTextEditorCommand("html.preview", (textEditor: TextEditor) => {
            viewManager.preview(textEditor);
        })
    );
}

export function deactivate() {
    viewManager.dispose();
}

class ViewManager {
    private idMap: IDMap = new IDMap();
    private fileMap: Map<string, HtmlDocumentView> = new Map();

    private sendHTMLCommand(displayColumn: ViewColumn, doc: TextDocument, toggle: boolean = false) {
        let id: string;
        let htmlDoc: HtmlDocumentView;
        if (!this.idMap.hasUri(doc.uri)) {
            htmlDoc = new HtmlDocumentView(doc);
            id = this.idMap.add(doc.uri, htmlDoc.uri);
            this.fileMap.set(id, htmlDoc);
        } else {
            id = this.idMap.getByUri(doc.uri);
            htmlDoc = this.fileMap.get(id);
        }
        if (toggle || htmlDoc.uri === doc.uri) {
            htmlDoc.executeToggle(displayColumn);
        } else {
            htmlDoc.executeSide(displayColumn);
        }
    }

    public previewToSide(textEditor: TextEditor) {
        let displayColumn: ViewColumn;
        switch (textEditor.viewColumn) {
            case ViewColumn.One:
                displayColumn = ViewColumn.Two;
                break;
            case ViewColumn.Two:
            case ViewColumn.Three:
                displayColumn = ViewColumn.Three;
                break;
        }
        this.sendHTMLCommand(displayColumn,
            window.activeTextEditor.document);
    }

    public preview(textEditor: TextEditor) {
        this.sendHTMLCommand(textEditor.viewColumn,
            window.activeTextEditor.document, true);
    }
    
    public dispose() {
        let values = this.fileMap.values()
        let value: IteratorResult<HtmlDocumentView> = values.next();
        while (!value.done) {
            value.value.dispose();
            value = values.next();
        }
    }
}

class IDMap {
    private map: Map<[Uri, Uri], string> = new Map();

    public getByUri(uri: Uri) {
        let keys = this.map.keys()
        let key: IteratorResult<[Uri, Uri]> = keys.next();
        while (!key.done) {
            if (key.value.indexOf(uri) > -1) {
                return this.map.get(key.value);
            }
            key = keys.next();
        }
        return null;
    }

    public hasUri(uri: Uri) {
        return this.getByUri(uri) !== null;
    }

    public add(uri1: Uri, uri2: Uri) {
        let id = uuid.v4();
        this.map.set([uri1, uri2], id);
        return id;
    }
}

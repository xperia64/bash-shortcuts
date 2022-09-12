import { ServerAPI, ServerResponse } from "decky-frontend-lib";
import { Shortcut } from "./Shortcut";

type ShortcutsDictionary = {
    [key:string]: Shortcut
}
  
interface setShortcutsMethodArgs {
    shortcutsDict: ShortcutsDictionary
}

export class PyInterop {
    private static serverAPI:ServerAPI;

    static setServer(serv:ServerAPI) {
        this.serverAPI = serv;
    }

    static async getShortcuts(): Promise<ServerResponse<ShortcutsDictionary>> {
        return await this.serverAPI.callPluginMethod<{}, ShortcutsDictionary>("setShortcuts", {})
    }

    static async setShortcuts(data:ShortcutsDictionary): Promise<ServerResponse<ShortcutsDictionary>> {
        return await this.serverAPI.callPluginMethod<setShortcutsMethodArgs, ShortcutsDictionary>("setShortcuts", { shortcutsDict: data });
    }
}